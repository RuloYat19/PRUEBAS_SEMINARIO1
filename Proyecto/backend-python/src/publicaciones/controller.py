from flask import g, jsonify, request

from src.publicaciones import errors, schemas


def _usuario_id():
    """El middleware de identidad deja el usuario de RDS en g.usuario."""
    usuario = getattr(g, "usuario", None) or {}
    if not usuario.get("id"):
        raise errors.no_autenticado()
    return usuario["id"]


def _query_unica(nombre):
    """Como en Express, un parámetro repetido no es un texto válido."""
    valores = request.args.getlist(nombre)
    return valores[0] if len(valores) == 1 else None


class PublicacionesController:
    def __init__(self, publicaciones_service):
        self.publicaciones_service = publicaciones_service

    def crear(self):
        data = schemas.crear_publicacion(request.get_json(silent=True))
        publicacion = self.publicaciones_service.crear(_usuario_id(), **data)
        return jsonify({"publicacion": publicacion}), 201

    def listar_feed(self):
        etiqueta = schemas.texto_opcional(_query_unica("etiqueta"))
        publicaciones = self.publicaciones_service.listar_feed(_usuario_id(), etiqueta)
        return jsonify({"publicaciones": publicaciones}), 200

    def listar_etiquetas(self):
        buscar = schemas.texto_opcional(_query_unica("buscar"))
        etiquetas = self.publicaciones_service.listar_etiquetas(_usuario_id(), buscar)
        return jsonify({"etiquetas": etiquetas}), 200

    def buscar(self, id):
        publicacion_id = schemas.publicacion_id(id)
        publicacion = self.publicaciones_service.buscar(_usuario_id(), publicacion_id)
        return jsonify({"publicacion": publicacion}), 200
