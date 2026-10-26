export class ChatbotError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ChatbotError';
    this.statusCode = statusCode;
  }
}

export const erroresChatbot = {
  invalid: () => new ChatbotError(400, 'mensaje y sesionId son obligatorios'),
  lex: () => new ChatbotError(502, 'No se pudo consultar al chatbot'),
};
