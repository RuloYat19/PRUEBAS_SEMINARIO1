import { errores } from './publicaciones.errors.js';
import {
  crearPublicacionSchema,
  etiquetasQuerySchema,
  feedQuerySchema,
  publicacionIdParamsSchema,
} from './publicaciones.schemas.js';

// El middleware de identidad deja el usuario de RDS en request.usuario.
function usuarioId(request) {
  const id = request.usuario?.id;
  if (!id) throw errores.noAutenticado();
  return id;
}

export class PublicacionesController {
  constructor(publicacionesService) {
    this.publicacionesService = publicacionesService;
  }

  crear = async (request, response) => {
    const data = crearPublicacionSchema.parse(request.body ?? {});
    const publicacion = await this.publicacionesService.crear(usuarioId(request), data);
    response.status(201).json({ publicacion });
  };

  listarFeed = async (request, response) => {
    const { etiqueta } = feedQuerySchema.parse(request.query);
    const publicaciones = await this.publicacionesService.listarFeed(
      usuarioId(request),
      etiqueta,
    );
    response.status(200).json({ publicaciones });
  };

  listarEtiquetas = async (request, response) => {
    const { buscar } = etiquetasQuerySchema.parse(request.query);
    const etiquetas = await this.publicacionesService.listarEtiquetas(
      usuarioId(request),
      buscar,
    );
    response.status(200).json({ etiquetas });
  };

  buscar = async (request, response) => {
    const { id } = publicacionIdParamsSchema.parse(request.params);
    const publicacion = await this.publicacionesService.buscar(usuarioId(request), id);
    response.status(200).json({ publicacion });
  };
}
