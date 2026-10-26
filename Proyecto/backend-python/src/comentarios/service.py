from src.comentarios import errors


class ComentariosService:
    def __init__(self, repository, publicaciones):
        self.repository = repository
        self.publicaciones = publicaciones

    def listar(self, usuario_id, publicacion_id):
        self._exigir_visible(usuario_id, publicacion_id)
        return self.repository.listar(publicacion_id)

    def crear(self, usuario_id, publicacion_id, texto):
        self._exigir_visible(usuario_id, publicacion_id)
        return self.repository.crear(publicacion_id, usuario_id, texto)

    def _exigir_visible(self, usuario_id, publicacion_id):
        if self.publicaciones.buscar_visible(usuario_id, publicacion_id) is None:
            raise errors.publicacion_no_encontrada()
