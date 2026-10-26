SELECT_MENSAJE="""SELECT m.id, m.texto,
 CONCAT(DATE(m.fecha_envio),'T',TIME(m.fecha_envio),'Z') AS fechaEnvio,
 m.emisor_id AS emisorId, ue.nombre_completo AS emisorNombreCompleto,
 m.receptor_id AS receptorId, ur.nombre_completo AS receptorNombreCompleto
 FROM mensaje m JOIN usuario ue ON ue.id=m.emisor_id JOIN usuario ur ON ur.id=m.receptor_id"""

class ChatRepository:
    def __init__(self,obtener_conexion): self.obtener_conexion=obtener_conexion
    def es_amigo(self,a,b): return bool(self._consultar("SELECT 1 FROM amistad WHERE usuario_id=%s AND amigo_id=%s",[a,b]))
    def historial(self,a,b,desde_id=0,limite=100):
        filas=self._consultar(f"{SELECT_MENSAJE} WHERE m.id>%s AND ((m.emisor_id=%s AND m.receptor_id=%s) OR (m.emisor_id=%s AND m.receptor_id=%s)) ORDER BY m.id LIMIT %s",[desde_id,a,b,b,a,limite])
        return [self._mapear(f) for f in filas]
    def enviar(self,a,b,texto):
        conn=self.obtener_conexion()
        try:
            cur=conn.cursor(); cur.execute("INSERT INTO mensaje (emisor_id,receptor_id,texto) VALUES (%s,%s,%s)",(a,b,texto)); conn.commit(); mid=cur.lastrowid
        finally: conn.close()
        filas=self._consultar(f"{SELECT_MENSAJE} WHERE m.id=%s",[mid]); return self._mapear(filas[0])
    def recibidos(self,usuario_id,desde_id,limite=100):
        filas=self._consultar(f"{SELECT_MENSAJE} WHERE m.receptor_id=%s AND m.id>%s ORDER BY m.id LIMIT %s",[usuario_id,desde_id,limite])
        return [self._mapear(f) for f in filas]
    def _consultar(self,sql,params):
        conn=self.obtener_conexion()
        try: cur=conn.cursor(dictionary=True); cur.execute(sql,params); return cur.fetchall()
        finally: conn.close()
    def ultimo_id(self,usuario_id):
        filas=self._consultar("SELECT COALESCE(MAX(id),0) AS ultimoId FROM mensaje WHERE emisor_id=%s OR receptor_id=%s",[usuario_id,usuario_id])
        return int(filas[0]["ultimoId"])
    @staticmethod
    def _mapear(f): return {"id":f["id"],"emisorId":f["emisorId"],"receptorId":f["receptorId"],"texto":f["texto"],"fechaEnvio":f["fechaEnvio"]}
