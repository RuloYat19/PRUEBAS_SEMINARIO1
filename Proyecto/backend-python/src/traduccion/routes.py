from flask import Blueprint, jsonify

from src.traduccion.controller import TraduccionController
from src.traduccion.errors import TraduccionError


def create_traduccion_blueprint(traduccion_service):
    blueprint = Blueprint("traduccion", __name__, url_prefix="/traducciones")
    controller = TraduccionController(traduccion_service)

    blueprint.add_url_rule(
        "", view_func=controller.traducir, methods=["POST"], strict_slashes=False, endpoint="traducir",
    )

    @blueprint.errorhandler(TraduccionError)
    def manejar_error(error):
        return jsonify({"error": error.message}), error.status_code

    return blueprint
