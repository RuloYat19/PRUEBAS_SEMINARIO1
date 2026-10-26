const FECHA_ISO = "CONCAT(DATE(m.fecha_envio), 'T', TIME(m.fecha_envio), 'Z')";

function aMensaje(row) {
  return {
    id: Number(row.id),
    emisorId: row.emisorId,
    receptorId: row.receptorId,
    texto: row.texto,
    fechaEnvio: row.fechaEnvio,
  };
}

export class ChatRepository {
  constructor(pool) { this.pool = pool; }

  async sonAmigos(usuarioId, amigoId) {
    const [rows] = await this.pool.execute(
      'SELECT 1 FROM amistad WHERE usuario_id = ? AND amigo_id = ? LIMIT 1',
      [usuarioId, amigoId],
    );
    return rows.length > 0;
  }

  async listarMensajes(usuarioId, amigoId) {
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.emisor_id AS emisorId, m.receptor_id AS receptorId,
              m.texto, ${FECHA_ISO} AS fechaEnvio
       FROM mensaje m
       WHERE (m.emisor_id = ? AND m.receptor_id = ?)
          OR (m.emisor_id = ? AND m.receptor_id = ?)
       ORDER BY m.id ASC`,
      [usuarioId, amigoId, amigoId, usuarioId],
    );
    return rows.map(aMensaje);
  }

  async crearMensaje(emisorId, receptorId, texto) {
    const [result] = await this.pool.execute(
      'INSERT INTO mensaje (emisor_id, receptor_id, texto) VALUES (?, ?, ?)',
      [emisorId, receptorId, texto],
    );
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.emisor_id AS emisorId, m.receptor_id AS receptorId,
              m.texto, ${FECHA_ISO} AS fechaEnvio
       FROM mensaje m WHERE m.id = ?`,
      [result.insertId],
    );
    return aMensaje(rows[0]);
  }

  async ultimoId() {
    const [[row]] = await this.pool.query('SELECT COALESCE(MAX(id), 0) AS id FROM mensaje');
    return Number(row.id);
  }

  async mensajesNuevos(ultimoId) {
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.emisor_id AS emisorId, m.receptor_id AS receptorId,
              m.texto, ${FECHA_ISO} AS fechaEnvio
       FROM mensaje m WHERE m.id > ? ORDER BY m.id ASC LIMIT 500`,
      [ultimoId],
    );
    return rows.map(aMensaje);
  }
}
