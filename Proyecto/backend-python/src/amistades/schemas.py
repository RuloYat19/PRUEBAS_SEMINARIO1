import re
from src.amistades import errors

_ID = re.compile(r"^\s*[1-9]\d*\s*$")

def usuario_id(valor):
    if not isinstance(valor, (str, int)) or not _ID.match(str(valor)):
        raise errors.validacion("usuarioId debe ser un entero positivo")
    return int(valor)

def enviar_solicitud(body):
    if not isinstance(body, dict):
        raise errors.validacion("El cuerpo debe ser un objeto JSON")
    if "receptorId" not in body:
        raise errors.validacion("receptorId es obligatorio")
    return usuario_id(body["receptorId"])

def estado_respuesta(body):
    if not isinstance(body,dict): raise errors.validacion("El cuerpo debe ser un objeto JSON")
    estado=body.get("estado")
    if estado not in ("ACEPTADA","RECHAZADA"):
        raise errors.validacion("estado debe ser ACEPTADA o RECHAZADA")
    return estado
