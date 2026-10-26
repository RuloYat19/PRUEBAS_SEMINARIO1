"""Pruebas del dominio publicaciones contra el MySQL local de Docker
(Proyecto/database/docker-compose.yml). Rekognition va simulado.

Son los mismos casos y los mismos JSON esperados que
backend-node/tests/publicaciones.test.js: si una pasa en un lenguaje y
falla en el otro, los dos backends ya no responden igual.

    docker compose -f Proyecto/database/docker-compose.yml up -d
    python -m pytest tests
"""

import os
import re
from pathlib import Path

import mysql.connector
import mysql.connector.pooling
import pytest
from botocore.exceptions import ClientError
from flask import Flask, g, request

from src.publicaciones.repository import PublicacionesRepository
from src.publicaciones.routes import create_publicaciones_blueprint
from src.publicaciones.service import PublicacionesService

SEED = Path(__file__).resolve().parents[2] / "database" / "seed.sql"
S3_PUBLIC_URL = "https://semi1proyecto-g8-2s2026.s3.amazonaws.com"

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


class EtiquetadorFalso:
    def __init__(self):
        self.llamadas = []
        self.error = None

    def detectar_etiquetas(self, key):
        self.llamadas.append(key)
        if self.error:
            raise self.error
        return [{"nombre": "Cat", "confianza": 98.5}, {"nombre": "Pet", "confianza": 97.12}]


def _error_aws(codigo):
    return ClientError({"Error": {"Code": codigo, "Message": codigo}}, "DetectLabels")


@pytest.fixture(scope="session")
def pool():
    return mysql.connector.pooling.MySQLConnectionPool(pool_size=5, **CONEXION_DB)


@pytest.fixture(autouse=True)
def cargar_seed():
    conexion = mysql.connector.connect(**CONEXION_DB)
    cursor = conexion.cursor()
    for sentencia in _sentencias(SEED.read_text(encoding="utf-8")):
        cursor.execute(sentencia)
        if cursor.with_rows:
            cursor.fetchall()
    conexion.close()


@pytest.fixture
def etiquetador():
    return EtiquetadorFalso()


@pytest.fixture
def client(pool, etiquetador):
    app = Flask(__name__)

    # Sustituye al middleware de Cognito: el id del usuario viene en un header.
    @app.before_request
    def usuario_de_prueba():
        usuario_id = request.headers.get("x-test-usuario")
        if usuario_id:
            g.usuario = {"id": int(usuario_id)}

    service = PublicacionesService(
        repository=PublicacionesRepository(pool.get_connection),
        etiquetador=etiquetador,
        s3_public_url=S3_PUBLIC_URL,
    )
    app.register_blueprint(create_publicaciones_blueprint(service))
    return app.test_client()


def como(usuario_id):
    return {"x-test-usuario": str(usuario_id)}


def contar(pool, sql):
    conexion = pool.get_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute(sql)
        return cursor.fetchone()[0]
    finally:
        conexion.close()


# --- GET /publicaciones (feed) -----------------------------------------


def test_feed_propias_y_de_amigos_mas_recientes_primero(client):
    res = client.get("/publicaciones", headers=como(1))

    assert res.status_code == 200
    assert [p["id"] for p in res.json["publicaciones"]] == [6, 5, 3, 2, 1]


def test_feed_no_incluye_a_quien_no_es_amigo(client):
    res = client.get("/publicaciones", headers=como(1))

    assert not any(p["autor"]["id"] == 5 for p in res.json["publicaciones"])


def test_feed_forma_exacta_del_contrato(client):
    res = client.get("/publicaciones", headers=como(1))

    assert res.json["publicaciones"][1] == {
        "id": 5,
        "descripcion": "Estudiando para Seminario",
        "imagenUrl": f"{S3_PUBLIC_URL}/Fotos_Publicadas/seed-05.jpg",
        "fechaPublicacion": "2026-10-21T08:00:00Z",
        "autor": {
            "id": 1,
            "nombreCompleto": "Valery Alarcón",
            "fotoPerfilUrl": f"{S3_PUBLIC_URL}/Fotos_Perfil/seed-valery.jpg",
        },
        "etiquetas": [
            {"nombre": "Computer", "confianza": 96},
            {"nombre": "Book", "confianza": 90.25},
            {"nombre": "Person", "confianza": 82.6},
        ],
        "totalComentarios": 1,
    }


def test_feed_filtra_por_etiqueta_sin_distinguir_mayusculas(client):
    res = client.get("/publicaciones?etiqueta=person", headers=como(1))

    assert res.status_code == 200
    assert [p["id"] for p in res.json["publicaciones"]] == [5, 3, 2]


def test_feed_etiqueta_vacia_equivale_a_todos(client):
    res = client.get("/publicaciones?etiqueta=", headers=como(1))

    assert len(res.json["publicaciones"]) == 5


def test_feed_401_sin_usuario(client):
    res = client.get("/publicaciones")

    assert res.status_code == 401
    assert res.json == {"error": "No autenticado"}


