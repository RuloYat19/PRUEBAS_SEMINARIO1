from flask import g, jsonify, request
from src.amistades import errors, schemas

class AmistadesController:
    def __init__(self, service): self.service=service
    def _usuario(self):
        usuario=getattr(g,"usuario",None) or {}
        if not usuario.get("id"): raise errors.no_autenticado()
        return usuario["id"]
    def usuarios(self): return jsonify({"usuarios":self.service.usuarios(self._usuario())}),200
    def solicitudes(self): return jsonify(self.service.solicitudes(self._usuario())),200
    def amigos(self): return jsonify({"amigos":self.service.amigos(self._usuario())}),200
    def enviar(self):
        usuario_id = self._usuario()
        sid=schemas.enviar_solicitud(request.get_json(silent=True))
        return jsonify({"solicitud":self.service.enviar(usuario_id,sid)}),201
    def responder(self,id):
        estado=schemas.estado_respuesta(request.get_json(silent=True))
        self.service.responder(self._usuario(),schemas.usuario_id(id),estado)
        return jsonify({"mensaje":"Solicitud actualizada"}),200
