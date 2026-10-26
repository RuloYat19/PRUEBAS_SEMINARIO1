"""Consultas de publicaciones. Son las mismas que usa backend-node."""

# Las fechas se formatean en SQL para que Node y Python devuelvan
# exactamente el mismo texto. La sesión de MySQL debe estar en UTC.
# Se arma con CONCAT y no con DATE_FORMAT porque el conector de Python
# confunde los % del formato con marcadores de parámetro.
SELECT_PUBLICACION = """
  SELECT
    p.id,
    p.descripcion,
    p.imagen_url AS imagenUrl,
    CONCAT(DATE(p.fecha_publicacion), 'T', TIME(p.fecha_publicacion), 'Z') AS fechaPublicacion,
    u.id AS autorId,
    u.nombre_completo AS autorNombreCompleto,
    u.foto_perfil_url AS autorFotoPerfilUrl,
    (SELECT COUNT(*) FROM comentario c WHERE c.publicacion_id = p.id) AS totalComentarios
  FROM publicacion p
  JOIN usuario u ON u.id = p.usuario_id"""

# Publicaciones propias y de amigos. Recibe el id del usuario dos veces.
VISIBLE_PARA = """
  (p.usuario_id = %s OR p.usuario_id IN (SELECT amigo_id FROM amistad WHERE usuario_id = %s))"""

ORDEN_FEED = "ORDER BY p.fecha_publicacion DESC, p.id DESC"


def _escapar_like(texto):
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class PublicacionesRepository:
    def __init__(self, obtener_conexion):
        """`obtener_conexion()` devuelve una conexión de mysql-connector (del pool)."""
        self.obtener_conexion = obtener_conexion

    def crear(self, usuario_id, descripcion, imagen_url, imagen_key, etiquetas):
        conexion = self.obtener_conexion()
        try:
            conexion.start_transaction()
            cursor = conexion.cursor()
            cursor.execute(
                """INSERT INTO publicacion (usuario_id, descripcion, imagen_url, imagen_key)
                   VALUES (%s, %s, %s, %s)""",
                (usuario_id, descripcion, imagen_url, imagen_key),
            )
            publicacion_id = cursor.lastrowid

            for etiqueta in etiquetas:
                # Si la etiqueta ya existe, LAST_INSERT_ID(id) devuelve su id
                # en lugar de insertar otra fila.
                cursor.execute(
                    """INSERT INTO etiqueta (nombre) VALUES (%s)
                       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)""",
                    (etiqueta["nombre"],),
                )
                cursor.execute(
                    """INSERT INTO publicacion_etiqueta (publicacion_id, etiqueta_id, confianza)
                       VALUES (%s, %s, %s)""",
                    (publicacion_id, cursor.lastrowid, etiqueta["confianza"]),
                )

            conexion.commit()
            return publicacion_id
        except Exception:
            conexion.rollback()
            raise
        finally:
            conexion.close()

    def listar_feed(self, usuario_id, etiqueta=None):
        params = [usuario_id, usuario_id]
        filtro = ""
        if etiqueta:
            filtro = """AND EXISTS (
              SELECT 1 FROM publicacion_etiqueta pe
              JOIN etiqueta e ON e.id = pe.etiqueta_id
              WHERE pe.publicacion_id = p.id AND e.nombre = %s)"""
            params.append(etiqueta)

        filas = self._consultar(
            f"{SELECT_PUBLICACION} WHERE {VISIBLE_PARA} {filtro} {ORDEN_FEED}", params
        )
        return self._con_etiquetas(filas)

    def buscar_visible(self, usuario_id, publicacion_id):
        filas = self._consultar(
            f"{SELECT_PUBLICACION} WHERE p.id = %s AND {VISIBLE_PARA}",
            [publicacion_id, usuario_id, usuario_id],
        )
        publicaciones = self._con_etiquetas(filas)
        return publicaciones[0] if publicaciones else None

    def listar_etiquetas(self, usuario_id, buscar=None):
        params = [usuario_id, usuario_id]
        filtro = ""
        if buscar:
            filtro = "AND e.nombre LIKE %s"
            params.append(f"%{_escapar_like(buscar)}%")

        filas = self._consultar(
            f"""SELECT e.nombre, COUNT(*) AS total
                FROM publicacion p
                JOIN publicacion_etiqueta pe ON pe.publicacion_id = p.id
                JOIN etiqueta e ON e.id = pe.etiqueta_id
                WHERE {VISIBLE_PARA} {filtro}
                GROUP BY e.id, e.nombre
                ORDER BY total DESC, e.nombre ASC""",
            params,
        )
        return [{"nombre": f["nombre"], "total": int(f["total"])} for f in filas]

    def _consultar(self, sql, params):
        conexion = self.obtener_conexion()
        try:
            cursor = conexion.cursor(dictionary=True)
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            conexion.close()

    def _con_etiquetas(self, filas):
        """Trae las etiquetas de todas las publicaciones en una sola consulta."""
        if not filas:
            return []

        ids = [fila["id"] for fila in filas]
        marcadores = ", ".join(["%s"] * len(ids))
        etiquetas = self._consultar(
            f"""SELECT pe.publicacion_id AS publicacionId, e.nombre, pe.confianza
                FROM publicacion_etiqueta pe
                JOIN etiqueta e ON e.id = pe.etiqueta_id
                WHERE pe.publicacion_id IN ({marcadores})
                ORDER BY pe.confianza DESC, e.nombre ASC""",
            ids,
        )

        por_publicacion = {id_: [] for id_ in ids}
        for etiqueta in etiquetas:
            por_publicacion[etiqueta["publicacionId"]].append(
                {"nombre": etiqueta["nombre"], "confianza": float(etiqueta["confianza"])}
            )

        return [
            {
                "id": fila["id"],
                "descripcion": fila["descripcion"],
                "imagenUrl": fila["imagenUrl"],
                "fechaPublicacion": fila["fechaPublicacion"],
                "autor": {
                    "id": fila["autorId"],
                    "nombreCompleto": fila["autorNombreCompleto"],
                    "fotoPerfilUrl": fila["autorFotoPerfilUrl"],
                },
                "etiquetas": por_publicacion[fila["id"]],
                "totalComentarios": int(fila["totalComentarios"]),
            }
            for fila in filas
        ]
