import { loadConfig } from './config/env.js';
import { createDatabasePool } from './infrastructure/database/pool.js';
import { createCognito } from './infrastructure/aws/cognito.js';
import { createEtiquetador } from './infrastructure/aws/rekognition.js';
import { createTraductor } from './infrastructure/aws/translate.js';
import { createLexBot } from './infrastructure/aws/lex.js';
import { createChallengeImageStore } from './infrastructure/aws/s3.js';
import { createTokenAuthenticator } from './identidad/auth.middleware.js';
import { IdentidadRepository } from './identidad/identidad.repository.js';
import { IdentidadService } from './identidad/identidad.service.js';
import { AmistadesRepository } from './amistades/amistades.repository.js';
import { AmistadesService } from './amistades/amistades.service.js';
import { PublicacionesRepository } from './publicaciones/publicaciones.repository.js';
import { PublicacionesService } from './publicaciones/publicaciones.service.js';
import { ComentariosRepository } from './comentarios/comentarios.repository.js';
import { ComentariosService } from './comentarios/comentarios.service.js';
import { PerfilRepository } from './perfil/perfil.repository.js';
import { PerfilService } from './perfil/perfil.service.js';
import { TraduccionService } from './traduccion/traduccion.service.js';
import { ChatRepository } from './chat/chat.repository.js';
import { ChatService } from './chat/chat.service.js';
import { ChatbotService } from './chatbot/chatbot.service.js';

export function createContainer({ config = loadConfig(), pool = createDatabasePool(config), aws = {} } = {}) {
  const cognito = aws.cognito ?? createCognito(config);
  const repository = new IdentidadRepository(pool);
  const identidad = new IdentidadService({
    repository,
    cognito,
    config,
    challengeImageStore: aws.challengeImageStore ?? createChallengeImageStore(config),
  });
  const publicacionesRepository = new PublicacionesRepository(pool);
  const publicaciones = new PublicacionesService({
    repository: publicacionesRepository,
    etiquetador: aws.etiquetador ?? createEtiquetador(config),
    s3PublicUrl: config.S3_PUBLIC_URL,
  });
  const amistades = new AmistadesService({ repository: new AmistadesRepository(pool) });
  const comentarios = new ComentariosService({
    repository: new ComentariosRepository(pool),
    publicaciones: publicacionesRepository,
  });
  const perfil = new PerfilService({
    repository: new PerfilRepository(pool),
    cognito,
    s3PublicUrl: config.S3_PUBLIC_URL,
  });
  const traduccion = new TraduccionService({ traductor: aws.traductor ?? createTraductor(config) });
  const chatRepository = new ChatRepository(pool);
  const chat = new ChatService({ repository: chatRepository });
  const chatbot = new ChatbotService({ lex: aws.lex ?? createLexBot(config) });

  return {
    config,
    pool,
    services: { identidad, amistades, publicaciones, comentarios, perfil, traduccion, chat, chatbot },
    requireAuth: createTokenAuthenticator({ cognito, repository }),
    close: () => pool.end(),
    chatRepository,
  };
}
