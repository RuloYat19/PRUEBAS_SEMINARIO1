import { amigoIdSchema } from './chat.schemas.js';
import { erroresChat as errores } from './chat.errors.js';

export class ChatController {
  constructor(service) { this.service = service; }
  historial = async (request, response) => {
    if (!request.usuario?.id) throw errores.noAutenticado();
    const amigoId = amigoIdSchema.parse(request.params.amigoId);
    const mensajes = await this.service.listarMensajes(request.usuario.id, amigoId);
    response.status(200).json({ mensajes });
  };
}
