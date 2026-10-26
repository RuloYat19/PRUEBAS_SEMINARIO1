import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import mysql from 'mysql2/promise';
import request from 'supertest';
import { PerfilRepository } from '../src/perfil/perfil.repository.js';
import { createPerfilRouter } from '../src/perfil/perfil.routes.js';
import { PerfilService } from '../src/perfil/perfil.service.js';

const SEED = new URL('../../database/seed.sql', import.meta.url);
const S3_PUBLIC_URL = 'https://semi1proyecto-g8-2s2026.s3.amazonaws.com';
const PASSWORD = 'Demo1234';

const conexionDb = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'semisocial',
  timezone: 'Z',
};

let pool;
let cognito;

function crearApp(repository = new PerfilRepository(pool)) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const id = Number(req.get('x-test-usuario'));
    if (id) req.usuario = { id };
    next();
  });
  app.use('/perfil', createPerfilRouter(new PerfilService({ repository, cognito, s3PublicUrl: S3_PUBLIC_URL })));
  return app;
}

const como = (usuarioId) => ({ 'x-test-usuario': String(usuarioId) });
const cambios = (extra = {}) => ({ nombreCompleto: 'Fátima Florisel Cerezo', dpi: '3000000000999', password: PASSWORD, ...extra });

async function filaUsuario(id) {
  const [[fila]] = await pool.query(
    'SELECT nombre_completo, dpi, foto_perfil_url, foto_perfil_key FROM usuario WHERE id = ?',
    [id],
  );
  return fila;
}

before(async () => {
  pool = mysql.createPool(conexionDb);
});

beforeEach(async () => {
  const seed = await readFile(SEED, 'utf8');
  const conexion = await mysql.createConnection({ ...conexionDb, multipleStatements: true });
  await conexion.query(seed);
  await conexion.end();

  cognito = {
    llamadas: [],
    error: null,
    async actualizarAtributos(correo, atributos) {
      this.llamadas.push({ correo, ...atributos });
      if (this.error) throw this.error;
    },
  };
});

after(async () => {
  await pool.end();
});

describe('GET /perfil', () => {
  it('devuelve el perfil del usuario del token con la forma del contrato', async () => {
    const res = await request(crearApp()).get('/perfil').set(como(4));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      perfil: {
        id: 4,
        nombreCompleto: 'Fátima Cerezo',
        correo: 'fatima.demo@semisocial.test',
        dpi: '3000000000404',
        fotoPerfilUrl: 'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-fatima.jpg',
      },
    });
  });

  it('responde 401 sin usuario autenticado', async () => {
    const res = await request(crearApp()).get('/perfil');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'No autenticado' });
  });
});

