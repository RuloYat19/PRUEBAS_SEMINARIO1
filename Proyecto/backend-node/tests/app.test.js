import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTokenAuthenticator } from '../src/identidad/auth.middleware.js';

const services = {
  identidad: {}, amistades: {}, publicaciones: {}, comentarios: {}, perfil: {},
  traduccion: {}, chat: {}, chatbot: {},
};

describe('app backend-node', () => {
  it('expone el health check sin requerir token y aplica CORS al sitio permitido', async () => {
    const app = createApp({ services, requireAuth: (_req, _res, next) => next(), corsOrigins: ['http://localhost:5173'] });
    const response = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok', backend: 'node' });
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  it('rechaza origen no permitido y responde preflight sin ruta', async () => {
    const app = createApp({ services, requireAuth: (_req, _res, next) => next(), corsOrigins: ['http://localhost:5173'] });
    const response = await request(app).options('/auth/login').set('Origin', 'https://example.invalid');
    assert.equal(response.status, 204);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });
});

describe('middleware Cognito a RDS', () => {
  it('coloca en req.usuario el id de RDS derivado del sub verificado', async () => {
    let encontrado;
    const auth = createTokenAuthenticator({
      cognito: { async obtenerUsuario(token) { assert.equal(token, 'valid'); return { UserAttributes: [{ Name: 'sub', Value: 'cognito-sub' }] }; } },
      repository: { async buscarPorCognitoSub(sub) { encontrado = sub; return { id: 42 }; } },
    });
    const app = express();
    app.get('/privado', auth, (req, res) => res.json({ id: req.usuario.id }));
    const response = await request(app).get('/privado').set('Authorization', 'Bearer valid');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { id: 42 });
    assert.equal(encontrado, 'cognito-sub');
  });

  it('rechaza token ausente, inválido y sub que no está en RDS', async () => {
    const auth = createTokenAuthenticator({
      cognito: { async obtenerUsuario(token) {
        if (token === 'bad') throw Object.assign(new Error('invalid token'), { name: 'NotAuthorizedException' });
        return { UserAttributes: [{ Name: 'sub', Value: 'unknown' }] };
      } },
      repository: { async buscarPorCognitoSub() { return null; } },
    });
    const app = express();
    app.get('/privado', auth, (_req, res) => res.sendStatus(204));
    assert.equal((await request(app).get('/privado')).status, 401);
    assert.equal((await request(app).get('/privado').set('Authorization', 'Bearer bad')).status, 401);
    assert.equal((await request(app).get('/privado').set('Authorization', 'Bearer unknown')).status, 401);
  });
});
