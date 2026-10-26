from flask import Blueprint,jsonify,request
from src.identidad import schemas

class IdentidadController:
    def __init__(self,service): self.service=service
    def registrar(self):
        datos=schemas.registrar(request.get_json(silent=True)); self.service.registrar(**datos)
        return jsonify({"mensaje":"Cuenta creada. Revisa tu correo para verificarla."}),201
    def verificar(self):
        correo,codigo=schemas.codigo(request.get_json(silent=True)); self.service.verificar(correo,codigo)
        return jsonify({"mensaje":"Correo verificado"}),200
    def reenviar(self):
        correo=schemas.reenviar(request.get_json(silent=True)); self.service.reenviar_codigo(correo)
        return jsonify({"mensaje":"Código reenviado"}),200
    def login(self):
        correo,password=schemas.login(request.get_json(silent=True))
        return jsonify({"token":self.service.iniciar_con_password(correo,password)}),200
    def login_facial(self):
        correo,imagen=schemas.login_facial(request.get_json(silent=True))
        return jsonify({"token":self.service.iniciar_con_rostro(correo,imagen)}),200

def create_identidad_blueprint(service):
    bp=Blueprint("identidad",__name__,url_prefix="/auth"); c=IdentidadController(service)
    bp.add_url_rule("/registro",view_func=c.registrar,methods=["POST"])
    bp.add_url_rule("/verificar",view_func=c.verificar,methods=["POST"])
    bp.add_url_rule("/reenviar-codigo",view_func=c.reenviar,methods=["POST"])
    bp.add_url_rule("/login",view_func=c.login,methods=["POST"])
    bp.add_url_rule("/login-facial",view_func=c.login_facial,methods=["POST"])
    from src.identidad.errors import IdentidadError
    @bp.errorhandler(IdentidadError)
    def manejar_error(error): return jsonify({"error":error.message}),error.status_code
    return bp
