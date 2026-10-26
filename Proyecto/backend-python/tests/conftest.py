import os
import re
from pathlib import Path

import mysql.connector
import mysql.connector.pooling
import pytest

SEED = Path(__file__).resolve().parents[2] / "database" / "seed.sql"

CONEXION_DB = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "database": os.getenv("DB_NAME", "semisocial"),
    "time_zone": "+00:00",
    "autocommit": True,
}


def _sentencias(sql):
    sin_comentarios = "\n".join(
        linea for linea in sql.splitlines() if not linea.strip().startswith("--")
    )
    return [s.strip() for s in re.split(r";\s*\n", sin_comentarios) if s.strip()]


@pytest.fixture(scope="session")
def pool():
    return mysql.connector.pooling.MySQLConnectionPool(pool_size=5, **CONEXION_DB)


@pytest.fixture
def cargar_seed():
    conexion = mysql.connector.connect(**CONEXION_DB)
    cursor = conexion.cursor()
    for sentencia in _sentencias(SEED.read_text(encoding="utf-8")):
        cursor.execute(sentencia)
        if cursor.with_rows:
            cursor.fetchall()
    conexion.close()


def como(usuario_id):
    return {"x-test-usuario": str(usuario_id)}


def app_de_prueba(*blueprints):
    from flask import Flask, g, request

    app = Flask(__name__)

    @app.before_request
    def usuario_de_prueba():
        usuario_id = request.headers.get("x-test-usuario")
        if usuario_id:
            g.usuario = {"id": int(usuario_id)}

    for blueprint in blueprints:
        app.register_blueprint(blueprint)
    return app.test_client()
