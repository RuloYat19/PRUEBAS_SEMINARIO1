// Pruebas del dominio publicaciones contra el MySQL local de Docker
// (Proyecto/database/docker-compose.yml). Rekognition va simulado.
//
//   docker compose -f Proyecto/database/docker-compose.yml up -d
//   npm test
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { createPublicacionesRouter } from '../src/publicaciones/publicaciones.routes.js';
import { PublicacionesRepository } from '../src/publicaciones/publicaciones.repository.js';
import { PublicacionesService } from '../src/publicaciones/publicaciones.service.js';

const SEED = new URL('../../database/seed.sql', import.meta.url);
const S3_PUBLIC_URL = 'https://semi1proyecto-g8-2s2026.s3.amazonaws.com';

const conexionDb = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'semisocial',
  timezone: 'Z',
};

let pool;
let etiquetador;

function crearApp() {
  const app = express();
  app.use(express.json());
  // Sustituye al middleware de Cognito: el id del usuario viene en un header.
  app.use((req, _res, next) => {
    const id = Number(req.get('x-test-usuario'));
    if (id) req.usuario = { id };
    next();
  });
  const service = new PublicacionesService({
    repository: new PublicacionesRepository(pool),
    etiquetador,
    s3PublicUrl: S3_PUBLIC_URL,
  });
  app.use('/publicaciones', createPublicacionesRouter(service));
  return app;
}

const como = (usuarioId) => ({ 'x-test-usuario': String(usuarioId) });

before(async () => {
  pool = mysql.createPool(conexionDb);
});

beforeEach(async () => {
  const seed = await readFile(SEED, 'utf8');
  const conexion = await mysql.createConnection({ ...conexionDb, multipleStatements: true });
  await conexion.query(seed);
  await conexion.end();

  etiquetador = {
    llamadas: [],
    async detectarEtiquetas(key) {
      this.llamadas.push(key);
      return [
        { nombre: 'Cat', confianza: 98.5 },
        { nombre: 'Pet', confianza: 97.123 },
      ];
    },
  };
});

after(async () => {
  await pool.end();
});

describe('GET /publicaciones (feed)', () => {
  it('devuelve las propias y las de amigos, más recientes primero', async () => {
    const res = await request(crearApp()).get('/publicaciones').set(como(1));

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.publicaciones.map((p) => p.id), [6, 5, 3, 2, 1]);
  });

  it('no incluye publicaciones de quien no es amigo', async () => {
    const res = await request(crearApp()).get('/publicaciones').set(como(1));

    assert.ok(!res.body.publicaciones.some((p) => p.autor.id === 5));
  });

  it('devuelve la forma exacta del contrato', async () => {
    const res = await request(crearApp()).get('/publicaciones').set(como(1));

    assert.deepEqual(res.body.publicaciones[1], {
      id: 5,
      descripcion: 'Estudiando para Seminario',
      imagenUrl: `${S3_PUBLIC_URL}/Fotos_Publicadas/seed-05.jpg`,
      fechaPublicacion: '2026-10-21T08:00:00Z',
      autor: {
        id: 1,
        nombreCompleto: 'Valery Alarcón',
        fotoPerfilUrl: `${S3_PUBLIC_URL}/Fotos_Perfil/seed-valery.jpg`,
      },
      etiquetas: [
        { nombre: 'Computer', confianza: 96 },
        { nombre: 'Book', confianza: 90.25 },
        { nombre: 'Person', confianza: 82.6 },
      ],
      totalComentarios: 1,
    });
  });

  it('filtra por etiqueta sin distinguir mayúsculas', async () => {
    const res = await request(crearApp())
      .get('/publicaciones')
      .query({ etiqueta: 'person' })
      .set(como(1));

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.publicaciones.map((p) => p.id), [5, 3, 2]);
  });

  it('etiqueta vacía equivale a Todos', async () => {
    const res = await request(crearApp())
      .get('/publicaciones?etiqueta=')
      .set(como(1));

    assert.equal(res.body.publicaciones.length, 5);
  });

  it('responde 401 sin usuario autenticado', async () => {
    const res = await request(crearApp()).get('/publicaciones');

    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'No autenticado' });
  });
});

