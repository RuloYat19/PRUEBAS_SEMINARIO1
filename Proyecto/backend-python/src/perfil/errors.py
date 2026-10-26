class PerfilError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def validacion(message):
    return PerfilError(400, message)


def no_autenticado():
    return PerfilError(401, "No autenticado")


def password_incorrecta():
    return PerfilError(403, "La contraseña no es correcta")


def no_encontrado():
    return PerfilError(404, "Usuario no encontrado")


def dpi_en_uso():
    return PerfilError(409, "Ese DPI ya está registrado")


def cognito():
    return PerfilError(502, "No se pudo actualizar el perfil en Cognito")
