from src.chat import errors
class ChatService:
    def __init__(self,repository): self.repository=repository
    def _exigir_amigos(self,a,b):
        if a==b or not self.repository.es_amigo(a,b): raise errors.no_amigo()
    def historial(self,a,b,desde_id=0):
        self._exigir_amigos(a,b); return self.repository.historial(a,b,desde_id)
    def enviar(self,a,b,texto):
        self._exigir_amigos(a,b); return self.repository.enviar(a,b,texto)
    def recibidos(self,usuario_id,desde_id): return self.repository.recibidos(usuario_id,desde_id)
    def ultimo_id(self,usuario_id): return self.repository.ultimo_id(usuario_id)
