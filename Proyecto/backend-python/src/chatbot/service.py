import logging
import uuid
from src.chatbot import errors
logger=logging.getLogger(__name__)
class ChatbotService:
    def __init__(self,lex_client,bot_id,alias_id,locale):
        self.lex=lex_client; self.bot_id=bot_id; self.alias_id=alias_id; self.locale=locale
    def enviar(self,texto,session_id=None):
        session_id=session_id or str(uuid.uuid4())
        try:
            respuesta=self.lex.recognize_text(botId=self.bot_id,botAliasId=self.alias_id,localeId=self.locale,sessionId=session_id,text=texto)
        except Exception as exc:
            logger.exception("[chatbot] Lex RecognizeText falló")
            raise errors.lex() from exc
        textos=[m.get("content","") for m in respuesta.get("messages",[]) if m.get("contentType")=="PlainText" and m.get("content")]
        return textos or ["No entendí la pregunta. ¿Puedes expresarla de otra forma?"]
