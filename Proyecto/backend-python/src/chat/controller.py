from flask import g,jsonify,request
from src.chat import errors,schemas
from src.config import WS_TICKET_SECRET
from src.shared.ws_ticket import emitir_ticket
class ChatController:
    def __init__(self,service): self.service=service
    def _usuario(self):
        u=getattr(g,"usuario",None) or {}
        if not u.get("id"): raise errors.no_autenticado()
        return u["id"]
    def historial(self,amigo_id):
        usuario_id=self._usuario()
        mensajes=self.service.historial(usuario_id,schemas.entero(amigo_id,"amigoId"),schemas.entero(request.args.get("desdeId","0"),"desdeId",True))
        return jsonify({"mensajes":mensajes}),200
    def enviar(self,amigo_id):
        usuario_id=self._usuario()
        texto=schemas.mensaje(request.get_json(silent=True)); m=self.service.enviar(usuario_id,schemas.entero(amigo_id,"amigoId"),texto)
        return jsonify({"mensaje":m}),201
    def ticket(self):
        usuario_id=self._usuario()
        try: token=emitir_ticket(usuario_id,WS_TICKET_SECRET)
        except ValueError as exc: raise errors.no_configurado() from exc
        return jsonify({"ticket":token,"expiraEn":30}),200
