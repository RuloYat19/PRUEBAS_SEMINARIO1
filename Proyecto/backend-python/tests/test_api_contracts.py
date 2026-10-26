from flask import Flask,g,request

from src.amistades.routes import create_amistades_blueprint
from src.chat.routes import create_chat_blueprint
from src.chatbot.routes import create_chatbot_blueprint
from src.shared.ws_ticket import emitir_ticket,validar_ticket

class AmistadesFalsas:
    def usuarios(self,user_id): return [{"id":2,"nombreCompleto":"Ana Pérez","fotoPerfilUrl":"foto"}]
    def solicitudes(self,user_id): return {"recibidas":[],"enviadas":[]}
    def amigos(self,user_id): return [{"id":2,"nombreCompleto":"Ana Pérez","fotoPerfilUrl":"foto"}]
    def enviar(self,user_id,receptor_id): return {"id":9,"fechaSolicitud":"2026-01-01T00:00:00Z","usuario":{"id":receptor_id,"nombreCompleto":"Ana Pérez","fotoPerfilUrl":"foto"}}
    def responder(self,user_id,request_id,state): self.respuesta=(request_id,state)

class ChatFalso:
    def historial(self,user_id,friend_id,cursor=0): return [{"id":1,"emisorId":user_id,"receptorId":friend_id,"texto":"hola","fechaEnvio":"2026-01-01T00:00:00Z"}]
    def enviar(self,user_id,friend_id,text): return {"id":2,"emisorId":user_id,"receptorId":friend_id,"texto":text,"fechaEnvio":"2026-01-01T00:00:00Z"}

class LexFalso:
    def enviar(self,message,session_id): return [f"Eco: {message}"]

def cliente(*blueprints):
    app=Flask(__name__)
    @app.before_request
    def user(): g.usuario={"id":1}
    for blueprint in blueprints: app.register_blueprint(blueprint)
    return app.test_client()

def test_contrato_amistades_coincide_con_frontend():
    service=AmistadesFalsas(); client=cliente(create_amistades_blueprint(service))
    assert client.get("/amistades/personas").json["usuarios"][0]["id"]==2
    assert client.get("/amistades").json["amigos"][0]["id"]==2
    assert client.get("/amistades/solicitudes").json=={"recibidas":[],"enviadas":[]}
    sent=client.post("/amistades/solicitudes",json={"receptorId":2})
    assert sent.status_code==201 and sent.json["solicitud"]["usuario"]["id"]==2
    assert client.put("/amistades/solicitudes/9",json={"estado":"ACEPTADA"}).status_code==200
    assert service.respuesta==(9,"ACEPTADA")

def test_contrato_chat_y_lex_coincide_con_frontend():
    client=cliente(create_chat_blueprint(ChatFalso()),create_chatbot_blueprint(LexFalso()))
    message=client.get("/chat/2/mensajes").json["mensajes"][0]
    assert set(message)=={"id","emisorId","receptorId","texto","fechaEnvio"}
    answer=client.post("/chatbot",json={"mensaje":"hola","sesionId":"sesion-1"})
    assert answer.status_code==200 and answer.json=={"respuestas":["Eco: hola"]}

def test_ticket_websocket_firmado_vence_y_no_acepta_tampering():
    secret="clave-local-de-prueba-"*2
    ticket=emitir_ticket(42,secret,now=1000)
    assert validar_ticket(ticket,secret,now=1010)==42
    assert validar_ticket(ticket,secret,now=1031) is None
    assert validar_ticket(ticket+"x",secret,now=1010) is None
