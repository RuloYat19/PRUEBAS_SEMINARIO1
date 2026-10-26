const SELECT_COMENTARIO = `
  SELECT
    c.id,
    c.texto,
    CONCAT(DATE(c.fecha_comentario), 'T', TIME(c.fecha_comentario), 'Z') AS fechaComentario,
    u.id AS autorId,
    u.nombre_completo AS autorNombreCompleto,
    u.foto_perfil_url AS autorFotoPerfilUrl
  FROM comentario c
  JOIN usuario u ON u.id = c.usuario_id`;

function aComentario(fila) {
  return {
    id: fila.id,
    texto: fila.texto,
    fechaComentario: fila.fechaComentario,
    autor: {
      id: fila.autorId,
      nombreCompleto: fila.autorNombreCompleto,
      fotoPerfilUrl: fila.autorFotoPerfilUrl,
    },
  };
}

export class ComentariosRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listar(publicacionId) {
    const [filas] = await this.pool.execute(
      `${SELECT_COMENTARIO}
       WHERE c.publicacion_id = ?
       ORDER BY c.fecha_comentario ASC, c.id ASC`,
      [publicacionId],
    );
    return filas.map(aComentario);
  }

  async crear({ publicacionId, usuarioId, texto }) {
    const [resultado] = await this.pool.execute(
      'INSERT INTO comentario (publicacion_id, usuario_id, texto) VALUES (?, ?, ?)',
      [publicacionId, usuarioId, texto],
    );
    const [filas] = await this.pool.execute(`${SELECT_COMENTARIO} WHERE c.id = ?`, [
      resultado.insertId,
    ]);
    return aComentario(filas[0]);
  }
}
