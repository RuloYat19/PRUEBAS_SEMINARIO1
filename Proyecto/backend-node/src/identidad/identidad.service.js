import { createHash } from 'node:crypto';
import { erroresIdentidad as errores } from './identidad.errors.js';

function mapearErrorCognito(error) {
  if (error.name === 'UsernameExistsException') return errores.correoEnUso();
  if (error.name === 'UserNotConfirmedException') return errores.correoNoVerificado();
  if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') return errores.credenciales();
  if (error.name === 'CodeMismatchException' || error.name === 'ExpiredCodeException' || error.name === 'InvalidParameterException') {
    return errores.datosInvalidos('El código de verificación no es válido o venció');
  }
  return errores.cognito();
}

export class IdentidadService {
  constructor({ repository, cognito, config, challengeImageStore }) {
    this.repository = repository;
    this.cognito = cognito;
    this.config = config;
    this.challengeImageStore = challengeImageStore;
  }

  async registrar(datos) {
    let respuesta;
    try {
      respuesta = await this.cognito.registrar(datos);
    } catch (error) {
      throw mapearErrorCognito(error);
    }

    try {
      await this.repository.crear({
        cognitoSub: respuesta.UserSub,
        nombreCompleto: datos.nombreCompleto,
        correo: datos.correo,
        dpi: datos.dpi,
        passwordMd5: createHash('md5').update(datos.password).digest('hex'),
        fotoPerfilKey: datos.fotoPerfilKey,
        fotoPerfilUrl: `${this.config.S3_PUBLIC_URL.replace(/\/+$/, '')}/${datos.fotoPerfilKey}`,
      });
    } catch (error) {
      try {
        await this.cognito.eliminarUsuario(datos.correo);
      } catch (cleanupError) {
        console.error('[identidad] No se pudo compensar el usuario en Cognito:', cleanupError);
      }
      if (error.code === 'ER_DUP_ENTRY') {
        const [byEmail, byDpi] = await Promise.all([
          this.repository.buscarPorCorreo(datos.correo),
          this.repository.existeDpi?.(datos.dpi),
        ]);
        if (byEmail) throw errores.correoEnUso();
        if (byDpi) throw errores.dpiEnUso();
        throw errores.correoEnUso();
      }
      throw error;
    }
  }

  async verificar(correo, codigo) {
    try {
      await this.cognito.verificar(correo, codigo);
    } catch (error) {
      throw mapearErrorCognito(error);
    }
  }

  async reenviarCodigo(correo) {
    try {
      await this.cognito.reenviarCodigo(correo);
    } catch (error) {
      throw mapearErrorCognito(error);
    }
  }

  async iniciarConPassword(correo, password) {
    let resultado;
    try {
      resultado = await this.cognito.iniciarConPassword(correo, password);
    } catch (error) {
      throw mapearErrorCognito(error);
    }
    const token = resultado.AuthenticationResult?.AccessToken;
    if (!token) throw errores.credenciales();
    await this.#validarCuentaEnRds(token);
    return token;
  }

  async iniciarConRostro(correo, imagenDataUrl) {
    const [header, contenido] = imagenDataUrl.split(',', 2);
    const contentType = header === 'data:image/png;base64' ? 'image/png' : 'image/jpeg';
    const bytes = Buffer.from(contenido, 'base64');
    if (bytes.length > 4 * 1024 * 1024) {
      throw errores.datosInvalidos('La imagen no puede superar 4 MB');
    }
    let desafio;
    let imagenKey;
    try {
      desafio = await this.cognito.iniciarLoginFacial(correo);
      if (desafio.ChallengeName !== 'CUSTOM_CHALLENGE' || !desafio.Session) throw errores.rostroNoCoincide();
      imagenKey = await this.challengeImageStore.guardar(bytes, contentType);
      const resultado = await this.cognito.responderDesafioFacial({ correo, imagenKey, session: desafio.Session });
      const token = resultado.AuthenticationResult?.AccessToken;
      if (!token) throw errores.rostroNoCoincide();
      await this.#validarCuentaEnRds(token);
      return token;
    } catch (error) {
      if (error.statusCode) throw error;
      if (error.name === 'UserNotConfirmedException') throw errores.correoNoVerificado();
      if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') throw errores.rostroNoCoincide();
      throw errores.cognito();
    } finally {
      if (imagenKey) {
        try {
          await this.challengeImageStore.eliminar(imagenKey);
        } catch (error) {
          console.error('[identidad] No se pudo borrar la imagen facial temporal:', error);
        }
      }
    }
  }

  async #validarCuentaEnRds(token) {
    let usuario;
    try {
      usuario = await this.cognito.obtenerUsuario(token);
    } catch {
      throw errores.credenciales();
    }
    const sub = usuario.UserAttributes?.find(({ Name }) => Name === 'sub')?.Value;
    if (!sub || !(await this.repository.buscarPorCognitoSub(sub))) throw errores.credenciales();
  }
}
