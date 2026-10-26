import { errores } from './comentarios.errors.js';

export class ComentariosService {
  constructor({ repository, publicaciones }) {
    this.repository = repository;
    this.publicaciones = publicaciones;
  }

  async listar(usuarioId, publicacionId) {
    await this.#exigirVisible(usuarioId, publicacionId);
    return this.repository.listar(publicacionId);
  }

  async crear(usuarioId, publicacionId, texto) {
    await this.#exigirVisible(usuarioId, publicacionId);
    return this.repository.crear({ publicacionId, usuarioId, texto });
  }

  async #exigirVisible(usuarioId, publicacionId) {
    const publicacion = await this.publicaciones.buscarVisible(usuarioId, publicacionId);
    if (!publicacion) throw errores.publicacionNoEncontrada();
  }
}
