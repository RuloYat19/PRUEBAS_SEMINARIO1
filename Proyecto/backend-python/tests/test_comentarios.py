import re

import pytest

from src.comentarios.repository import ComentariosRepository
from src.comentarios.routes import create_comentarios_blueprint
from src.comentarios.service import ComentariosService
from src.publicaciones.repository import PublicacionesRepository
from tests.conftest import app_de_prueba, como

pytestmark = pytest.mark.usefixtures("cargar_seed")

FECHA_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


@pytest.fixture
def client(pool):
    service = ComentariosService(
        repository=ComentariosRepository(pool.get_connection),
        publicaciones=PublicacionesRepository(pool.get_connection),
    )
    return app_de_prueba(create_comentarios_blueprint(service))


def contar_comentarios(pool):
    conexion = pool.get_connection()
    try:
        cursor = conexion.cursor()
        cursor.execute("SELECT COUNT(*) FROM comentario")
        return cursor.fetchone()[0]
    finally:
        conexion.close()


def test_listar_del_mas_antiguo_al_mas_reciente_con_la_forma_del_contrato(client):
    res = client.get("/publicaciones/1/comentarios", headers=como(2))
    assert res.status_code == 200
    assert [c["id"] for c in res.json["comentarios"]] == [1, 2, 3]
    assert res.json["comentarios"][0] == {
        "id": 1,
        "texto": "¡Qué bonito perro!",
        "fechaComentario": "2026-10-20T10:15:00Z",
        "autor": {
            "id": 2,
            "nombreCompleto": "Isaac Loarca",
            "fotoPerfilUrl": "https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-isaac.jpg",
        },
    }


def test_listar_vacio_si_no_hay_comentarios(client):
    res = client.get("/publicaciones/3/comentarios", headers=como(1))
    assert res.status_code == 200
    assert res.json == {"comentarios": []}


def test_listar_404_si_no_es_visible(client):
    res = client.get("/publicaciones/4/comentarios", headers=como(1))
    assert res.status_code == 404
    assert res.json == {"error": "Publicación no encontrada"}


def test_listar_404_si_no_existe(client):
    res = client.get("/publicaciones/999/comentarios", headers=como(1))
    assert res.status_code == 404


def test_listar_400_si_id_no_es_entero_positivo(client):
    res = client.get("/publicaciones/abc/comentarios", headers=como(1))
    assert res.status_code == 400
    assert res.json == {"error": "id debe ser un entero positivo"}


def test_listar_401_sin_usuario(client):
    res = client.get("/publicaciones/1/comentarios")
    assert res.status_code == 401
    assert res.json == {"error": "No autenticado"}


def test_crear_de_un_amigo_recortado_y_con_su_autor(client):
    res = client.post("/publicaciones/1/comentarios", headers=como(3), json={"texto": "  Muy bonito  "})
    assert res.status_code == 201
    assert res.json["comentario"]["texto"] == "Muy bonito"
    assert res.json["comentario"]["autor"]["id"] == 3
    assert FECHA_ISO.match(res.json["comentario"]["fechaComentario"])

    lista = client.get("/publicaciones/1/comentarios", headers=como(1))
    assert lista.json["comentarios"][-1]["id"] == res.json["comentario"]["id"]


def test_crear_en_la_propia_publicacion(client):
    res = client.post("/publicaciones/4/comentarios", headers=como(5), json={"texto": "Hola"})
    assert res.status_code == 201


def test_crear_404_y_no_guarda_si_no_es_amigo(client, pool):
    antes = contar_comentarios(pool)
    res = client.post("/publicaciones/4/comentarios", headers=como(1), json={"texto": "Hola"})
    assert res.status_code == 404
    assert contar_comentarios(pool) == antes


def test_crear_rechaza_vacio_o_solo_espacios(client):
    res = client.post("/publicaciones/1/comentarios", headers=como(2), json={"texto": "   "})
    assert res.status_code == 400
    assert res.json == {"error": "El comentario no puede estar vacío"}


def test_crear_rechaza_mas_de_1000_caracteres(client):
    res = client.post("/publicaciones/1/comentarios", headers=como(2), json={"texto": "a" * 1001})
    assert res.status_code == 400
    assert res.json == {"error": "El comentario no puede pasar de 1000 caracteres"}


def test_crear_400_si_falta_texto(client):
    res = client.post("/publicaciones/1/comentarios", headers=como(2), json={})
    assert res.status_code == 400
    assert res.json == {"error": "texto es obligatorio"}


def test_crear_400_si_cuerpo_no_es_objeto(client):
    res = client.post("/publicaciones/1/comentarios", headers=como(2), json=[1, 2])
    assert res.status_code == 400
    assert res.json == {"error": "El cuerpo debe ser un objeto JSON"}


def test_crear_401_sin_usuario(client):
    res = client.post("/publicaciones/1/comentarios", json={"texto": "Hola"})
    assert res.status_code == 401
