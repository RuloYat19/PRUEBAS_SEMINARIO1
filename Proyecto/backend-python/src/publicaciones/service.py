import logging

from src.publicaciones import errors

logger = logging.getLogger(__name__)

# Rekognition responde con estos errores cuando el problema es la imagen
# (no existe en S3, formato no soportado, demasiado grande), no el servicio.
ERRORES_DE_IMAGEN = {
    "InvalidS3ObjectException",
    "InvalidImageFormatException",
    "ImageTooLargeException",
    "InvalidParameterException",
}


def _codigo_error(error):
    """Código de error de AWS en un ClientError de botocore."""
    return getattr(error, "response", {}).get("Error", {}).get("Code")


class PublicacionesService:
    def __init__(self, repository, etiquetador, s3_public_url):
        self.repository = repository
        self.etiquetador = etiquetador
        self.s3_public_url = s3_public_url.rstrip("/")

    def crear(self, usuario_id, imagen_key, descripcion):
        try:
            etiquetas = self.etiquetador.detectar_etiquetas(imagen_key)
        except Exception as error:
            if _codigo_error(error) in ERRORES_DE_IMAGEN:
                raise errors.validacion("La imagen no existe en S3 o no es válida") from error
            logger.exception("[publicaciones] Rekognition falló")
            raise errors.rekognition() from error

        publicacion_id = self.repository.crear(
            usuario_id=usuario_id,
            descripcion=descripcion,
            imagen_url=f"{self.s3_public_url}/{imagen_key}",
            imagen_key=imagen_key,
            etiquetas=etiquetas,
        )
        return self.repository.buscar_visible(usuario_id, publicacion_id)

    def listar_feed(self, usuario_id, etiqueta=None):
        return self.repository.listar_feed(usuario_id, etiqueta)

    def listar_etiquetas(self, usuario_id, buscar=None):
        return self.repository.listar_etiquetas(usuario_id, buscar)

    def buscar(self, usuario_id, publicacion_id):
        publicacion = self.repository.buscar_visible(usuario_id, publicacion_id)
        if publicacion is None:
            raise errors.no_encontrada()
        return publicacion
