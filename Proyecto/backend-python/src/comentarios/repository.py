SELECT_COMENTARIO = """
  SELECT
    c.id,
    c.texto,
    CONCAT(DATE(c.fecha_comentario), 'T', TIME(c.fecha_comentario), 'Z') AS fechaComentario,
    u.id AS autorId,
    u.nombre_completo AS autorNombreCompleto,
    u.foto_perfil_url AS autorFotoPerfilUrl
  FROM comentario c
  JOIN usuario u ON u.id = c.usuario_id"""


def _a_comentario(fila):
    return {
        "id": fila["id"],
        "texto": fila["texto"],
        "fechaComentario": fila["fechaComentario"],
        "autor": {
            "id": fila["autorId"],
            "nombreCompleto": fila["autorNombreCompleto"],
            "fotoPerfilUrl": fila["autorFotoPerfilUrl"],
        },
    }


class ComentariosRepository:
    def __init__(self, obtener_conexion):
        self.obtener_conexion = obtener_conexion

    def listar(self, publicacion_id):
        filas = self._consultar(
            f"""{SELECT_COMENTARIO}
                WHERE c.publicacion_id = %s
                ORDER BY c.fecha_comentario ASC, c.id ASC""",
            [publicacion_id],
        )
        return [_a_comentario(fila) for fila in filas]

    def crear(self, publicacion_id, usuario_id, texto):
        conexion = self.obtener_conexion()
        try:
            cursor = conexion.cursor()
            cursor.execute(
                "INSERT INTO comentario (publicacion_id, usuario_id, texto) VALUES (%s, %s, %s)",
                (publicacion_id, usuario_id, texto),
            )
            conexion.commit()
            comentario_id = cursor.lastrowid
        finally:
            conexion.close()
        filas = self._consultar(f"{SELECT_COMENTARIO} WHERE c.id = %s", [comentario_id])
        return _a_comentario(filas[0])

    def _consultar(self, sql, params):
        conexion = self.obtener_conexion()
        try:
            cursor = conexion.cursor(dictionary=True)
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            conexion.close()
