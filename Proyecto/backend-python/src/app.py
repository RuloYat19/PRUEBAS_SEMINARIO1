import os
from flask import Flask,jsonify
from flask_sock import Sock
from src.config import AWS_REGION,COGNITO_USER_POOL_ID,COGNITO_CLIENT_ID,COGNITO_CLIENT_SECRET,FACIAL_AUTH_SECRET,LEX_BOT_ID,LEX_BOT_ALIAS_ID,LEX_LOCALE,S3_BUCKET,S3_PUBLIC_URL,CORS_ORIGINS
from src.infrastructure.database.pool import crear_pool
from src.infrastructure.aws.lex import LexConversaciones
from src.shared.auth import instalar_autenticacion
from src.amistades.repository import AmistadesRepository
from src.amistades.service import AmistadesService
from src.amistades.routes import create_amistades_blueprint
from src.chat.repository import ChatRepository
from src.chat.service import ChatService
from src.chat.routes import create_chat_blueprint
from src.chatbot.service import ChatbotService
from src.chatbot.routes import create_chatbot_blueprint
from src.infrastructure.aws.cognito import CuentasCognito
from src.infrastructure.aws.rekognition import Etiquetador
from src.infrastructure.aws.translate import Traductor
from src.perfil.repository import PerfilRepository
from src.perfil.service import PerfilService
from src.perfil.routes import create_perfil_blueprint
from src.publicaciones.repository import PublicacionesRepository
from src.publicaciones.service import PublicacionesService
from src.publicaciones.routes import create_publicaciones_blueprint
from src.comentarios.repository import ComentariosRepository
from src.comentarios.service import ComentariosService
from src.comentarios.routes import create_comentarios_blueprint
from src.traduccion.service import TraduccionService
from src.traduccion.routes import create_traduccion_blueprint
from src.identidad.repository import IdentidadRepository
from src.identidad.service import IdentidadService
from src.identidad.controller import create_identidad_blueprint

def create_app(pool=None,lex_client=None):
    app=Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"]=6*1024*1024
    pool=pool or crear_pool()
    lex_client=lex_client or LexConversaciones(AWS_REGION)
    obtener_conexion=pool.get_connection
    instalar_autenticacion(app,obtener_conexion,CORS_ORIGINS)
    sock=Sock(app)
    cognito=CuentasCognito(AWS_REGION,COGNITO_USER_POOL_ID,COGNITO_CLIENT_ID,COGNITO_CLIENT_SECRET)
    etiquetador=Etiquetador(AWS_REGION,S3_BUCKET)
    perfil=PerfilService(PerfilRepository(obtener_conexion),cognito,S3_PUBLIC_URL)
    publicaciones_repo=PublicacionesRepository(obtener_conexion)
    publicaciones=PublicacionesService(publicaciones_repo,etiquetador,S3_PUBLIC_URL)
    identidad=IdentidadService(IdentidadRepository(obtener_conexion),cognito,etiquetador,S3_BUCKET,S3_PUBLIC_URL,FACIAL_AUTH_SECRET)
    comentarios=ComentariosService(ComentariosRepository(obtener_conexion),publicaciones_repo)
    traduccion=TraduccionService(Traductor(AWS_REGION))
    amistades=AmistadesService(AmistadesRepository(obtener_conexion))
    chat=ChatService(ChatRepository(obtener_conexion))
    chatbot=ChatbotService(lex_client,LEX_BOT_ID,LEX_BOT_ALIAS_ID,LEX_LOCALE)
    app.register_blueprint(create_amistades_blueprint(amistades))
    app.register_blueprint(create_chat_blueprint(chat,sock))
    app.register_blueprint(create_chatbot_blueprint(chatbot))
    app.register_blueprint(create_identidad_blueprint(identidad))
    app.register_blueprint(create_perfil_blueprint(perfil))
    app.register_blueprint(create_publicaciones_blueprint(publicaciones))
    app.register_blueprint(create_comentarios_blueprint(comentarios))
    app.register_blueprint(create_traduccion_blueprint(traduccion))
    @app.get("/health")
    def health(): return jsonify({"status":"ok","backend":"python"}),200
    return app

if __name__=="__main__":
    create_app().run(host="0.0.0.0",port=int(os.getenv("PORT","3000")))
