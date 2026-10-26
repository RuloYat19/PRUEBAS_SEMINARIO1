import { errores } from './publicaciones.errors.js';

// Rekognition responde con estos errores cuando el problema es la imagen
// (no existe en S3, formato no soportado, demasiado grande), no el servicio.
const ERRORES_DE_IMAGEN = new Set([
  'InvalidS3ObjectException',
  'InvalidImageFormatException',
  'ImageTooLargeException',
  'InvalidParameterException',
]);

export class PublicacionesService {
  constructor({ repository, etiquetador, s3PublicUrl }) {
    this.repository = repository;
    this.etiquetador = etiquetador;
    this.s3PublicUrl = s3PublicUrl.replace(/\/+$/, '');
  }

  async crear(usuarioId, { imagenKey, descripcion }) {
    let etiquetas;
    try {
      etiquetas = await this.etiquetador.detectarEtiquetas(imagenKey);
    } catch (error) {
      if (ERRORES_DE_IMAGEN.has(error.name)) {
        throw errores.validacion('La imagen no existe en S3 o no es válida');
      }
      console.error('[publicaciones] Rekognition falló:', error);
      throw errores.rekognition();
    }

    const publicacionId = await this.repository.crear({
      usuarioId,
      descripcion,
      imagenUrl: `${this.s3PublicUrl}/${imagenKey}`,
      imagenKey,
      etiquetas,
    });
    return this.repository.buscarVisible(usuarioId, publicacionId);
  }

  listarFeed(usuarioId, etiqueta) {
    return this.repository.listarFeed(usuarioId, etiqueta);
  }

  listarEtiquetas(usuarioId, buscar) {
    return this.repository.listarEtiquetas(usuarioId, buscar);
  }

  async buscar(usuarioId, publicacionId) {
    const publicacion = await this.repository.buscarVisible(usuarioId, publicacionId);
    if (!publicacion) throw errores.noEncontrada();
    return publicacion;
  }
}
