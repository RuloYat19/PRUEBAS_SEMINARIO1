from flask import g, jsonify, request

from src.comentarios import errors, schemas


def _usuario_id():
    usuario = getattr(g, "usuario", None) or {}
    if not usuario.get("id"):
        raise errors.no_autenticado()
    return usuario["id"]


class ComentariosController:
    def __init__(self, comentarios_service):
        self.comentarios_service = comentarios_service

    def listar(self, publicacion_id):
        usuario_id = _usuario_id()
        comentarios = self.comentarios_service.listar(usuario_id, schemas.publicacion_id(publicacion_id))
        return jsonify({"comentarios": comentarios}), 200

    def crear(self, publicacion_id):
        usuario_id = _usuario_id()
        id_publicacion = schemas.publicacion_id(publicacion_id)
        texto = schemas.crear_comentario(request.get_json(silent=True))
        comentario = self.comentarios_service.crear(usuario_id, id_publicacion, texto)
        return jsonify({"comentario": comentario}), 201
