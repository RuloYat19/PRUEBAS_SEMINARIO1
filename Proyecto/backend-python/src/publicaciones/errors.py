class PublicacionesError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def validacion(message):
    return PublicacionesError(400, message)


def no_autenticado():
    return PublicacionesError(401, "No autenticado")


def no_encontrada():
    return PublicacionesError(404, "Publicación no encontrada")


def rekognition():
    return PublicacionesError(502, "No se pudieron obtener las etiquetas de la imagen")
