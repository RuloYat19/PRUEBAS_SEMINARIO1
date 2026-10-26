import re
from src.chat import errors
_ID=re.compile(r"^\s*[1-9]\d*\s*$")
def entero(valor,nombre="id",permitir_cero=False):
    patron=r"^\s*\d+\s*$" if permitir_cero else _ID
    if not isinstance(valor,(str,int)) or not re.match(patron,str(valor)):
        raise errors.validacion(f"{nombre} debe ser un entero válido")
    return int(valor)
def mensaje(body):
    if not isinstance(body,dict): raise errors.validacion("El cuerpo debe ser un objeto JSON")
    texto=body.get("texto")
    if not isinstance(texto,str) or not texto.strip(): raise errors.validacion("texto es obligatorio")
    texto=texto.strip()
    if len(texto)>2000: raise errors.validacion("El mensaje no puede pasar de 2000 caracteres")
    return texto