describe('PUT /perfil', () => {
  it('actualiza Cognito y RDS con la contraseña correcta', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ nombreCompleto: '  Fátima Florisel Cerezo  ' }));
    assert.equal(res.status, 200);
    assert.equal(res.body.perfil.nombreCompleto, 'Fátima Florisel Cerezo');
    assert.equal(res.body.perfil.dpi, '3000000000999');
    assert.deepEqual(cognito.llamadas, [
      { correo: 'fatima.demo@semisocial.test', nombreCompleto: 'Fátima Florisel Cerezo', dpi: '3000000000999', fotoPerfilKey: 'Fotos_Perfil/seed-fatima.jpg' },
    ]);
    const fila = await filaUsuario(4);
    assert.equal(fila.nombre_completo, 'Fátima Florisel Cerezo');
    assert.equal(fila.dpi, '3000000000999');
  });

  it('guarda la nueva foto con su URL pública y su key', async () => {
    const res = await request(crearApp())
      .put('/perfil')
      .set(como(4))
      .send(cambios({ fotoPerfilKey: 'Fotos_Perfil/abc-123.jpg' }));
    assert.equal(res.status, 200);
    assert.equal(res.body.perfil.fotoPerfilUrl, `${S3_PUBLIC_URL}/Fotos_Perfil/abc-123.jpg`);
    assert.equal(cognito.llamadas[0].fotoPerfilKey, 'Fotos_Perfil/abc-123.jpg');
    assert.equal((await filaUsuario(4)).foto_perfil_key, 'Fotos_Perfil/abc-123.jpg');
  });

  it('sin foto nueva conserva la anterior', async () => {
    await request(crearApp()).put('/perfil').set(como(4)).send(cambios());
    assert.equal((await filaUsuario(4)).foto_perfil_key, 'Fotos_Perfil/seed-fatima.jpg');
  });

  it('permite guardar con el mismo DPI que ya tenía', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ dpi: '3000000000404' }));
    assert.equal(res.status, 200);
  });

  it('responde 403 con la contraseña incorrecta y no toca Cognito ni RDS', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ password: 'Otra1234' }));
    assert.equal(res.status, 403);
    assert.deepEqual(res.body, { error: 'La contraseña no es correcta' });
    assert.equal(cognito.llamadas.length, 0);
    assert.equal((await filaUsuario(4)).nombre_completo, 'Fátima Cerezo');
  });

  it('responde 409 si el DPI es de otro usuario y no toca Cognito', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ dpi: '3000000000101' }));
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: 'Ese DPI ya está registrado' });
    assert.equal(cognito.llamadas.length, 0);
  });

  it('responde 502 y no cambia RDS si Cognito falla', async () => {
    cognito.error = new Error('InternalErrorException');
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios());
    assert.equal(res.status, 502);
    assert.deepEqual(res.body, { error: 'No se pudo actualizar el perfil en Cognito' });
    assert.equal((await filaUsuario(4)).nombre_completo, 'Fátima Cerezo');
  });

  it('restaura Cognito si RDS falla después de actualizarlo', async () => {
    class RepositorioQueFalla extends PerfilRepository {
      async actualizar() {
        throw new Error('RDS no disponible');
      }
    }
    const res = await request(crearApp(new RepositorioQueFalla(pool))).put('/perfil').set(como(4)).send(cambios());
    assert.equal(res.status, 500);
    assert.deepEqual(cognito.llamadas, [
      { correo: 'fatima.demo@semisocial.test', nombreCompleto: 'Fátima Florisel Cerezo', dpi: '3000000000999', fotoPerfilKey: 'Fotos_Perfil/seed-fatima.jpg' },
      { correo: 'fatima.demo@semisocial.test', nombreCompleto: 'Fátima Cerezo', dpi: '3000000000404', fotoPerfilKey: 'Fotos_Perfil/seed-fatima.jpg' },
    ]);
  });

  it('rechaza un DPI que no tiene 13 dígitos', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ dpi: '123' }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El DPI debe tener 13 dígitos' });
  });

  it('rechaza un nombre vacío', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(cambios({ nombreCompleto: '   ' }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El nombre no puede estar vacío' });
  });

  it('rechaza una foto fuera de Fotos_Perfil', async () => {
    const res = await request(crearApp())
      .put('/perfil')
      .set(como(4))
      .send(cambios({ fotoPerfilKey: 'Fotos_Publicadas/x.jpg' }));
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'fotoPerfilKey debe ser Fotos_Perfil/<archivo>.jpg, .jpeg o .png' });
  });

  it('responde 400 si falta la contraseña', async () => {
    const { password: _password, ...sinPassword } = cambios();
    const res = await request(crearApp()).put('/perfil').set(como(4)).send(sinPassword);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'password es obligatorio' });
  });

  it('responde 400 si el cuerpo no es un objeto', async () => {
    const res = await request(crearApp()).put('/perfil').set(como(4)).send([1]);
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'El cuerpo debe ser un objeto JSON' });
  });

  it('responde 401 sin usuario autenticado', async () => {
    const res = await request(crearApp()).put('/perfil').send(cambios());
    assert.equal(res.status, 401);
  });
});
