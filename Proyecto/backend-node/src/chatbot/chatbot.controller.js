import { preguntaSchema } from './chatbot.schemas.js';

export class ChatbotController {
  constructor(service) { this.service = service; }
  preguntar = async (request, response) => {
    const { mensaje, sesionId } = preguntaSchema.parse(request.body ?? {});
    const respuestas = await this.service.preguntar(mensaje, sesionId);
    response.status(200).json({ respuestas });
  };
}
