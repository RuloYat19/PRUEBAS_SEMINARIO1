from src.traduccion import errors

IDIOMAS = ("en", "fr", "pt")


def traducir(body):
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise errors.validacion("El cuerpo debe ser un objeto JSON")

    texto = body.get("texto")
    if not isinstance(texto, str):
        raise errors.validacion("texto es obligatorio")
    texto = texto.strip()
    if not texto:
        raise errors.validacion("El texto no puede estar vacío")
    if len(texto) > 5000:
        raise errors.validacion("El texto no puede pasar de 5000 caracteres")

    idioma = body.get("idioma")
    if idioma not in IDIOMAS:
        raise errors.validacion("idioma debe ser en, fr o pt")

    return {"texto": texto, "idioma": idioma}
