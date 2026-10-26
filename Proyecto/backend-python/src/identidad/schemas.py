import base64
import binascii
import re
from src.identidad import errors

_EMAIL=re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_DPI=re.compile(r"^\d{13}$")
_FOTO=re.compile(r"^Fotos_Perfil/[A-Za-z0-9_-]+\.(?:jpe?g|png)$",re.IGNORECASE)
_DATA_URL=re.compile(r"^data:(image/jpeg|image/png);base64,([A-Za-z0-9+/]+={0,2})$")
_CODIGO=re.compile(r"^\d{6}$")
MAX_FOTO_BYTES=4*1024*1024

def _objeto(body):
    if not isinstance(body,dict): raise errors.validacion("El cuerpo debe ser un objeto JSON")
    return body

def correo_valido(valor):
    if not isinstance(valor,str): raise errors.validacion("correo es obligatorio")
    valor=valor.strip().lower()
    if len(valor)>150 or not _EMAIL.fullmatch(valor): raise errors.validacion("correo no tiene un formato válido")
    return valor

def registrar(body):
    body=_objeto(body)
    nombre=body.get("nombreCompleto")
    if not isinstance(nombre,str) or not nombre.strip(): raise errors.validacion("nombreCompleto es obligatorio")
    nombre=nombre.strip()
    if len(nombre)>150: raise errors.validacion("nombreCompleto no puede pasar de 150 caracteres")
    correo=correo_valido(body.get("correo"))
    dpi=body.get("dpi")
    if not isinstance(dpi,str) or not _DPI.fullmatch(dpi.strip()): raise errors.validacion("dpi debe tener 13 dígitos")
    password=body.get("password")
    if not isinstance(password,str) or len(password)<8 or not re.search(r"[A-Z]",password) or not re.search(r"[a-z]",password) or not re.search(r"\d",password) or not re.search(r"[^A-Za-z0-9]",password):
        raise errors.validacion("password debe tener 8 caracteres, mayúscula, minúscula, número y símbolo")
    foto_key=body.get("fotoPerfilKey")
    if not isinstance(foto_key,str) or not _FOTO.fullmatch(foto_key):
        raise errors.validacion("fotoPerfilKey debe ser una imagen JPEG o PNG de Fotos_Perfil")
    return {"nombre_completo":nombre,"correo":correo,"dpi":dpi.strip(),"password":password,"foto_perfil_key":foto_key}

def codigo(body):
    body=_objeto(body); correo=correo_valido(body.get("correo")); code=body.get("codigo")
    if not isinstance(code,str) or not _CODIGO.fullmatch(code.strip()): raise errors.validacion("codigo debe tener 6 dígitos")
    return correo,code.strip()

def login(body):
    body=_objeto(body); correo=correo_valido(body.get("correo")); password=body.get("password")
    if not isinstance(password,str) or not password: raise errors.validacion("password es obligatorio")
    return correo,password

def login_facial(body):
    body=_objeto(body); correo=correo_valido(body.get("correo")); imagen=body.get("imagen")
    if not isinstance(imagen,str): raise errors.validacion("imagen es obligatoria")
    match=_DATA_URL.fullmatch(imagen)
    if not match: raise errors.validacion("imagen debe ser un data URL JPEG o PNG en base64")
    try: contenido=base64.b64decode(match.group(2),validate=True)
    except (binascii.Error,ValueError) as exc: raise errors.validacion("imagen no contiene base64 válido") from exc
    firma_jpeg=contenido.startswith(b"\xff\xd8\xff")
    firma_png=contenido.startswith(b"\x89PNG\r\n\x1a\n")
    if not contenido or len(contenido)>MAX_FOTO_BYTES: raise errors.validacion("imagen debe ser menor de 4 MB")
    if (match.group(1)=="image/jpeg" and not firma_jpeg) or (match.group(1)=="image/png" and not firma_png):
        raise errors.validacion("El contenido no coincide con el tipo de imagen declarado")
    return correo,contenido

def reenviar(body):
    body=_objeto(body)
    return correo_valido(body.get("correo"))
