export class IdentidadRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async buscarPorCognitoSub(cognitoSub) {
    const [rows] = await this.pool.execute('SELECT id FROM usuario WHERE cognito_sub = ?', [cognitoSub]);
    return rows[0] ? { id: rows[0].id } : null;
  }

  async buscarPorCorreo(correo) {
    const [rows] = await this.pool.execute(
      `SELECT id, cognito_sub AS cognitoSub, password_md5 AS passwordMd5
       FROM usuario WHERE correo = ?`,
      [correo],
    );
    return rows[0] ?? null;
  }

  async existeDpi(dpi) {
    const [rows] = await this.pool.execute('SELECT 1 FROM usuario WHERE dpi = ?', [dpi]);
    return rows.length > 0;
  }

  async crear({ cognitoSub, nombreCompleto, correo, dpi, passwordMd5, fotoPerfilKey, fotoPerfilUrl }) {
    await this.pool.execute(
      `INSERT INTO usuario
       (cognito_sub, nombre_completo, correo, dpi, password_md5, foto_perfil_url, foto_perfil_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cognitoSub, nombreCompleto, correo, dpi, passwordMd5, fotoPerfilUrl, fotoPerfilKey],
    );
  }
}
