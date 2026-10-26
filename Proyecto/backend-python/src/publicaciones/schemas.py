"""Validación de entrada. Los mensajes son los mismos que en backend-node."""

import re

from src.publicaciones import errors

# La Lambda de imágenes nombra cada objeto `<carpeta>/<uuid>.<ext>`.
IMAGEN_KEY = re.compile(r"^Fotos_Publicadas/[A-Za-z0-9_-]+\.(jpe?g|png)$", re.IGNORECASE)
ENTERO_POSITIVO = re.compile(r"^\s*\d+\s*$")


def crear_publicacion(body):
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise errors.validacion("El cuerpo debe ser un objeto JSON")

    imagen_key = body.get("imagenKey")
    if not isinstance(imagen_key, str):
        raise errors.validacion("imagenKey es obligatorio")
    if not IMAGEN_KEY.match(imagen_key):
        raise errors.validacion("imagenKey debe ser Fotos_Publicadas/<archivo>.jpg, .jpeg o .png")

    descripcion = body.get("descripcion")
    if descripcion is not None:
        if not isinstance(descripcion, str):
            raise errors.validacion("descripcion debe ser texto")
        descripcion = descripcion.strip()
        if len(descripcion) > 1000:
            raise errors.validacion("descripcion no puede pasar de 1000 caracteres")

    return {"imagen_key": imagen_key, "descripcion": descripcion or None}


def texto_opcional(valor):
    """Un filtro vacío, muy largo o repetido se ignora (equivale a *Todos*)."""
    if not isinstance(valor, str):
        return None
    valor = valor.strip()
    if not valor or len(valor) > 100:
        return None
    return valor


def publicacion_id(valor):
    if not ENTERO_POSITIVO.match(valor) or int(valor) <= 0:
        raise errors.validacion("id debe ser un entero positivo")
    return int(valor)
