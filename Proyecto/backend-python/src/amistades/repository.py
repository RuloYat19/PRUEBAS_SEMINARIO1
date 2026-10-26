class AmistadesRepository:
    def __init__(self, obtener_conexion):
        self.obtener_conexion = obtener_conexion

    def listar_usuarios(self, usuario_id):
        return self._consultar(
            """SELECT u.id, u.nombre_completo AS nombreCompleto, u.foto_perfil_url AS fotoPerfilUrl
               FROM usuario u WHERE u.id <> %s
                 AND NOT EXISTS (SELECT 1 FROM solicitud_amistad s
                   WHERE s.estado IN ('PENDIENTE','ACEPTADA')
                     AND LEAST(s.emisor_id,s.receptor_id)=LEAST(u.id,%s)
                     AND GREATEST(s.emisor_id,s.receptor_id)=GREATEST(u.id,%s))
               ORDER BY u.nombre_completo, u.id""", [usuario_id, usuario_id, usuario_id])

    def listar_solicitudes(self, usuario_id):
        filas = self._consultar(
            """SELECT s.id, s.estado AS estado,
                      CONCAT(DATE(s.fecha_solicitud),'T',TIME(s.fecha_solicitud),'Z') AS fechaSolicitud,
                      s.emisor_id AS emisorId, ue.nombre_completo AS emisorNombre,
                      ue.foto_perfil_url AS emisorFoto,
                      s.receptor_id AS receptorId, ur.nombre_completo AS receptorNombre,
                      ur.foto_perfil_url AS receptorFoto
               FROM solicitud_amistad s
               JOIN usuario ue ON ue.id=s.emisor_id
               JOIN usuario ur ON ur.id=s.receptor_id
               WHERE s.receptor_id=%s AND s.estado='PENDIENTE'
               ORDER BY s.fecha_solicitud, s.id""", [usuario_id])
        recibidas=[self._solicitud(f,"emisor") for f in filas]
        enviadas_filas=self._consultar(
            """SELECT s.id, s.estado,
                      CONCAT(DATE(s.fecha_solicitud),'T',TIME(s.fecha_solicitud),'Z') AS fechaSolicitud,
                      s.emisor_id AS emisorId, ue.nombre_completo AS emisorNombre,
                      ue.foto_perfil_url AS emisorFoto,
                      s.receptor_id AS receptorId, ur.nombre_completo AS receptorNombre,
                      ur.foto_perfil_url AS receptorFoto
               FROM solicitud_amistad s
               JOIN usuario ue ON ue.id=s.emisor_id
               JOIN usuario ur ON ur.id=s.receptor_id
               WHERE s.emisor_id=%s AND s.estado='PENDIENTE'
               ORDER BY s.fecha_solicitud, s.id""", [usuario_id])
        return {"recibidas":recibidas,"enviadas":[self._solicitud(f,"receptor") for f in enviadas_filas]}

    @staticmethod
    def _solicitud(fila, prefijo):
        return {"id":fila["id"],"fechaSolicitud":fila["fechaSolicitud"],
                "usuario":{"id":fila[f"{prefijo}Id"],"nombreCompleto":fila[f"{prefijo}Nombre"],
                           "fotoPerfilUrl":fila[f"{prefijo}Foto"]}}

    def listar_amigos(self, usuario_id):
        return self._consultar(
            """SELECT u.id, u.nombre_completo AS nombreCompleto, u.foto_perfil_url AS fotoPerfilUrl
               FROM amistad a JOIN usuario u ON u.id=a.amigo_id WHERE a.usuario_id=%s
               ORDER BY u.nombre_completo, u.id""", [usuario_id])

    def buscar_pareja(self, a, b):
        filas = self._consultar(
            "SELECT id, emisor_id AS emisorId, receptor_id AS receptorId, estado FROM solicitud_amistad WHERE usuario_menor=%s AND usuario_mayor=%s", [min(a,b), max(a,b)])
        return filas[0] if filas else None

    def crear_o_reenviar(self, emisor_id, receptor_id):
        conn = self.obtener_conexion()
        try:
            cur = conn.cursor()
            cur.execute("""INSERT INTO solicitud_amistad (emisor_id,receptor_id,estado) VALUES (%s,%s,'PENDIENTE')
                ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), emisor_id=IF(estado='RECHAZADA',VALUES(emisor_id),emisor_id),
                receptor_id=IF(estado='RECHAZADA',VALUES(receptor_id),receptor_id), fecha_solicitud=IF(estado='RECHAZADA',CURRENT_TIMESTAMP,fecha_solicitud),
                fecha_respuesta=IF(estado='RECHAZADA',NULL,fecha_respuesta), estado=IF(estado='RECHAZADA','PENDIENTE',estado)""", (emisor_id,receptor_id))
            conn.commit()
            sid = cur.lastrowid
        finally: conn.close()
        filas=self._consultar(
            """SELECT s.id,
                      CONCAT(DATE(s.fecha_solicitud),'T',TIME(s.fecha_solicitud),'Z') AS fechaSolicitud,
                      u.id AS usuarioId,u.nombre_completo AS nombreCompleto,
                      u.foto_perfil_url AS fotoPerfilUrl
               FROM solicitud_amistad s JOIN usuario u ON u.id=s.receptor_id WHERE s.id=%s""",[sid])
        fila=filas[0]
        return {"id":fila["id"],"fechaSolicitud":fila["fechaSolicitud"],
                "usuario":{"id":fila["usuarioId"],"nombreCompleto":fila["nombreCompleto"],
                           "fotoPerfilUrl":fila["fotoPerfilUrl"]}}

    def responder(self, solicitud_id, receptor_id, estado):
        conn = self.obtener_conexion()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE solicitud_amistad SET estado=%s, fecha_respuesta=CURRENT_TIMESTAMP WHERE id=%s AND receptor_id=%s AND estado='PENDIENTE'", (estado,solicitud_id,receptor_id))
            conn.commit()
            return cur.rowcount > 0
        finally: conn.close()

    def _consultar(self, sql, params):
        conn=self.obtener_conexion()
        try:
            cur=conn.cursor(dictionary=True); cur.execute(sql,params); return cur.fetchall()
        finally: conn.close()
