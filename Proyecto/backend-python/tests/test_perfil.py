import pytest

from src.perfil.repository import PerfilRepository
from src.perfil.routes import create_perfil_blueprint
from src.perfil.service import PerfilService
from tests.conftest import app_de_prueba, como

pytestmark = pytest.mark.usefixtures("cargar_seed")

S3_PUBLIC_URL = "https://semi1proyecto-g8-2s2026.s3.amazonaws.com"
PASSWORD = "Demo1234"


class CognitoFalso:
    def __init__(self):
        self.llamadas = []
        self.error = None

    def actualizar_atributos(self, correo, nombre_completo, dpi):
        self.llamadas.append({"correo": correo, "nombreCompleto": nombre_completo, "dpi": dpi})
        if self.error:
            raise self.error


class RepositorioQueFalla(PerfilRepository):
    def actualizar(self, *args, **kwargs):
        raise RuntimeError("RDS no disponible")


@pytest.fixture
def cognito():
    return CognitoFalso()


def crear_client(pool, cognito, repositorio=PerfilRepository):
    service = PerfilService(repositorio(pool.get_connection), cognito, S3_PUBLIC_URL)
    app = app_de_prueba(create_perfil_blueprint(service))
    app.application.testing = False
    return app


@pytest.fixture
def client(pool, cognito):
    return crear_client(pool, cognito)


def cambios(**extra):
    return {"nombreCompleto": "Fátima Florisel Cerezo", "dpi": "3000000000999", "password": PASSWORD, **extra}


def fila_usuario(pool, usuario_id):
    conexion = pool.get_connection()
    try:
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(
            "SELECT nombre_completo, dpi, foto_perfil_url, foto_perfil_key FROM usuario WHERE id = %s",
            (usuario_id,),
        )
        return cursor.fetchone()
    finally:
        conexion.close()


def test_obtener_con_la_forma_del_contrato(client):
    res = client.get("/perfil", headers=como(4))
    assert res.status_code == 200
    assert res.json == {
        "perfil": {
            "id": 4,
            "nombreCompleto": "Fátima Cerezo",
            "correo": "fatima.demo@semisocial.test",
            "dpi": "3000000000404",
            "fotoPerfilUrl": "https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-fatima.jpg",
        }
    }


def test_obtener_401_sin_usuario(client):
    res = client.get("/perfil")
    assert res.status_code == 401
    assert res.json == {"error": "No autenticado"}


def test_actualiza_cognito_y_rds_con_la_contrasena_correcta(client, cognito, pool):
    res = client.put("/perfil", headers=como(4), json=cambios(nombreCompleto="  Fátima Florisel Cerezo  "))
    assert res.status_code == 200
    assert res.json["perfil"]["nombreCompleto"] == "Fátima Florisel Cerezo"
    assert res.json["perfil"]["dpi"] == "3000000000999"
    assert cognito.llamadas == [
        {"correo": "fatima.demo@semisocial.test", "nombreCompleto": "Fátima Florisel Cerezo", "dpi": "3000000000999"}
    ]
    fila = fila_usuario(pool, 4)
    assert fila["nombre_completo"] == "Fátima Florisel Cerezo"
    assert fila["dpi"] == "3000000000999"


def test_guarda_la_nueva_foto_con_url_y_key(client, pool):
    res = client.put("/perfil", headers=como(4), json=cambios(fotoPerfilKey="Fotos_Perfil/abc-123.jpg"))
    assert res.status_code == 200
    assert res.json["perfil"]["fotoPerfilUrl"] == f"{S3_PUBLIC_URL}/Fotos_Perfil/abc-123.jpg"
    assert fila_usuario(pool, 4)["foto_perfil_key"] == "Fotos_Perfil/abc-123.jpg"


def test_sin_foto_nueva_conserva_la_anterior(client, pool):
    client.put("/perfil", headers=como(4), json=cambios())
    assert fila_usuario(pool, 4)["foto_perfil_key"] == "Fotos_Perfil/seed-fatima.jpg"


def test_permite_el_mismo_dpi_que_ya_tenia(client):
    res = client.put("/perfil", headers=como(4), json=cambios(dpi="3000000000404"))
    assert res.status_code == 200


def test_403_con_contrasena_incorrecta_sin_tocar_cognito_ni_rds(client, cognito, pool):
    res = client.put("/perfil", headers=como(4), json=cambios(password="Otra1234"))
    assert res.status_code == 403
    assert res.json == {"error": "La contraseña no es correcta"}
    assert cognito.llamadas == []
    assert fila_usuario(pool, 4)["nombre_completo"] == "Fátima Cerezo"


def test_409_si_el_dpi_es_de_otro_usuario(client, cognito):
    res = client.put("/perfil", headers=como(4), json=cambios(dpi="3000000000101"))
    assert res.status_code == 409
    assert res.json == {"error": "Ese DPI ya está registrado"}
    assert cognito.llamadas == []


def test_502_y_no_cambia_rds_si_cognito_falla(client, cognito, pool):
    cognito.error = RuntimeError("InternalErrorException")
    res = client.put("/perfil", headers=como(4), json=cambios())
    assert res.status_code == 502
    assert res.json == {"error": "No se pudo actualizar el perfil en Cognito"}
    assert fila_usuario(pool, 4)["nombre_completo"] == "Fátima Cerezo"


def test_restaura_cognito_si_rds_falla_despues(pool, cognito):
    client = crear_client(pool, cognito, RepositorioQueFalla)
    res = client.put("/perfil", headers=como(4), json=cambios())
    assert res.status_code == 500
    assert cognito.llamadas == [
        {"correo": "fatima.demo@semisocial.test", "nombreCompleto": "Fátima Florisel Cerezo", "dpi": "3000000000999"},
        {"correo": "fatima.demo@semisocial.test", "nombreCompleto": "Fátima Cerezo", "dpi": "3000000000404"},
    ]


def test_rechaza_dpi_sin_13_digitos(client):
    res = client.put("/perfil", headers=como(4), json=cambios(dpi="123"))
    assert res.status_code == 400
    assert res.json == {"error": "El DPI debe tener 13 dígitos"}


def test_rechaza_nombre_vacio(client):
    res = client.put("/perfil", headers=como(4), json=cambios(nombreCompleto="   "))
    assert res.status_code == 400
    assert res.json == {"error": "El nombre no puede estar vacío"}


def test_rechaza_foto_fuera_de_fotos_perfil(client):
    res = client.put("/perfil", headers=como(4), json=cambios(fotoPerfilKey="Fotos_Publicadas/x.jpg"))
    assert res.status_code == 400
    assert res.json == {"error": "fotoPerfilKey debe ser Fotos_Perfil/<archivo>.jpg, .jpeg o .png"}


def test_400_si_falta_la_contrasena(client):
    datos = cambios()
    del datos["password"]
    res = client.put("/perfil", headers=como(4), json=datos)
    assert res.status_code == 400
    assert res.json == {"error": "password es obligatorio"}


def test_400_si_el_cuerpo_no_es_objeto(client):
    res = client.put("/perfil", headers=como(4), json=[1])
    assert res.status_code == 400
    assert res.json == {"error": "El cuerpo debe ser un objeto JSON"}


def test_401_sin_usuario(client):
    res = client.put("/perfil", json=cambios())
    assert res.status_code == 401
