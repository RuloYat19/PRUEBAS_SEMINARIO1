from flask import Blueprint, jsonify

from src.comentarios.controller import ComentariosController
from src.comentarios.errors import ComentariosError


def create_comentarios_blueprint(comentarios_service):
    blueprint = Blueprint(
        "comentarios", __name__, url_prefix="/publicaciones/<publicacion_id>/comentarios"
    )
    controller = ComentariosController(comentarios_service)

    blueprint.add_url_rule(
        "", view_func=controller.listar, methods=["GET"], strict_slashes=False, endpoint="listar",
    )
    blueprint.add_url_rule(
        "", view_func=controller.crear, methods=["POST"], strict_slashes=False, endpoint="crear",
    )

    @blueprint.errorhandler(ComentariosError)
    def manejar_error(error):
        return jsonify({"error": error.message}), error.status_code

    return blueprint
