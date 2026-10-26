from flask import g, jsonify, request

from src.perfil import errors, schemas


def _usuario_id():
    usuario = getattr(g, "usuario", None) or {}
    if not usuario.get("id"):
        raise errors.no_autenticado()
    return usuario["id"]


class PerfilController:
    def __init__(self, perfil_service):
        self.perfil_service = perfil_service

    def obtener(self):
        perfil = self.perfil_service.obtener(_usuario_id())
        return jsonify({"perfil": perfil}), 200

    def actualizar(self):
        usuario_id = _usuario_id()
        datos = schemas.actualizar_perfil(request.get_json(silent=True))
        perfil = self.perfil_service.actualizar(usuario_id, **datos)
        return jsonify({"perfil": perfil}), 200
