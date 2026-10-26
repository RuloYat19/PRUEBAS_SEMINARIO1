class ComentariosError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def validacion(message):
    return ComentariosError(400, message)


def no_autenticado():
    return ComentariosError(401, "No autenticado")


def publicacion_no_encontrada():
    return ComentariosError(404, "Publicación no encontrada")
