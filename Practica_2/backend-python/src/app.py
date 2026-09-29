from datetime import datetime, timedelta, timezone
from functools import wraps
import logging
import re
import uuid

import bcrypt
import jwt
import mysql.connector
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from src.config import Config
from src.database import db
from src.s3_storage import upload_profile_photo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _error(message, status):
    return jsonify({"error": message}), status


def _json_date(value):
    return value.isoformat() if value else None


def _user_response(row):
    return {
        "id": row["id"],
        "username": row["username"],
        "correo": row["correo"],
        "fotoPerfilUrl": row.get("foto_perfil_url"),
        "fechaRegistro": _json_date(row.get("fecha_registro")),
    }


def _task_response(row):
    return {
        "id": row["id"],
        "titulo": row["titulo"],
        "descripcion": row.get("descripcion"),
        "completada": bool(row["completada"]),
        "fechaCreacion": _json_date(row.get("fecha_creacion")),
    }


def _file_response(row):
    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "tipo": row["tipo"],
        "url": row["url"],
        "proveedor": row["proveedor"],
        "fechaCarga": _json_date(row.get("fecha_carga")),
    }


def _token_for(user):
    if not Config.JWT_SECRET:
        raise RuntimeError("JWT_SECRET no está configurado")
    expires_at = datetime.now(timezone.utc) + timedelta(hours=Config.JWT_TTL_HOURS)
    return jwt.encode(
        {"sub": str(user["id"]), "exp": expires_at},
        Config.JWT_SECRET,
        algorithm="HS256",
    )


