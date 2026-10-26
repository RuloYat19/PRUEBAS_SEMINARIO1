// Las fechas se formatean en SQL para que Node y Python devuelvan
// exactamente el mismo texto. La sesión de MySQL debe estar en UTC.
// Se arma con CONCAT y no con DATE_FORMAT porque el conector de Python
// confunde los % del formato con marcadores de parámetro.
const FECHA_ISO =
  "CONCAT(DATE(p.fecha_publicacion), 'T', TIME(p.fecha_publicacion), 'Z')";

const SELECT_PUBLICACION = `
  SELECT
    p.id,
    p.descripcion,
    p.imagen_url AS imagenUrl,
    ${FECHA_ISO} AS fechaPublicacion,
    u.id AS autorId,
    u.nombre_completo AS autorNombreCompleto,
    u.foto_perfil_url AS autorFotoPerfilUrl,
    (SELECT COUNT(*) FROM comentario c WHERE c.publicacion_id = p.id) AS totalComentarios
  FROM publicacion p
  JOIN usuario u ON u.id = p.usuario_id`;

// Publicaciones propias y de amigos. Recibe el id del usuario dos veces.
const VISIBLE_PARA = `
  (p.usuario_id = ? OR p.usuario_id IN (SELECT amigo_id FROM amistad WHERE usuario_id = ?))`;

const ORDEN_FEED = 'ORDER BY p.fecha_publicacion DESC, p.id DESC';

function escaparLike(texto) {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

export class PublicacionesRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async crear({ usuarioId, descripcion, imagenUrl, imagenKey, etiquetas }) {
    const conexion = await this.pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.execute(
        `INSERT INTO publicacion (usuario_id, descripcion, imagen_url, imagen_key)
         VALUES (?, ?, ?, ?)`,
        [usuarioId, descripcion, imagenUrl, imagenKey],
      );
      const publicacionId = resultado.insertId;

      for (const { nombre, confianza } of etiquetas) {
        // Si la etiqueta ya existe, LAST_INSERT_ID(id) devuelve su id
        // en lugar de insertar otra fila.
        const [etiqueta] = await conexion.execute(
          `INSERT INTO etiqueta (nombre) VALUES (?)
           ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
          [nombre],
        );
        await conexion.execute(
          `INSERT INTO publicacion_etiqueta (publicacion_id, etiqueta_id, confianza)
           VALUES (?, ?, ?)`,
          [publicacionId, etiqueta.insertId, confianza],
        );
      }

      await conexion.commit();
      return publicacionId;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async listarFeed(usuarioId, etiqueta) {
    const params = [usuarioId, usuarioId];
    let filtro = '';
    if (etiqueta) {
      filtro = `AND EXISTS (
        SELECT 1 FROM publicacion_etiqueta pe
        JOIN etiqueta e ON e.id = pe.etiqueta_id
        WHERE pe.publicacion_id = p.id AND e.nombre = ?)`;
      params.push(etiqueta);
    }

    const [filas] = await this.pool.execute(
      `${SELECT_PUBLICACION} WHERE ${VISIBLE_PARA} ${filtro} ${ORDEN_FEED}`,
      params,
    );
    return this.#conEtiquetas(filas);
  }

  async buscarVisible(usuarioId, publicacionId) {
    const [filas] = await this.pool.execute(
      `${SELECT_PUBLICACION} WHERE p.id = ? AND ${VISIBLE_PARA}`,
      [publicacionId, usuarioId, usuarioId],
    );
    const [publicacion] = await this.#conEtiquetas(filas);
    return publicacion ?? null;
  }

  async listarEtiquetas(usuarioId, buscar) {
    const params = [usuarioId, usuarioId];
    let filtro = '';
    if (buscar) {
      filtro = 'AND e.nombre LIKE ?';
      params.push(`%${escaparLike(buscar)}%`);
    }

    const [filas] = await this.pool.execute(
      `SELECT e.nombre, COUNT(*) AS total
       FROM publicacion p
       JOIN publicacion_etiqueta pe ON pe.publicacion_id = p.id
       JOIN etiqueta e ON e.id = pe.etiqueta_id
       WHERE ${VISIBLE_PARA} ${filtro}
       GROUP BY e.id, e.nombre
       ORDER BY total DESC, e.nombre ASC`,
      params,
    );
    return filas.map(({ nombre, total }) => ({ nombre, total: Number(total) }));
  }

  // Trae las etiquetas de todas las publicaciones en una sola consulta.
  async #conEtiquetas(filas) {
    if (filas.length === 0) return [];

    const ids = filas.map((fila) => fila.id);
    const [etiquetas] = await this.pool.query(
      `SELECT pe.publicacion_id AS publicacionId, e.nombre, pe.confianza
       FROM publicacion_etiqueta pe
       JOIN etiqueta e ON e.id = pe.etiqueta_id
       WHERE pe.publicacion_id IN (?)
       ORDER BY pe.confianza DESC, e.nombre ASC`,
      [ids],
    );

    const porPublicacion = new Map(ids.map((id) => [id, []]));
    for (const { publicacionId, nombre, confianza } of etiquetas) {
      porPublicacion.get(publicacionId).push({ nombre, confianza: Number(confianza) });
    }

    return filas.map((fila) => ({
      id: fila.id,
      descripcion: fila.descripcion,
      imagenUrl: fila.imagenUrl,
      fechaPublicacion: fila.fechaPublicacion,
      autor: {
        id: fila.autorId,
        nombreCompleto: fila.autorNombreCompleto,
        fotoPerfilUrl: fila.autorFotoPerfilUrl,
      },
      etiquetas: porPublicacion.get(fila.id),
      totalComentarios: Number(fila.totalComentarios),
    }));
  }
}
