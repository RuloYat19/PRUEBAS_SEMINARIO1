from mysql.connector.errors import IntegrityError
from src.amistades import errors

class AmistadesService:
    def __init__(self, repository): self.repository=repository
    def usuarios(self, usuario_id): return self.repository.listar_usuarios(usuario_id)
    def solicitudes(self, usuario_id): return self.repository.listar_solicitudes(usuario_id)
    def amigos(self, usuario_id): return self.repository.listar_amigos(usuario_id)
    def enviar(self, emisor_id, receptor_id):
        if emisor_id == receptor_id: raise errors.validacion("No puedes enviarte una solicitud a ti mismo")
        pareja=self.repository.buscar_pareja(emisor_id,receptor_id)
        if pareja and pareja["estado"] == "ACEPTADA": raise errors.conflicto("Ya son amigos")
        if pareja and pareja["estado"] == "PENDIENTE":
            if pareja["emisorId"] == receptor_id: raise errors.conflicto("Ya tienes una solicitud pendiente de este usuario")
            raise errors.conflicto()
        try: solicitud=self.repository.crear_o_reenviar(emisor_id,receptor_id)
        except IntegrityError as exc: raise errors.conflicto() from exc
        return solicitud
    def responder(self, usuario_id, solicitud_id, estado):
        if not self.repository.responder(solicitud_id,usuario_id,estado):
            raise errors.no_encontrada()
