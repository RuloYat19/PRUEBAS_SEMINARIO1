class ChatError(Exception):
    def __init__(self,status_code,message): super().__init__(message); self.status_code=status_code; self.message=message
def validacion(message): return ChatError(400,message)
def no_autenticado(): return ChatError(401,"No autenticado")
def no_amigo(): return ChatError(403,"El usuario no está en tu lista de amigos")
def no_configurado(): return ChatError(503,"El chat no está configurado")
