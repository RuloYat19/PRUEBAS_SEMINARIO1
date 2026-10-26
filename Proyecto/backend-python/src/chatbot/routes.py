from flask import Blueprint,jsonify
from src.chatbot.controller import ChatbotController
from src.chatbot.errors import ChatbotError
def create_chatbot_blueprint(service):
    bp=Blueprint("chatbot",__name__,url_prefix="/chatbot"); c=ChatbotController(service)
    bp.add_url_rule("",view_func=c.enviar,methods=["POST"],strict_slashes=False)
    @bp.errorhandler(ChatbotError)
    def manejar_error(e): return jsonify({"error":e.message}),e.status_code
    return bp
