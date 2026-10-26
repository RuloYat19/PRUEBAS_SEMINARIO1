import re
from src.chatbot import errors
_SESSION=re.compile(r"^[A-Za-z0-9_-]{2,100}$")
def mensaje(body):
    if not isinstance(body,dict): raise errors.validacion("El cuerpo debe ser un objeto JSON")
    texto=body.get("mensaje")
    if not isinstance(texto,str) or not texto.strip(): raise errors.validacion("mensaje es obligatorio")
    texto=texto.strip()
    if len(texto)>1000: raise errors.validacion("mensaje no puede pasar de 1000 caracteres")
    session=body.get("sesionId")
    if session is not None and (not isinstance(session,str) or not _SESSION.fullmatch(session)):
        raise errors.validacion("sesionId debe tener entre 2 y 100 caracteres válidos")
    return texto,session
