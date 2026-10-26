import logging

from src.traduccion import errors

logger = logging.getLogger(__name__)


class TraduccionService:
    def __init__(self, traductor):
        self.traductor = traductor

    def traducir(self, texto, idioma):
        try:
            resultado = self.traductor.traducir(texto, idioma)
        except Exception as error:
            logger.exception("[traduccion] Translate falló")
            raise errors.translate() from error
        return {"texto": resultado["texto"], "idiomaOrigen": resultado["idiomaOrigen"], "idioma": idioma}
