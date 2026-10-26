class IdentidadError(Exception):
    def __init__(self,status_code,message):
        super().__init__(message); self.status_code=status_code; self.message=message

def validacion(message): return IdentidadError(400,message)
def no_autenticado(): return IdentidadError(401,"Correo, contraseña o rostro incorrectos")
def no_verificado(): return IdentidadError(403,"El correo aún no está verificado")
def no_encontrado(): return IdentidadError(404,"No existe una cuenta con ese correo")
def conflicto(message): return IdentidadError(409,message)
def cognito(): return IdentidadError(502,"Cognito no pudo completar la operación")
def rekognition(): return IdentidadError(502,"No se pudo comparar el rostro")
def no_configurado(): return IdentidadError(503,"El login facial no está configurado")
def cognito_no_configurado(): return IdentidadError(503,"Cognito no está configurado")
def rds(): return IdentidadError(502,"No se pudo guardar la cuenta en la base de datos")
