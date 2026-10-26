import { errores } from './comentarios.errors.js';
import { crearComentarioSchema, publicacionIdParamsSchema } from './comentarios.schemas.js';

function usuarioId(request) {
  const id = request.usuario?.id;
  if (!id) throw errores.noAutenticado();
  return id;
}

export class ComentariosController {
  constructor(comentariosService) {
    this.comentariosService = comentariosService;
  }

  listar = async (request, response) => {
    const { publicacionId } = publicacionIdParamsSchema.parse(request.params);
    const comentarios = await this.comentariosService.listar(usuarioId(request), publicacionId);
    response.status(200).json({ comentarios });
  };

  crear = async (request, response) => {
    const id = usuarioId(request);
    const { publicacionId } = publicacionIdParamsSchema.parse(request.params);
    const { texto } = crearComentarioSchema.parse(request.body ?? {});
    const comentario = await this.comentariosService.crear(id, publicacionId, texto);
    response.status(201).json({ comentario });
  };
}
