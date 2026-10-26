import pytest

from src.traduccion.routes import create_traduccion_blueprint
from src.traduccion.service import TraduccionService
from tests.conftest import app_de_prueba, como


class TraductorFalso:
    def __init__(self):
        self.llamadas = []
        self.error = None

    def traducir(self, texto, idioma):
        self.llamadas.append({"texto": texto, "idioma": idioma})
        if self.error:
            raise self.error
        return {"texto": f"[{idioma}] {texto}", "idiomaOrigen": "es"}


@pytest.fixture
def traductor():
    return TraductorFalso()


@pytest.fixture
def client(traductor):
    return app_de_prueba(create_traduccion_blueprint(TraduccionService(traductor)))


def test_traduce_y_devuelve_la_forma_del_contrato(client, traductor):
    res = client.post("/traducciones", headers=como(1), json={"texto": "  Hola mundo  ", "idioma": "en"})
    assert res.status_code == 200
    assert res.json == {"traduccion": {"texto": "[en] Hola mundo", "idiomaOrigen": "es", "idioma": "en"}}
    assert traductor.llamadas == [{"texto": "Hola mundo", "idioma": "en"}]


@pytest.mark.parametrize("idioma", ["fr", "pt"])
def test_acepta_frances_y_portugues(client, idioma):
    res = client.post("/traducciones", headers=como(1), json={"texto": "Hola", "idioma": idioma})
    assert res.status_code == 200
    assert res.json["traduccion"]["idioma"] == idioma


def test_rechaza_idioma_no_soportado_sin_llamar_a_translate(client, traductor):
    res = client.post("/traducciones", headers=como(1), json={"texto": "Hola", "idioma": "de"})
    assert res.status_code == 400
    assert res.json == {"error": "idioma debe ser en, fr o pt"}
    assert traductor.llamadas == []


def test_rechaza_texto_vacio(client):
    res = client.post("/traducciones", headers=como(1), json={"texto": "  ", "idioma": "en"})
    assert res.status_code == 400
    assert res.json == {"error": "El texto no puede estar vacío"}


def test_rechaza_texto_de_mas_de_5000(client):
    res = client.post("/traducciones", headers=como(1), json={"texto": "a" * 5001, "idioma": "en"})
    assert res.status_code == 400
    assert res.json == {"error": "El texto no puede pasar de 5000 caracteres"}


def test_400_si_cuerpo_no_es_objeto(client):
    res = client.post("/traducciones", headers=como(1), json=["Hola"])
    assert res.status_code == 400
    assert res.json == {"error": "El cuerpo debe ser un objeto JSON"}


def test_502_si_translate_falla(client, traductor):
    traductor.error = RuntimeError("ServiceUnavailableException")
    res = client.post("/traducciones", headers=como(1), json={"texto": "Hola", "idioma": "en"})
    assert res.status_code == 502
    assert res.json == {"error": "No se pudo traducir el texto"}


def test_401_sin_usuario_y_no_llama_a_translate(client, traductor):
    res = client.post("/traducciones", json={"texto": "Hola", "idioma": "en"})
    assert res.status_code == 401
    assert traductor.llamadas == []
