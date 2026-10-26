import { erroresChat as errores } from './chat.errors.js';

export class ChatService {
  constructor({ repository }) { this.repository = repository; }

  async listarMensajes(usuarioId, amigoId) {
    await this.#exigirAmistad(usuarioId, amigoId);
    return this.repository.listarMensajes(usuarioId, amigoId);
  }

  async enviar(usuarioId, receptorId, texto) {
    const limpio = texto.trim();
    if (!limpio || limpio.length > 2000) throw errores.mensajeInvalido();
    await this.#exigirAmistad(usuarioId, receptorId);
    return this.repository.crearMensaje(usuarioId, receptorId, limpio);
  }

  async #exigirAmistad(usuarioId, amigoId) {
    if (usuarioId === amigoId || !(await this.repository.sonAmigos(usuarioId, amigoId))) {
      throw errores.noAmigo();
    }
  }
}
