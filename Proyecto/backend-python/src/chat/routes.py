import json
import logging
import time
from flask import Blueprint, g
from src.chat.controller import ChatController
from src.chat.errors import ChatError
from src.chat import schemas

logger=logging.getLogger(__name__)

def create_chat_blueprint(service,sock=None):
    bp=Blueprint("chat",__name__,url_prefix="/chat"); c=ChatController(service)
    bp.add_url_rule("/<amigo_id>/mensajes",view_func=c.historial,methods=["GET"])
    bp.add_url_rule("/<amigo_id>/mensajes",view_func=c.enviar,methods=["POST"])
    bp.add_url_rule("/ticket",view_func=c.ticket,methods=["POST"])
    if sock:
        @sock.route("/chat")
        def websocket(ws):
            usuario=getattr(g,"usuario",None) or {}
            if not usuario.get("id"):
                ws.send(json.dumps({"error":"No autenticado"})); return
            usuario_id=usuario["id"]; cursor=service.ultimo_id(usuario_id); ultimo_keepalive=time.monotonic()
            try:
                while True:
                    raw=ws.receive(timeout=1)
                    if raw:
                        try:
                            data=json.loads(raw)
                            if not isinstance(data,dict): raise ValueError("El mensaje WebSocket debe ser un objeto JSON")
                            if data.get("tipo")!="mensaje": raise ValueError("tipo debe ser mensaje")
                            receptor=schemas.entero(data.get("receptorId"),"receptorId"); texto=schemas.mensaje(data)
                            enviado=service.enviar(usuario_id,receptor,texto)
                            ws.send(json.dumps({"tipo":"mensaje","mensaje":enviado},ensure_ascii=False))
                        except (ValueError,TypeError,ChatError) as exc:
                            ws.send(json.dumps({"tipo":"error","error":getattr(exc,"message",str(exc))}))
                    mensajes=service.recibidos(usuario_id,cursor)
                    for mensaje in mensajes:
                        cursor=max(cursor,int(mensaje["id"]))
                        ws.send(json.dumps({"tipo":"mensaje","mensaje":mensaje},ensure_ascii=False))
                    if time.monotonic()-ultimo_keepalive>=25:
                        ws.send(json.dumps({"tipo":"keepalive"}))
                        ultimo_keepalive=time.monotonic()
            except Exception:
                logger.info("[chat] WebSocket desconectado para usuario %s",usuario_id)
    @bp.errorhandler(ChatError)
    def manejar_error(error): return jsonify({"error":error.message}),error.status_code
    return bp
