from flask import g,jsonify,request
from src.chatbot import errors,schemas
class ChatbotController:
    def __init__(self,service): self.service=service
    def enviar(self):
        if not (getattr(g,"usuario",None) or {}).get("id"): raise errors.no_autenticado()
        texto,session=schemas.mensaje(request.get_json(silent=True))
        return jsonify({"respuestas":self.service.enviar(texto,session)}),200
