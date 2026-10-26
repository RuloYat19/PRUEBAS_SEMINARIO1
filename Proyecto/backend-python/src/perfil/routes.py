from flask import Blueprint, jsonify

from src.perfil.controller import PerfilController
from src.perfil.errors import PerfilError


def create_perfil_blueprint(perfil_service):
    blueprint = Blueprint("perfil", __name__, url_prefix="/perfil")
    controller = PerfilController(perfil_service)

    blueprint.add_url_rule(
        "", view_func=controller.obtener, methods=["GET"], strict_slashes=False, endpoint="obtener",
    )
    blueprint.add_url_rule(
        "", view_func=controller.actualizar, methods=["PUT"], strict_slashes=False, endpoint="actualizar",
    )

    @blueprint.errorhandler(PerfilError)
    def manejar_error(error):
        return jsonify({"error": error.message}), error.status_code

    return blueprint
