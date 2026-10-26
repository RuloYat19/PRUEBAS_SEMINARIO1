import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { createTraduccionRouter } from '../src/traduccion/traduccion.routes.js';
import { TraduccionService } from '../src/traduccion/traduccion.service.js';

let traductor;

function crearApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = Number(req.get('x-test-usuario'));
    if (id) req.usuario = { id };
    next();
  });
  app.use('/traducciones', createTraduccionRouter(new TraduccionService({ traductor })));
  return app;
}

const comoUsuario = { 'x-test-usuario': '1' };

beforeEach(() => {
  traductor = {
    llamadas: [],
    error: null,
    async traducir(texto, idioma) {
      this.llamadas.push({ texto, idioma });
      if (this.error) throw this.error;
      return { texto: `[${idioma}] ${texto}`, idiomaOrigen: 'es' };
    },
  };
});

describe('POST /traducciones', () => {
  it('traduce con detección automática y devuelve la forma del contrato', async () => {
    const res = await request(crearApp())
      .post('/traducciones')
      .set(comoUsuario)
      .send({ texto: '  Hola mundo  ', idioma: 'en' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { traduccion: { texto: '[en] Hola mundo', idiomaOrigen: 'es', idioma: 'en' } });
    assert.deepEqual(traductor.llamadas, [{ texto: 'Hola mundo', idioma: 'en' }]);
  });

  it('acepta francés y portugués', async () => {
    for (const idioma of ['fr', 'pt']) {
      const res = await request(crearApp()).post('/traducciones').set(comoUsuario).send({ texto: 'Hola', idioma });
      assert.equal(res.status, 200);
      assert.equal(res.body.traduccion.idioma, idioma);
    }
  });

  it('rechaza un idioma fuera de en, fr y pt sin llamar a Translate', async () => {
    const res = await request(crearApp()).post('/traducciones').set(comoUsuario).send({ texto: 'Hola', idioma: 'de' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'idioma debe ser en, fr o pt' });
    assert.equal(traductor.llamadas.length, 0);
  });

  it('rechaza un texto vacío', async () => {
    const res = await request(crearApp()).post('/traducciones').set(comoUsuario).send({ texto: '  ', idioma: 'en' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El texto no puede estar vacío' });
  });

  it('rechaza un texto de más de 5000 caracteres', async () => {
    const res = await request(crearApp())
      .post('/traducciones')
      .set(comoUsuario)
      .send({ texto: 'a'.repeat(5001), idioma: 'en' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El texto no puede pasar de 5000 caracteres' });
  });

  it('responde 400 si el cuerpo no es un objeto', async () => {
    const res = await request(crearApp()).post('/traducciones').set(comoUsuario).send(['Hola']);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El cuerpo debe ser un objeto JSON' });
  });

  it('responde 502 si Translate falla', async () => {
    traductor.error = new Error('ServiceUnavailableException');
    const res = await request(crearApp()).post('/traducciones').set(comoUsuario).send({ texto: 'Hola', idioma: 'en' });
    assert.equal(res.status, 502);
    assert.deepEqual(res.body, { error: 'No se pudo traducir el texto' });
  });

  it('responde 401 sin usuario autenticado y no llama a Translate', async () => {
    const res = await request(crearApp()).post('/traducciones').send({ texto: 'Hola', idioma: 'en' });
    assert.equal(res.status, 401);
    assert.equal(traductor.llamadas.length, 0);
  });
});
