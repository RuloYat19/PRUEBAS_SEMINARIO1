const SELECT_PERFIL = `
  SELECT id, nombre_completo AS nombreCompleto, correo, dpi, foto_perfil_url AS fotoPerfilUrl
  FROM usuario`;

export class PerfilRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async buscar(usuarioId) {
    const [filas] = await this.pool.execute(`${SELECT_PERFIL} WHERE id = ?`, [usuarioId]);
    return filas[0] ?? null;
  }

  async buscarParaActualizar(usuarioId) {
    const [filas] = await this.pool.execute(
      `SELECT correo, nombre_completo AS nombreCompleto, dpi,
              foto_perfil_key AS fotoPerfilKey, password_md5 AS passwordMd5
       FROM usuario WHERE id = ?`,
      [usuarioId],
    );
    return filas[0] ?? null;
  }

  async dpiDeOtroUsuario(dpi, usuarioId) {
    const [filas] = await this.pool.execute('SELECT 1 FROM usuario WHERE dpi = ? AND id <> ?', [dpi, usuarioId]);
    return filas.length > 0;
  }

  async actualizar(usuarioId, { nombreCompleto, dpi, fotoPerfilUrl, fotoPerfilKey }) {
    await this.pool.execute(
      `UPDATE usuario
       SET nombre_completo = ?, dpi = ?,
           foto_perfil_url = COALESCE(?, foto_perfil_url),
           foto_perfil_key = COALESCE(?, foto_perfil_key)
       WHERE id = ?`,
      [nombreCompleto, dpi, fotoPerfilUrl ?? null, fotoPerfilKey ?? null, usuarioId],
    );
  }
}
