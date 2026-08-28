from src.infrastructure.database import db
from src.infrastructure.s3_client import s3_client
from src.shared.errors import NotFoundError, ConflictError, ValidationError
import logging

logger = logging.getLogger(__name__)

class PlaylistService:
    @staticmethod
    def get_user_playlist(user_id):
        """Obtiene la lista de reproducción de un usuario"""
        query = """
            SELECT 
                lr.id as playlist_id,
                lr.fecha_agregado,
                p.id as movie_id,
                p.titulo,
                p.director,
                p.anio,
                p.url_contenido,
                p.estado,
                p.poster
            FROM lista_reproduccion lr
            JOIN peliculas p ON lr.pelicula_id = p.id
            WHERE lr.usuario_id = %s
            ORDER BY lr.fecha_agregado DESC
        """
        playlist_items = db.execute_query(query, (user_id,), fetch_all=True)
        
        result = []
        for item in playlist_items:
            item_dict = dict(item)
            if item_dict.get('poster'):
                item_dict['poster_url'] = s3_client.get_public_url(item_dict['poster'])
            else:
                item_dict['poster_url'] = None
            if item_dict.get('estado') == 'DISPONIBLE':
                item_dict['estado'] = 'Disponible'
            elif item_dict.get('estado') == 'PROXIMO_ESTRENO':
                item_dict['estado'] = 'Próximo estreno'
            result.append(item_dict)
        
        return result

    @staticmethod
    def add_to_playlist(user_id, movie_id):
        try:
            print("="*50)
            print("🔍 PLAYLIST SERVICE - add_to_playlist")
            print("="*50)
            print(f"🔍 user_id: {user_id}, movie_id: {movie_id}")
            
            # Verificar que el usuario existe
            print(f"🔍 Verificando usuario ID: {user_id}")
            user = db.execute_query(
                "SELECT id FROM usuarios WHERE id = %s",
                (user_id,),
                fetch_one=True
            )
            print(f"🔍 Resultado usuario: {user}")
            if not user:
                raise NotFoundError(f'Usuario con ID {user_id} no encontrado')
            print(f"✅ Usuario encontrado")
            
            # Verificar que la película existe y está disponible
            print(f"🔍 Verificando película ID: {movie_id}")
            movie = db.execute_query(
                "SELECT id, estado FROM peliculas WHERE id = %s",
                (movie_id,),
                fetch_one=True
            )
            print(f"🔍 Resultado película: {movie}")
            if not movie:
                raise NotFoundError(f'Película con ID {movie_id} no encontrada')
            
            if movie['estado'] != 'DISPONIBLE':
                raise ValidationError('La película no está disponible para agregar a la lista')
            print(f"✅ Película disponible")
            
            # Verificar que no esté ya en la lista
            print(f"🔍 Verificando duplicado en lista_reproduccion...")
            existing = db.execute_query(
                "SELECT id FROM lista_reproduccion WHERE usuario_id = %s AND pelicula_id = %s",
                (user_id, movie_id),
                fetch_one=True
            )
            print(f"🔍 Resultado duplicado: {existing}")
            if existing:
                raise ConflictError('La película ya está en tu lista de reproducción')
            print(f"✅ No está duplicada")
            
            # Agregar a la lista
            print(f"🔍 Insertando en lista_reproduccion...")
            query = """
                INSERT INTO lista_reproduccion (usuario_id, pelicula_id, fecha_agregado)
                VALUES (%s, %s, NOW())
            """
            result = db.execute_query(query, (user_id, movie_id))
            print(f"🔍 Resultado INSERT: {result}")
            print(f"✅ INSERT ejecutado")
            
            # Obtener el item recién creado
            print(f"🔍 Obteniendo el item creado...")
            playlist_item = db.execute_query(
                """
                SELECT id, usuario_id, pelicula_id, fecha_agregado
                FROM lista_reproduccion 
                WHERE usuario_id = %s AND pelicula_id = %s
                ORDER BY id DESC LIMIT 1
                """,
                (user_id, movie_id),
                fetch_one=True
            )
            print(f"🔍 Item creado: {playlist_item}")
            
            return dict(playlist_item)
            
        except Exception as e:
            print(f"❌ ERROR EN PlaylistService.add_to_playlist: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def remove_from_playlist(playlist_id, user_id):
        """Elimina una película de la lista de reproducción"""
        # Verificar que el item existe y pertenece al usuario
        item = db.execute_query(
            "SELECT id, usuario_id FROM lista_reproduccion WHERE id = %s",
            (playlist_id,),
            fetch_one=True
        )
        
        if not item:
            raise NotFoundError(f'Elemento de lista con ID {playlist_id} no encontrado')
        
        if item['usuario_id'] != user_id:
            raise ValidationError('No tienes permiso para eliminar este elemento de la lista')
        
        query = "DELETE FROM lista_reproduccion WHERE id = %s"
        rows_affected = db.execute_query(query, (playlist_id,))
        
        if rows_affected == 0:
            raise NotFoundError(f'Elemento de lista con ID {playlist_id} no encontrado')
        
        return True

    @staticmethod
    def is_movie_in_playlist(user_id, movie_id):
        """Verifica si una película está en la lista de reproducción del usuario"""
        result = db.execute_query(
            "SELECT id FROM lista_reproduccion WHERE usuario_id = %s AND pelicula_id = %s",
            (user_id, movie_id),
            fetch_one=True
        )
        return result is not None