import { errores } from './traduccion.errors.js';

export class TraduccionService {
  constructor({ traductor }) {
    this.traductor = traductor;
  }

  async traducir(texto, idioma) {
    try {
      const { texto: traducido, idiomaOrigen } = await this.traductor.traducir(texto, idioma);
      return { texto: traducido, idiomaOrigen, idioma };
    } catch (error) {
      console.error('[traduccion] Translate falló:', error);
      throw errores.translate();
    }
  }
}
