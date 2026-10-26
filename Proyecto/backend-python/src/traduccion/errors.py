class TraduccionError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def validacion(message):
    return TraduccionError(400, message)


def no_autenticado():
    return TraduccionError(401, "No autenticado")


def translate():
    return TraduccionError(502, "No se pudo traducir el texto")
