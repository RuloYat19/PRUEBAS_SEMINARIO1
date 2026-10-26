import { createHash, timingSafeEqual } from 'node:crypto';
import { errores } from './perfil.errors.js';

function passwordCoincide(password, md5Guardado) {
  const calculado = Buffer.from(createHash('md5').update(password).digest('hex'));
  const guardado = Buffer.from(md5Guardado);
  return calculado.length === guardado.length && timingSafeEqual(calculado, guardado);
}

export class PerfilService {
  constructor({ repository, cognito, s3PublicUrl }) {
    this.repository = repository;
    this.cognito = cognito;
    this.s3PublicUrl = s3PublicUrl.replace(/\/+$/, '');
  }

  async obtener(usuarioId) {
    const perfil = await this.repository.buscar(usuarioId);
    if (!perfil) throw errores.noEncontrado();
    return perfil;
  }

  async actualizar(usuarioId, { nombreCompleto, dpi, fotoPerfilKey, password }) {
    const actual = await this.repository.buscarParaActualizar(usuarioId);
    if (!actual) throw errores.noEncontrado();
    if (!passwordCoincide(password, actual.passwordMd5)) throw errores.passwordIncorrecta();
    if (await this.repository.dpiDeOtroUsuario(dpi, usuarioId)) throw errores.dpiEnUso();

    try {
      await this.cognito.actualizarAtributos(actual.correo, {
        nombreCompleto,
        dpi,
        fotoPerfilKey: fotoPerfilKey ?? actual.fotoPerfilKey,
      });
    } catch (error) {
      console.error('[perfil] Cognito falló:', error);
      throw errores.cognito();
    }

    try {
      await this.repository.actualizar(usuarioId, {
        nombreCompleto,
        dpi,
        fotoPerfilKey,
        fotoPerfilUrl: fotoPerfilKey ? `${this.s3PublicUrl}/${fotoPerfilKey}` : undefined,
      });
    } catch (error) {
      await this.#restaurarCognito(actual);
      if (error.code === 'ER_DUP_ENTRY') throw errores.dpiEnUso();
      throw error;
    }

    return this.obtener(usuarioId);
  }

  async #restaurarCognito({ correo, nombreCompleto, dpi, fotoPerfilKey }) {
    try {
      await this.cognito.actualizarAtributos(correo, {
        nombreCompleto,
        dpi,
        fotoPerfilKey,
      });
    } catch (error) {
      console.error('[perfil] No se pudo restaurar Cognito tras fallar RDS:', error);
    }
  }
}
