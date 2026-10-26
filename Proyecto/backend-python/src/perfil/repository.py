SELECT_PERFIL = """
  SELECT id, nombre_completo AS nombreCompleto, correo, dpi, foto_perfil_url AS fotoPerfilUrl
  FROM usuario"""


class PerfilRepository:
    def __init__(self, obtener_conexion):
        self.obtener_conexion = obtener_conexion

    def buscar(self, usuario_id):
        filas = self._consultar(f"{SELECT_PERFIL} WHERE id = %s", [usuario_id])
        return filas[0] if filas else None

    def buscar_para_actualizar(self, usuario_id):
        filas = self._consultar(
            """SELECT correo, nombre_completo AS nombreCompleto, dpi, password_md5 AS passwordMd5
               FROM usuario WHERE id = %s""",
            [usuario_id],
        )
        return filas[0] if filas else None

    def dpi_de_otro_usuario(self, dpi, usuario_id):
        return bool(self._consultar("SELECT 1 FROM usuario WHERE dpi = %s AND id <> %s", [dpi, usuario_id]))

    def actualizar(self, usuario_id, nombre_completo, dpi, foto_perfil_url=None, foto_perfil_key=None):
        conexion = self.obtener_conexion()
        try:
            cursor = conexion.cursor()
            cursor.execute(
                """UPDATE usuario
                   SET nombre_completo = %s, dpi = %s,
                       foto_perfil_url = COALESCE(%s, foto_perfil_url),
                       foto_perfil_key = COALESCE(%s, foto_perfil_key)
                   WHERE id = %s""",
                (nombre_completo, dpi, foto_perfil_url, foto_perfil_key, usuario_id),
            )
            conexion.commit()
        finally:
            conexion.close()

    def _consultar(self, sql, params):
        conexion = self.obtener_conexion()
        try:
            cursor = conexion.cursor(dictionary=True)
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            conexion.close()
