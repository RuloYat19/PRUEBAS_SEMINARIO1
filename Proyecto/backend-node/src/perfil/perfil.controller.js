import { errores } from './perfil.errors.js';
import { actualizarPerfilSchema } from './perfil.schemas.js';

function usuarioId(request) {
  const id = request.usuario?.id;
  if (!id) throw errores.noAutenticado();
  return id;
}

export class PerfilController {
  constructor(perfilService) {
    this.perfilService = perfilService;
  }

  obtener = async (request, response) => {
    const perfil = await this.perfilService.obtener(usuarioId(request));
    response.status(200).json({ perfil });
  };

  actualizar = async (request, response) => {
    const id = usuarioId(request);
    const datos = actualizarPerfilSchema.parse(request.body ?? {});
    const perfil = await this.perfilService.actualizar(id, datos);
    response.status(200).json({ perfil });
  };
}
