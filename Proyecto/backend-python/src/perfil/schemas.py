import re

from src.perfil import errors

FOTO_KEY = re.compile(r"^Fotos_Perfil/[A-Za-z0-9_-]+\.(jpe?g|png)$", re.IGNORECASE)
DPI = re.compile(r"^\d{13}$")


def actualizar_perfil(body):
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise errors.validacion("El cuerpo debe ser un objeto JSON")

    nombre = body.get("nombreCompleto")
    if not isinstance(nombre, str):
        raise errors.validacion("nombreCompleto es obligatorio")
    nombre = nombre.strip()
    if not nombre:
        raise errors.validacion("El nombre no puede estar vacío")
    if len(nombre) > 150:
        raise errors.validacion("El nombre no puede pasar de 150 caracteres")

    dpi = body.get("dpi")
    if not isinstance(dpi, str):
        raise errors.validacion("dpi es obligatorio")
    dpi = dpi.strip()
    if not DPI.match(dpi):
        raise errors.validacion("El DPI debe tener 13 dígitos")

    foto_key = body.get("fotoPerfilKey")
    if foto_key is not None:
        if not isinstance(foto_key, str):
            raise errors.validacion("fotoPerfilKey debe ser texto")
        if not FOTO_KEY.match(foto_key):
            raise errors.validacion("fotoPerfilKey debe ser Fotos_Perfil/<archivo>.jpg, .jpeg o .png")

    password = body.get("password")
    if not isinstance(password, str) or not password:
        raise errors.validacion("password es obligatorio")

    return {"nombre_completo": nombre, "dpi": dpi, "foto_perfil_key": foto_key, "password": password}
