from flask import Blueprint, jsonify
from src.amistades.controller import AmistadesController
from src.amistades.errors import AmistadesError

def create_amistades_blueprint(service):
    bp=Blueprint("amistades",__name__,url_prefix="/amistades"); c=AmistadesController(service)
    bp.add_url_rule("/personas",view_func=c.usuarios,methods=["GET"])
    bp.add_url_rule("",view_func=c.amigos,methods=["GET"],strict_slashes=False)
    bp.add_url_rule("/solicitudes",view_func=c.solicitudes,methods=["GET"])
    bp.add_url_rule("/solicitudes",view_func=c.enviar,methods=["POST"])
    bp.add_url_rule("/solicitudes/<id>",view_func=c.responder,methods=["PUT"])
    @bp.errorhandler(AmistadesError)
    def error(e): return jsonify({"error":e.message}),e.status_code
    return bp
