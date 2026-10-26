import {
  correoSchema,
  loginFacialSchema,
  loginSchema,
  registroSchema,
  verificarSchema,
} from './identidad.schemas.js';

export class IdentidadController {
  constructor(service) {
    this.service = service;
  }

  registrar = async (request, response) => {
    const data = registroSchema.parse(request.body ?? {});
    await this.service.registrar(data);
    response.sendStatus(201);
  };

  verificar = async (request, response) => {
    const { correo, codigo } = verificarSchema.parse(request.body ?? {});
    await this.service.verificar(correo, codigo);
    response.sendStatus(204);
  };

  reenviarCodigo = async (request, response) => {
    const { correo } = correoSchema.parse(request.body ?? {});
    await this.service.reenviarCodigo(correo);
    response.sendStatus(204);
  };

  login = async (request, response) => {
    const { correo, password } = loginSchema.parse(request.body ?? {});
    const token = await this.service.iniciarConPassword(correo, password);
    response.status(200).json({ token });
  };

  loginFacial = async (request, response) => {
    const { correo, imagen } = loginFacialSchema.parse(request.body ?? {});
    const token = await this.service.iniciarConRostro(correo, imagen);
    response.status(200).json({ token });
  };
}
