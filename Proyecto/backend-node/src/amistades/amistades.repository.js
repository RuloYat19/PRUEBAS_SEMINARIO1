const ISO_DATE = (column) => `CONCAT(DATE(${column}), 'T', TIME(${column}), 'Z')`;
const USUARIO = `u.id AS id, u.nombre_completo AS nombreCompleto, u.foto_perfil_url AS fotoPerfilUrl`;

function aUsuario(row) {
  return { id: row.id, nombreCompleto: row.nombreCompleto, fotoPerfilUrl: row.fotoPerfilUrl };
}

function aSolicitud(row) {
  return {
    id: row.solicitudId,
    usuario: aUsuario(row),
    fechaSolicitud: row.fechaSolicitud,
  };
}

export class AmistadesRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listarAmigos(usuarioId) {
    const [rows] = await this.pool.execute(
      `SELECT ${USUARIO} FROM amistad a JOIN usuario u ON u.id = a.amigo_id
       WHERE a.usuario_id = ? ORDER BY u.nombre_completo, u.id`,
      [usuarioId],
    );
    return rows.map(aUsuario);
  }

  async listarPersonas(usuarioId) {
    const [rows] = await this.pool.execute(
      `SELECT ${USUARIO} FROM usuario u
       WHERE u.id <> ?
         AND NOT EXISTS (
           SELECT 1 FROM solicitud_amistad s
           WHERE LEAST(s.emisor_id, s.receptor_id) = LEAST(u.id, ?)
             AND GREATEST(s.emisor_id, s.receptor_id) = GREATEST(u.id, ?)
             AND s.estado IN ('PENDIENTE', 'ACEPTADA')
         )
       ORDER BY u.nombre_completo, u.id`,
      [usuarioId, usuarioId, usuarioId],
    );
    return rows.map(aUsuario);
  }

  async listarSolicitudes(usuarioId) {
    const [recibidas, enviadas] = await Promise.all([
      this.pool.execute(
        `SELECT s.id AS solicitudId, ${USUARIO}, ${ISO_DATE('s.fecha_solicitud')} AS fechaSolicitud
         FROM solicitud_amistad s JOIN usuario u ON u.id = s.emisor_id
         WHERE s.receptor_id = ? AND s.estado = 'PENDIENTE'
         ORDER BY s.fecha_solicitud DESC, s.id DESC`,
        [usuarioId],
      ),
      this.pool.execute(
        `SELECT s.id AS solicitudId, ${USUARIO}, ${ISO_DATE('s.fecha_solicitud')} AS fechaSolicitud
         FROM solicitud_amistad s JOIN usuario u ON u.id = s.receptor_id
         WHERE s.emisor_id = ? AND s.estado = 'PENDIENTE'
         ORDER BY s.fecha_solicitud DESC, s.id DESC`,
        [usuarioId],
      ),
    ]);
    return {
      recibidas: recibidas[0].map(aSolicitud),
      enviadas: enviadas[0].map(aSolicitud),
    };
  }

  async enviarSolicitud(emisorId, receptorId) {
    const [userRows] = await this.pool.execute('SELECT 1 FROM usuario WHERE id = ?', [receptorId]);
    if (!userRows.length) return null;
    const [existingRows] = await this.pool.execute(
      `SELECT id, estado FROM solicitud_amistad
       WHERE LEAST(emisor_id, receptor_id) = LEAST(?, ?)
         AND GREATEST(emisor_id, receptor_id) = GREATEST(?, ?)`,
      [emisorId, receptorId, emisorId, receptorId],
    );
    if (existingRows[0]?.estado === 'RECHAZADA') {
      await this.pool.execute(
        `UPDATE solicitud_amistad SET emisor_id = ?, receptor_id = ?, estado = 'PENDIENTE',
          fecha_solicitud = CURRENT_TIMESTAMP, fecha_respuesta = NULL WHERE id = ?`,
        [emisorId, receptorId, existingRows[0].id],
      );
      return existingRows[0].id;
    }
    if (existingRows.length) return null;

    try {
      const [result] = await this.pool.execute(
        `INSERT INTO solicitud_amistad (emisor_id, receptor_id, estado)
         VALUES (?, ?, 'PENDIENTE')`,
        [emisorId, receptorId],
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return null;
      throw error;
    }
  }

  async buscarSolicitud(solicitudId) {
    const [rows] = await this.pool.execute(
      `SELECT s.id AS solicitudId, s.emisor_id AS emisorId, s.receptor_id AS receptorId,
              s.estado, ${ISO_DATE('s.fecha_solicitud')} AS fechaSolicitud,
              ${USUARIO}
       FROM solicitud_amistad s JOIN usuario u ON u.id = s.receptor_id
       WHERE s.id = ?`,
      [solicitudId],
    );
    return rows[0] ?? null;
  }

  async responderSolicitud(solicitudId, receptorId, estado) {
    const [result] = await this.pool.execute(
      `UPDATE solicitud_amistad SET estado = ?, fecha_respuesta = CURRENT_TIMESTAMP
       WHERE id = ? AND receptor_id = ? AND estado = 'PENDIENTE'`,
      [estado, solicitudId, receptorId],
    );
    return result.affectedRows === 1;
  }
}