# --- GET /publicaciones/etiquetas --------------------------------------


def test_etiquetas_del_feed_con_su_total(client):
    res = client.get("/publicaciones/etiquetas", headers=como(1))

    assert res.status_code == 200
    assert res.json["etiquetas"][0] == {"nombre": "Person", "total": 3}
    assert not any(e["nombre"] == "Mountain" for e in res.json["etiquetas"])


def test_etiquetas_busca_por_texto(client):
    res = client.get("/publicaciones/etiquetas?buscar=PE", headers=como(1))

    assert res.json["etiquetas"] == [
        {"nombre": "Person", "total": 3},
        {"nombre": "Pet", "total": 1},
    ]


def test_etiquetas_porcentaje_no_es_comodin(client):
    res = client.get("/publicaciones/etiquetas?buscar=%25", headers=como(1))

    assert res.json["etiquetas"] == []


# --- GET /publicaciones/:id --------------------------------------------


def test_buscar_publicacion_de_un_amigo(client):
    res = client.get("/publicaciones/2", headers=como(1))

    assert res.status_code == 200
    assert res.json["publicacion"]["id"] == 2


def test_buscar_404_si_no_es_visible(client):
    res = client.get("/publicaciones/4", headers=como(1))

    assert res.status_code == 404
    assert res.json == {"error": "Publicación no encontrada"}


def test_buscar_400_si_id_no_es_entero_positivo(client):
    res = client.get("/publicaciones/abc", headers=como(1))

    assert res.status_code == 400


# --- POST /publicaciones -----------------------------------------------


def test_crear_con_etiquetas_de_rekognition(client, etiquetador):
    res = client.post(
        "/publicaciones",
        headers=como(1),
        json={"imagenKey": "Fotos_Publicadas/abc-123.jpg", "descripcion": "  Mi gato  "},
    )

    assert res.status_code == 201
    assert etiquetador.llamadas == ["Fotos_Publicadas/abc-123.jpg"]
    publicacion = res.json["publicacion"]
    assert publicacion["id"] == 7
    assert publicacion["descripcion"] == "Mi gato"
    assert publicacion["imagenUrl"] == f"{S3_PUBLIC_URL}/Fotos_Publicadas/abc-123.jpg"
    assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", publicacion["fechaPublicacion"])
    assert publicacion["etiquetas"] == [
        {"nombre": "Cat", "confianza": 98.5},
        {"nombre": "Pet", "confianza": 97.12},
    ]


def test_crear_reutiliza_etiquetas_existentes(client, pool):
    client.post("/publicaciones", headers=como(1), json={"imagenKey": "Fotos_Publicadas/abc-123.png"})

    assert contar(pool, "SELECT COUNT(*) FROM etiqueta WHERE nombre = 'Pet'") == 1


def test_crear_descripcion_vacia_es_null(client):
    res = client.post(
        "/publicaciones",
        headers=como(1),
        json={"imagenKey": "Fotos_Publicadas/abc.jpeg", "descripcion": "   "},
    )

    assert res.json["publicacion"]["descripcion"] is None


def test_crear_rechaza_key_fuera_de_fotos_publicadas(client, etiquetador):
    res = client.post("/publicaciones", headers=como(1), json={"imagenKey": "Fotos_Perfil/abc.jpg"})

    assert res.status_code == 400
    assert etiquetador.llamadas == []


def test_crear_rechaza_descripcion_de_mas_de_1000(client):
    res = client.post(
        "/publicaciones",
        headers=como(1),
        json={"imagenKey": "Fotos_Publicadas/abc.jpg", "descripcion": "x" * 1001},
    )

    assert res.status_code == 400


def test_crear_rechaza_cuerpo_que_no_es_objeto(client):
    res = client.post("/publicaciones", headers=como(1), json=[1, 2])

    assert res.status_code == 400
    assert res.json == {"error": "El cuerpo debe ser un objeto JSON"}


def test_crear_400_si_falta_imagen_key(client):
    res = client.post("/publicaciones", headers=como(1), json={})

    assert res.status_code == 400
    assert res.json == {"error": "imagenKey es obligatorio"}


def test_crear_400_si_rekognition_no_encuentra_la_imagen(client, etiquetador):
    etiquetador.error = _error_aws("InvalidS3ObjectException")
    res = client.post(
        "/publicaciones", headers=como(1), json={"imagenKey": "Fotos_Publicadas/no-existe.jpg"}
    )

    assert res.status_code == 400
    assert res.json == {"error": "La imagen no existe en S3 o no es válida"}


def test_crear_502_y_no_crea_nada_si_rekognition_falla(client, etiquetador, pool):
    etiquetador.error = _error_aws("InternalServerError")
    res = client.post("/publicaciones", headers=como(1), json={"imagenKey": "Fotos_Publicadas/abc.jpg"})

    assert res.status_code == 502
    assert contar(pool, "SELECT COUNT(*) FROM publicacion") == 6
