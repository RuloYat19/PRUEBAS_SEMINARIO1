import { enviarSolicitudSchema, responderSolicitudSchema } from './amistades.schemas.js';
import { erroresAmistades as errores } from './amistades.errors.js';

function usuarioId(request) {
  const id = request.usuario?.id;
  if (!id) throw errores.noAutenticado();
  return id;
}

export class AmistadesController {
  constructor(service) { this.service = service; }

  listar = async (request, response) => response.status(200).json({ amigos: await this.service.listarAmigos(usuarioId(request)) });
  personas = async (request, response) => response.status(200).json({ usuarios: await this.service.listarPersonas(usuarioId(request)) });
  solicitudes = async (request, response) => response.status(200).json(await this.service.listarSolicitudes(usuarioId(request)));

  enviar = async (request, response) => {
    const { receptorId } = enviarSolicitudSchema.parse(request.body ?? {});
    const solicitud = await this.service.enviarSolicitud(usuarioId(request), receptorId);
    response.status(201).json({ solicitud });
  };

  responder = async (request, response) => {
    const { id, estado } = responderSolicitudSchema.parse({
      id: request.params.id,
      estado: request.body?.estado,
    });
    await this.service.responderSolicitud(usuarioId(request), id, estado);
    response.sendStatus(204);
  };
}
