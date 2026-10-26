import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { ComentariosRepository } from '../src/comentarios/comentarios.repository.js';
import { createComentariosRouter } from '../src/comentarios/comentarios.routes.js';
import { ComentariosService } from '../src/comentarios/comentarios.service.js';
import { PublicacionesRepository } from '../src/publicaciones/publicaciones.repository.js';

const SEED = new URL('../../database/seed.sql', import.meta.url);

const conexionDb = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'semisocial',
  timezone: 'Z',
};

let pool;

function crearApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = Number(req.get('x-test-usuario'));
    if (id) req.usuario = { id };
    next();
  });
  const service = new ComentariosService({
    repository: new ComentariosRepository(pool),
    publicaciones: new PublicacionesRepository(pool),
  });
  app.use('/publicaciones/:publicacionId/comentarios', createComentariosRouter(service));
  return app;
}

const como = (usuarioId) => ({ 'x-test-usuario': String(usuarioId) });

async function contarComentarios() {
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM comentario');
  return Number(total);
}

before(async () => {
  pool = mysql.createPool(conexionDb);
});

beforeEach(async () => {
  const seed = await readFile(SEED, 'utf8');
  const conexion = await mysql.createConnection({ ...conexionDb, multipleStatements: true });
  await conexion.query(seed);
  await conexion.end();
});

after(async () => {
  await pool.end();
});

describe('GET /publicaciones/:id/comentarios', () => {
  it('devuelve los comentarios del más antiguo al más reciente con la forma del contrato', async () => {
    const res = await request(crearApp()).get('/publicaciones/1/comentarios').set(como(2));
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.comentarios.map((c) => c.id),
      [1, 2, 3],
    );
    assert.deepEqual(res.body.comentarios[0], {
      id: 1,
      texto: '¡Qué bonito perro!',
      fechaComentario: '2026-10-20T10:15:00Z',
      autor: {
        id: 2,
        nombreCompleto: 'Isaac Loarca',
        fotoPerfilUrl: 'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-isaac.jpg',
      },
    });
  });

  it('devuelve una lista vacía si la publicación no tiene comentarios', async () => {
    const res = await request(crearApp()).get('/publicaciones/3/comentarios').set(como(1));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { comentarios: [] });
  });

  it('responde 404 si la publicación no es visible para el usuario', async () => {
    const res = await request(crearApp()).get('/publicaciones/4/comentarios').set(como(1));
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Publicación no encontrada' });
  });

  it('responde 404 si la publicación no existe', async () => {
    const res = await request(crearApp()).get('/publicaciones/999/comentarios').set(como(1));
    assert.equal(res.status, 404);
  });

  it('responde 400 si el id no es entero positivo', async () => {
    const res = await request(crearApp()).get('/publicaciones/abc/comentarios').set(como(1));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'id debe ser un entero positivo' });
  });

  it('responde 401 sin usuario autenticado', async () => {
    const res = await request(crearApp()).get('/publicaciones/1/comentarios');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'No autenticado' });
  });
});

describe('POST /publicaciones/:id/comentarios', () => {
  it('crea el comentario de un amigo, recortado, y lo devuelve con su autor', async () => {
    const res = await request(crearApp())
      .post('/publicaciones/1/comentarios')
      .set(como(3))
      .send({ texto: '  Muy bonito  ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.comentario.texto, 'Muy bonito');
    assert.equal(res.body.comentario.autor.id, 3);
    assert.match(res.body.comentario.fechaComentario, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const lista = await request(crearApp()).get('/publicaciones/1/comentarios').set(como(1));
    assert.equal(lista.body.comentarios.at(-1).id, res.body.comentario.id);
  });

  it('permite comentar la propia publicación', async () => {
    const res = await request(crearApp()).post('/publicaciones/4/comentarios').set(como(5)).send({ texto: 'Hola' });
    assert.equal(res.status, 201);
  });

  it('responde 404 y no guarda nada si no es amigo del autor', async () => {
    const antes = await contarComentarios();
    const res = await request(crearApp()).post('/publicaciones/4/comentarios').set(como(1)).send({ texto: 'Hola' });
    assert.equal(res.status, 404);
    assert.equal(await contarComentarios(), antes);
  });

  it('rechaza un comentario vacío o de solo espacios', async () => {
    const res = await request(crearApp()).post('/publicaciones/1/comentarios').set(como(2)).send({ texto: '   ' });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El comentario no puede estar vacío' });
  });

  it('rechaza un comentario de más de 1000 caracteres', async () => {
    const res = await request(crearApp())
      .post('/publicaciones/1/comentarios')
      .set(como(2))
      .send({ texto: 'a'.repeat(1001) });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El comentario no puede pasar de 1000 caracteres' });
  });

  it('responde 400 si falta el texto', async () => {
    const res = await request(crearApp()).post('/publicaciones/1/comentarios').set(como(2)).send({});
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'texto es obligatorio' });
  });

  it('responde 400 si el cuerpo no es un objeto', async () => {
    const res = await request(crearApp()).post('/publicaciones/1/comentarios').set(como(2)).send([1, 2]);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El cuerpo debe ser un objeto JSON' });
  });

  it('responde 401 sin usuario autenticado', async () => {
    const res = await request(crearApp()).post('/publicaciones/1/comentarios').send({ texto: 'Hola' });
    assert.equal(res.status, 401);
  });
});
