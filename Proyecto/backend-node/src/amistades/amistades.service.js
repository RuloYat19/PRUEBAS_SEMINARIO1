import { erroresAmistades as errores } from './amistades.errors.js';

export class AmistadesService {
  constructor({ repository }) {
    this.repository = repository;
  }

  listarAmigos(usuarioId) { return this.repository.listarAmigos(usuarioId); }
  listarPersonas(usuarioId) { return this.repository.listarPersonas(usuarioId); }
  listarSolicitudes(usuarioId) { return this.repository.listarSolicitudes(usuarioId); }

  async enviarSolicitud(emisorId, receptorId) {
    if (emisorId === receptorId) throw errores.conflicto('No puedes enviarte una solicitud');
    const id = await this.repository.enviarSolicitud(emisorId, receptorId);
    if (!id) throw errores.conflicto('Ya existe una solicitud o amistad entre esos usuarios');
    const solicitud = await this.repository.buscarSolicitud(id);
    if (!solicitud) throw errores.conflicto('El usuario destino no existe');
    return {
      id: solicitud.solicitudId,
      usuario: {
        id: receptorId,
        nombreCompleto: solicitud.nombreCompleto,
        fotoPerfilUrl: solicitud.fotoPerfilUrl,
      },
      fechaSolicitud: solicitud.fechaSolicitud,
    };
  }

  async responderSolicitud(usuarioId, solicitudId, estado) {
    if (!(await this.repository.responderSolicitud(solicitudId, usuarioId, estado))) {
      throw errores.noEncontrado();
    }
  }
}
