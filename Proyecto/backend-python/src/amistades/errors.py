class AmistadesError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def validacion(message): return AmistadesError(400, message)
def no_autenticado(): return AmistadesError(401, "No autenticado")
def no_encontrada(): return AmistadesError(404, "Solicitud no encontrada")
def conflicto(message="Ya existe una solicitud para estos usuarios"): return AmistadesError(409, message)
