import re

from src.comentarios import errors

ENTERO_POSITIVO = re.compile(r"^\s*\d+\s*$")


def crear_comentario(body):
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise errors.validacion("El cuerpo debe ser un objeto JSON")

    texto = body.get("texto")
    if not isinstance(texto, str):
        raise errors.validacion("texto es obligatorio")
    texto = texto.strip()
    if not texto:
        raise errors.validacion("El comentario no puede estar vacío")
    if len(texto) > 1000:
        raise errors.validacion("El comentario no puede pasar de 1000 caracteres")
    return texto


def publicacion_id(valor):
    if not ENTERO_POSITIVO.match(valor) or int(valor) <= 0:
        raise errors.validacion("id debe ser un entero positivo")
    return int(valor)
