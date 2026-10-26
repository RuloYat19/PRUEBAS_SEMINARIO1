class ChatbotError(Exception):
    def __init__(self,status_code,message): super().__init__(message); self.status_code=status_code; self.message=message
def validacion(message): return ChatbotError(400,message)
def no_autenticado(): return ChatbotError(401,"No autenticado")
def lex(): return ChatbotError(502,"No se pudo consultar el chatbot")
