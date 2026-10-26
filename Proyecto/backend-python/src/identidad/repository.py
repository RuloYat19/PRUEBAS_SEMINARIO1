class IdentidadRepository:
    def __init__(self,obtener_conexion): self.obtener_conexion=obtener_conexion

    def existe_correo(self,correo): return bool(self._consultar("SELECT 1 FROM usuario WHERE correo=%s",[correo]))
    def existe_dpi(self,dpi): return bool(self._consultar("SELECT 1 FROM usuario WHERE dpi=%s",[dpi]))

    def crear(self,cognito_sub,nombre_completo,correo,dpi,password_md5,foto_perfil_url,foto_perfil_key):
        conn=self.obtener_conexion()
        try:
            cursor=conn.cursor()
            cursor.execute("""INSERT INTO usuario
                (cognito_sub,nombre_completo,correo,dpi,password_md5,foto_perfil_url,foto_perfil_key)
                VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (cognito_sub,nombre_completo,correo,dpi,password_md5,foto_perfil_url,foto_perfil_key))
            conn.commit()
            return cursor.lastrowid
        except Exception:
            conn.rollback(); raise
        finally: conn.close()

    def buscar_login(self,correo):
        filas=self._consultar("""SELECT id,cognito_sub,correo,foto_perfil_key,password_md5
                              FROM usuario WHERE correo=%s""",[correo])
        return filas[0] if filas else None

    def _consultar(self,sql,params):
        conn=self.obtener_conexion()
        try:
            cursor=conn.cursor(dictionary=True); cursor.execute(sql,params); return cursor.fetchall()
        finally: conn.close()
