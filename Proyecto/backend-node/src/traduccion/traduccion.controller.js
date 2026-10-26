import { errores } from './traduccion.errors.js';
import { traducirSchema } from './traduccion.schemas.js';

export class TraduccionController {
  constructor(traduccionService) {
    this.traduccionService = traduccionService;
  }

  traducir = async (request, response) => {
    if (!request.usuario?.id) throw errores.noAutenticado();
    const { texto, idioma } = traducirSchema.parse(request.body ?? {});
    const traduccion = await this.traduccionService.traducir(texto, idioma);
    response.status(200).json({ traduccion });
  };
}
