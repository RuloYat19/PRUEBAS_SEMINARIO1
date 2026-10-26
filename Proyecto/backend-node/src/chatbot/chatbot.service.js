import { erroresChatbot as errores } from './chatbot.errors.js';

export class ChatbotService {
  constructor({ lex }) { this.lex = lex; }

  async preguntar(mensaje, sesionId) {
    try {
      const resultado = await this.lex.reconocerTexto(mensaje, sesionId);
      const respuestas = (resultado.messages ?? [])
        .map(({ content }) => content)
        .filter((content) => typeof content === 'string' && content.length > 0);
      return respuestas;
    } catch (error) {
      console.error('[chatbot] Lex falló:', error);
      throw errores.lex();
    }
  }
}