def _require_auth(handler):
    @wraps(handler)
    def wrapped(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return _error("Se requiere un token Bearer", 401)
        try:
            claims = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            g.user_id = int(claims["sub"])
        except (jwt.PyJWTError, KeyError, TypeError, ValueError):
            return _error("Token inválido o expirado", 401)
        return handler(*args, **kwargs)

    return wrapped


def create_app():
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_FILE_SIZE_BYTES + 1024 * 1024
    CORS(app, origins=Config.CORS_ORIGINS)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "server": "python", "cloud": Config.CLOUD})

    @app.post("/auth/register")
    def register():
        username = (request.form.get("username") or "").strip()
        correo = (request.form.get("correo") or "").strip().lower()
        password = request.form.get("password") or ""
        confirmation = request.form.get("confirmPassword") or ""
        photo = request.files.get("fotoPerfil")

        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,50}", username):
            return _error("El usuario debe tener entre 3 y 50 caracteres válidos", 400)
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", correo):
            return _error("El correo electrónico no es válido", 400)
        if len(password) < 8:
            return _error("La contraseña debe tener al menos 8 caracteres", 400)
        if password != confirmation:
            return _error("Las contraseñas no coinciden", 400)
        if not photo or not photo.filename:
            return _error("La imagen de perfil es obligatoria", 400)
        if not (photo.mimetype or "").lower().startswith("image/"):
            return _error("La foto de perfil debe ser una imagen", 415)
        photo_data = photo.read(Config.MAX_FILE_SIZE_BYTES + 1)
        if len(photo_data) > Config.MAX_FILE_SIZE_BYTES:
            return _error("La imagen excede el tamaño máximo permitido", 413)
        photo.seek(0)
        extension = photo.filename.rsplit(".", 1)[-1].lower()
        if not re.fullmatch(r"[a-z0-9]{1,8}", extension):
            return _error("La extensión de la imagen no es válida", 400)

        try:
            if db.execute(
                "SELECT id FROM usuarios WHERE username = %s", (username,), fetch_one=True
            ):
                return _error("El nombre de usuario ya está registrado", 409)

            object_key = f"{uuid.uuid4().hex}.{extension}"
            photo_url = upload_profile_photo(photo, object_key)
            password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            result = db.execute(
                """INSERT INTO usuarios
                   (username, correo, password_hash, foto_perfil_url)
                   VALUES (%s, %s, %s, %s)""",
                (username, correo, password_hash, photo_url),
            )
            user = db.execute(
                """SELECT id, username, correo, foto_perfil_url, fecha_registro
                   FROM usuarios WHERE id = %s""",
                (result["lastrowid"],),
                fetch_one=True,
            )
            return jsonify({"usuario": _user_response(user)}), 201
        except mysql.connector.IntegrityError as error:
            if error.errno == 1062:
                return _error("El nombre de usuario o correo ya está registrado", 409)
            logger.exception("No se pudo registrar el usuario")
            return _error("No se pudo completar el registro", 500)
        except Exception:
            logger.exception("No se pudo registrar el usuario")
            return _error("No se pudo completar el registro", 500)

    @app.post("/auth/login")
    def login():
        payload = request.get_json(silent=True) or {}
        username = (payload.get("username") or "").strip()
        password = payload.get("password") or ""
        if not username or not password:
            return _error("Usuario y contraseña son requeridos", 400)
        try:
            user = db.execute(
                """SELECT id, username, correo, password_hash, foto_perfil_url, fecha_registro
                   FROM usuarios WHERE username = %s""",
                (username,),
                fetch_one=True,
            )
            if not user or not bcrypt.checkpw(
                password.encode(), user["password_hash"].encode()
            ):
                return _error("Usuario o contraseña incorrectos", 401)
            return jsonify({"usuario": _user_response(user), "token": _token_for(user)})
        except Exception:
            logger.exception("No se pudo iniciar sesión")
            return _error("No se pudo iniciar sesión", 500)

    @app.get("/tasks")
    @_require_auth
    def list_tasks():
        rows = db.execute(
            """SELECT id, titulo, descripcion, completada, fecha_creacion
               FROM tareas WHERE usuario_id = %s
               ORDER BY fecha_creacion DESC, id DESC""",
            (g.user_id,),
            fetch_all=True,
        )
        return jsonify([_task_response(row) for row in rows])

    @app.post("/tasks")
    @_require_auth
    def create_task():
        payload = request.get_json(silent=True) or {}
        title = (payload.get("titulo") or "").strip()
        if not title:
            return _error("El título de la tarea es obligatorio", 400)
        if len(title) > 150:
            return _error("El título no puede exceder 150 caracteres", 400)
        description = payload.get("descripcion") or None
        created_at = payload.get("fechaCreacion")
        if created_at:
            if not isinstance(created_at, str):
                return _error("fechaCreacion debe ser una fecha ISO-8601", 400)
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if created_at.tzinfo:
                    created_at = created_at.astimezone(timezone.utc).replace(tzinfo=None)
            except ValueError:
                return _error("fechaCreacion debe ser una fecha ISO-8601", 400)
            result = db.execute(
                """INSERT INTO tareas (usuario_id, titulo, descripcion, fecha_creacion)
                   VALUES (%s, %s, %s, %s)""",
                (g.user_id, title, description, created_at),
            )
        else:
            result = db.execute(
                "INSERT INTO tareas (usuario_id, titulo, descripcion) VALUES (%s, %s, %s)",
                (g.user_id, title, description),
            )
        row = db.execute(
            """SELECT id, titulo, descripcion, completada, fecha_creacion
               FROM tareas WHERE id = %s AND usuario_id = %s""",
            (result["lastrowid"], g.user_id),
            fetch_one=True,
        )
        return jsonify({"tarea": _task_response(row)}), 201

    @app.put("/tasks/<int:task_id>")
    @_require_auth
    def update_task(task_id):
        payload = request.get_json(silent=True) or {}
        title = (payload.get("titulo") or "").strip()
        if not title:
            return _error("El título de la tarea es obligatorio", 400)
        if len(title) > 150:
            return _error("El título no puede exceder 150 caracteres", 400)
        owned = db.execute(
            "SELECT id FROM tareas WHERE id = %s AND usuario_id = %s",
            (task_id, g.user_id),
            fetch_one=True,
        )
        if not owned:
            exists = db.execute(
                "SELECT id FROM tareas WHERE id = %s", (task_id,), fetch_one=True
            )
            message = "La tarea pertenece a otro usuario" if exists else "Tarea no encontrada"
            return _error(message, 403 if exists else 404)
        db.execute(
            "UPDATE tareas SET titulo = %s, descripcion = %s WHERE id = %s",
            (title, payload.get("descripcion") or None, task_id),
        )
        row = db.execute(
            """SELECT id, titulo, descripcion, completada, fecha_creacion
               FROM tareas WHERE id = %s""",
            (task_id,),
            fetch_one=True,
        )
        return jsonify({"tarea": _task_response(row)})

    @app.patch("/tasks/<int:task_id>/estado")
    @_require_auth
    def update_task_status(task_id):
        payload = request.get_json(silent=True) or {}
        completed = payload.get("completada")
        if not isinstance(completed, bool):
            return _error("completada debe ser booleano", 400)
        owned = db.execute(
            "SELECT id FROM tareas WHERE id = %s AND usuario_id = %s",
            (task_id, g.user_id),
            fetch_one=True,
        )
        if not owned:
            exists = db.execute(
                "SELECT id FROM tareas WHERE id = %s", (task_id,), fetch_one=True
            )
            message = "La tarea pertenece a otro usuario" if exists else "Tarea no encontrada"
            return _error(message, 403 if exists else 404)
        db.execute(
            "UPDATE tareas SET completada = %s WHERE id = %s", (completed, task_id)
        )
        row = db.execute(
            """SELECT id, titulo, descripcion, completada, fecha_creacion
               FROM tareas WHERE id = %s""",
            (task_id,),
            fetch_one=True,
        )
        return jsonify({"tarea": _task_response(row)})

    @app.delete("/tasks/<int:task_id>")
    @_require_auth
    def delete_task(task_id):
        result = db.execute(
            "DELETE FROM tareas WHERE id = %s AND usuario_id = %s",
            (task_id, g.user_id),
        )
        if result["rowcount"] == 0:
            exists = db.execute(
                "SELECT id FROM tareas WHERE id = %s", (task_id,), fetch_one=True
            )
            message = "La tarea pertenece a otro usuario" if exists else "Tarea no encontrada"
            return _error(message, 403 if exists else 404)
        return "", 204

    @app.get("/files")
    @_require_auth
    def list_files():
        rows = db.execute(
            """SELECT id, nombre, tipo, url, proveedor, fecha_carga
               FROM archivos WHERE usuario_id = %s
               ORDER BY fecha_carga DESC, id DESC""",
            (g.user_id,),
            fetch_all=True,
        )
        return jsonify([_file_response(row) for row in rows])

    @app.post("/files")
    @_require_auth
    def create_file_record():
        payload = request.get_json(silent=True) or {}
        name = (payload.get("nombre") or "").strip()
        file_type = payload.get("tipo")
        url = (payload.get("url") or "").strip()
        provider = payload.get("proveedor")
        size = payload.get("tamanoBytes")
        if (
            not name
            or len(name) > 255
            or not url.startswith("https://")
            or len(url) > 500
        ):
            return _error("nombre y url son requeridos y deben tener longitud válida", 400)
        if file_type not in ("IMAGEN", "TEXTO"):
            return _error("tipo debe ser IMAGEN o TEXTO", 400)
        if provider not in ("AWS", "AZURE"):
            return _error("proveedor debe ser AWS o AZURE", 400)
        if not isinstance(size, int) or isinstance(size, bool) or size < 0:
            return _error("tamanoBytes debe ser un entero no negativo", 400)
        result = db.execute(
            """INSERT INTO archivos
               (usuario_id, nombre, tipo, url, proveedor, tamano_bytes)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (g.user_id, name, file_type, url, provider, size),
        )
        row = db.execute(
            """SELECT id, nombre, tipo, url, proveedor, fecha_carga
               FROM archivos WHERE id = %s AND usuario_id = %s""",
            (result["lastrowid"], g.user_id),
            fetch_one=True,
        )
        return jsonify({"archivo": _file_response(row)}), 201

    @app.get("/files/<int:file_id>")
    @_require_auth
    def get_file(file_id):
        row = db.execute(
            """SELECT id, nombre, tipo, url, proveedor, fecha_carga
               FROM archivos WHERE id = %s AND usuario_id = %s""",
            (file_id, g.user_id),
            fetch_one=True,
        )
        if not row:
            return _error("Archivo no encontrado", 404)
        return jsonify({"archivo": _file_response(row)})

    @app.errorhandler(413)
    def request_too_large(_error_value):
        return _error("La solicitud excede el tamaño máximo permitido", 413)

    @app.errorhandler(Exception)
    def unexpected_error(error):
        if isinstance(error, HTTPException):
            return _error(error.description, error.code or 500)
        logger.exception("Error no controlado en la API", exc_info=error)
        return _error("Error interno del servidor", 500)

    return app


app = create_app()