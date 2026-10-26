import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AmistadesService } from '../src/amistades/amistades.service.js';
import { ChatService } from '../src/chat/chat.service.js';
import { ChatbotService } from '../src/chatbot/chatbot.service.js';
import { IdentidadService } from '../src/identidad/identidad.service.js';

describe('amistades', () => {
  it('bloquea auto-solicitudes y devuelve la solicitud recién creada', async () => {
    const service = new AmistadesService({ repository: {
      async enviarSolicitud() { return 11; },
      async buscarSolicitud() { return { solicitudId: 11, fechaSolicitud: '2026-10-25T12:00:00Z', nombreCompleto: 'Ana', fotoPerfilUrl: 'foto' }; },
    } });
    await assert.rejects(service.enviarSolicitud(1, 1), { statusCode: 409 });
    assert.deepEqual(await service.enviarSolicitud(1, 2), {
      id: 11,
      usuario: { id: 2, nombreCompleto: 'Ana', fotoPerfilUrl: 'foto' },
      fechaSolicitud: '2026-10-25T12:00:00Z',
    });
  });
});

describe('chat', () => {
  it('guarda mensajes solo entre amigos y limpia el texto', async () => {
    let guardado;
    const service = new ChatService({ repository: {
      async sonAmigos() { return true; },
      async crearMensaje(...args) { guardado = args; return { id: 1 }; },
    } });
    assert.deepEqual(await service.enviar(1, 2, '  hola  '), { id: 1 });
    assert.deepEqual(guardado, [1, 2, 'hola']);
  });

  it('rechaza enviar a quien no es amigo', async () => {
    const service = new ChatService({ repository: { async sonAmigos() { return false; } } });
    await assert.rejects(service.enviar(1, 2, 'hola'), { statusCode: 403 });
  });
});

describe('chatbot', () => {
  it('devuelve solo respuestas de texto de Lex', async () => {
    const service = new ChatbotService({ lex: { async reconocerTexto() {
      return { messages: [{ content: 'Respuesta' }, { content: null }] };
    } } });
    assert.deepEqual(await service.preguntar('hola', 'sesion'), ['Respuesta']);
  });
});

describe('identidad', () => {
  it('sincroniza Cognito y RDS al registrar y guarda el MD5 de la contraseña', async () => {
    let creado;
    const service = new IdentidadService({
      config: { S3_PUBLIC_URL: 'https://bucket.example' },
      cognito: {
        async registrar() { return { UserSub: 'sub-1' }; },
        async eliminarUsuario() {},
      },
      repository: { async crear(row) { creado = row; } },
    });
    await service.registrar({ correo: 'ana@example.com', password: 'Demo1234!', nombreCompleto: 'Ana', dpi: '1234567890123', fotoPerfilKey: 'Fotos_Perfil/a.jpg' });
    assert.equal(creado.cognitoSub, 'sub-1');
    assert.equal(creado.passwordMd5, 'eb6bc90afb1de3b7e8a41c1afa38ee01');
    assert.equal(creado.fotoPerfilUrl, 'https://bucket.example/Fotos_Perfil/a.jpg');
  });

  it('compensa Cognito si falla la escritura en RDS', async () => {
    let eliminado = false;
    const service = new IdentidadService({
      config: { S3_PUBLIC_URL: 'https://bucket.example' },
      cognito: {
        async registrar() { return { UserSub: 'sub-1' }; },
        async eliminarUsuario() { eliminado = true; },
      },
      repository: { async crear() { throw new Error('db down'); } },
    });
    await assert.rejects(service.registrar({ correo: 'ana@example.com', password: 'Demo1234!', nombreCompleto: 'Ana', dpi: '1234567890123', fotoPerfilKey: 'Fotos_Perfil/a.jpg' }), /db down/);
    assert.equal(eliminado, true);
  });

  it('usa CUSTOM_AUTH, responde al desafío con la imagen y verifica el access token en RDS', async () => {
    const llamadas = [];
    const borradas = [];
    const service = new IdentidadService({
      config: { S3_PUBLIC_URL: 'https://bucket.example' },
      cognito: {
        async iniciarLoginFacial(correo) { llamadas.push(['start', correo]); return { ChallengeName: 'CUSTOM_CHALLENGE', Session: 'session' }; },
        async responderDesafioFacial(datos) { llamadas.push(['challenge', datos]); return { AuthenticationResult: { AccessToken: 'access' } }; },
        async obtenerUsuario(token) { assert.equal(token, 'access'); return { UserAttributes: [{ Name: 'sub', Value: 'sub-1' }] }; },
      },
      repository: { async buscarPorCognitoSub(sub) { assert.equal(sub, 'sub-1'); return { id: 1 }; } },
      challengeImageStore: {
        async guardar(bytes, contentType) {
          assert.equal(bytes.toString(), 'face');
          assert.equal(contentType, 'image/jpeg');
          return 'Fotos_Desafios/id.jpg';
        },
        async eliminar(key) { borradas.push(key); },
      },
    });
    const dataUrl = `data:image/jpeg;base64,${Buffer.from('face').toString('base64')}`;
    assert.equal(await service.iniciarConRostro('ana@example.com', dataUrl), 'access');
    assert.deepEqual(llamadas, [
      ['start', 'ana@example.com'],
      ['challenge', { correo: 'ana@example.com', imagenKey: 'Fotos_Desafios/id.jpg', session: 'session' }],
    ]);
    assert.deepEqual(borradas, ['Fotos_Desafios/id.jpg']);
  });

  it('devuelve el access token de Cognito tras comprobar que el sub existe en RDS', async () => {
    const service = new IdentidadService({
      config: { S3_PUBLIC_URL: 'https://bucket.example' },
      cognito: {
        async iniciarConPassword(correo, password) {
          assert.deepEqual([correo, password], ['ana@example.com', 'Demo1234!']);
          return { AuthenticationResult: { AccessToken: 'access' } };
        },
        async obtenerUsuario() { return { UserAttributes: [{ Name: 'sub', Value: 'sub-1' }] }; },
      },
      repository: { async buscarPorCognitoSub(sub) { return sub === 'sub-1' ? { id: 1 } : null; } },
    });
    assert.equal(await service.iniciarConPassword('ana@example.com', 'Demo1234!'), 'access');
  });

  it('marca como no verificada la cuenta Cognito pendiente de confirmación', async () => {
    const service = new IdentidadService({
      config: { S3_PUBLIC_URL: 'https://bucket.example' },
      cognito: { async iniciarConPassword() { throw Object.assign(new Error(), { name: 'UserNotConfirmedException' }); } },
      repository: {},
    });
    await assert.rejects(service.iniciarConPassword('ana@example.com', 'Demo1234!'), { statusCode: 403 });
  });
});
