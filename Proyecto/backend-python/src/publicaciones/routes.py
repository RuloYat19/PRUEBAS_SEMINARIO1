from flask import Blueprint, jsonify

from src.publicaciones.controller import PublicacionesController
from src.publicaciones.errors import PublicacionesError


def create_publicaciones_blueprint(publicaciones_service):
    """Se registra DESPUÉS del middleware que valida el token:

    app.register_blueprint(create_publicaciones_blueprint(service))
    """
    blueprint = Blueprint("publicaciones", __name__, url_prefix="/publicaciones")
    controller = PublicacionesController(publicaciones_service)

    blueprint.add_url_rule(
        "", view_func=controller.crear, methods=["POST"], strict_slashes=False,
        endpoint="crear",
    )
    blueprint.add_url_rule(
        "", view_func=controller.listar_feed, methods=["GET"], strict_slashes=False,
        endpoint="listar_feed",
    )
    blueprint.add_url_rule(
        "/etiquetas", view_func=controller.listar_etiquetas, methods=["GET"],
        endpoint="listar_etiquetas",
    )
    blueprint.add_url_rule(
        "/<id>", view_func=controller.buscar, methods=["GET"], endpoint="buscar",
    )

    # Traduce los errores de este módulo al formato del contrato.
    @blueprint.errorhandler(PublicacionesError)
    def manejar_error(error):
        return jsonify({"error": error.message}), error.status_code

    return blueprint