describe('GET /publicaciones/etiquetas', () => {
  it('lista las etiquetas del feed con su total', async () => {
    const res = await request(crearApp()).get('/publicaciones/etiquetas').set(como(1));

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.etiquetas[0], { nombre: 'Person', total: 3 });
    assert.ok(!res.body.etiquetas.some((e) => e.nombre === 'Mountain'));
  });

  it('busca por texto contenido en el nombre', async () => {
    const res = await request(crearApp())
      .get('/publicaciones/etiquetas')
      .query({ buscar: 'PE' })
      .set(como(1));

    assert.deepEqual(res.body.etiquetas, [
      { nombre: 'Person', total: 3 },
      { nombre: 'Pet', total: 1 },
    ]);
  });

  it('trata % y _ como texto, no como comodines', async () => {
    const res = await request(crearApp())
      .get('/publicaciones/etiquetas')
      .query({ buscar: '%' })
      .set(como(1));

    assert.deepEqual(res.body.etiquetas, []);
  });
});

describe('GET /publicaciones/:id', () => {
  it('devuelve una publicación de un amigo', async () => {
    const res = await request(crearApp()).get('/publicaciones/2').set(como(1));

    assert.equal(res.status, 200);
    assert.equal(res.body.publicacion.id, 2);
  });

  it('responde 404 si no es visible para el usuario', async () => {
    const res = await request(crearApp()).get('/publicaciones/4').set(como(1));

    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Publicación no encontrada' });
  });

  it('responde 400 si el id no es entero positivo', async () => {
    const res = await request(crearApp()).get('/publicaciones/abc').set(como(1));

    assert.equal(res.status, 400);
  });
});

describe('POST /publicaciones', () => {
  it('crea la publicación con las etiquetas de Rekognition', async () => {
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/abc-123.jpg', descripcion: '  Mi gato  ' });

    assert.equal(res.status, 201);
    assert.deepEqual(etiquetador.llamadas, ['Fotos_Publicadas/abc-123.jpg']);
    const { publicacion } = res.body;
    assert.equal(publicacion.id, 7);
    assert.equal(publicacion.descripcion, 'Mi gato');
    assert.equal(publicacion.imagenUrl, `${S3_PUBLIC_URL}/Fotos_Publicadas/abc-123.jpg`);
    assert.match(publicacion.fechaPublicacion, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.deepEqual(publicacion.etiquetas, [
      { nombre: 'Cat', confianza: 98.5 },
      { nombre: 'Pet', confianza: 97.12 },
    ]);
  });

  it('reutiliza las etiquetas que ya existen', async () => {
    await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/abc-123.png' });

    const [filas] = await pool.query("SELECT COUNT(*) AS n FROM etiqueta WHERE nombre = 'Pet'");
    assert.equal(filas[0].n, 1);
  });

  it('guarda la descripción vacía como null', async () => {
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/abc.jpeg', descripcion: '   ' });

    assert.equal(res.body.publicacion.descripcion, null);
  });

  it('rechaza una key fuera de Fotos_Publicadas', async () => {
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Perfil/abc.jpg' });

    assert.equal(res.status, 400);
    assert.equal(etiquetador.llamadas.length, 0);
  });

  it('rechaza una descripción de más de 1000 caracteres', async () => {
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/abc.jpg', descripcion: 'x'.repeat(1001) });

    assert.equal(res.status, 400);
  });

  it('rechaza un cuerpo que no es un objeto', async () => {
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send([1, 2]);

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El cuerpo debe ser un objeto JSON' });
  });

  it('responde 400 si falta imagenKey', async () => {
    const res = await request(crearApp()).post('/publicaciones').set(como(1)).send({});

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'imagenKey es obligatorio' });
  });

  it('responde 400 si Rekognition no encuentra la imagen', async () => {
    etiquetador.detectarEtiquetas = async () => {
      throw Object.assign(new Error('no existe'), { name: 'InvalidS3ObjectException' });
    };
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/no-existe.jpg' });

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'La imagen no existe en S3 o no es válida' });
  });

  it('responde 502 y no crea nada si Rekognition falla', async () => {
    etiquetador.detectarEtiquetas = async () => {
      throw Object.assign(new Error('caído'), { name: 'InternalServerError' });
    };
    const res = await request(crearApp())
      .post('/publicaciones')
      .set(como(1))
      .send({ imagenKey: 'Fotos_Publicadas/abc.jpg' });

    assert.equal(res.status, 502);
    const [filas] = await pool.query('SELECT COUNT(*) AS n FROM publicacion');
    assert.equal(filas[0].n, 6);
  });
});
