from src.infrastructure.database import db
from src.infrastructure.s3_client import s3_client
from src.shared.errors import NotFoundError, ConflictError, ValidationError
import logging

logger = logging.getLogger(__name__)

class MoviesService:
    @staticmethod
    def get_all_movies():
        """Obtiene todas las películas de la base de datos"""
        query = """
            SELECT 
                id, 
                titulo, 
                director, 
                anio, 
                url_contenido, 
                estado,
                poster
            FROM peliculas
            ORDER BY titulo ASC
        """
        movies = db.execute_query(query, fetch_all=True)
        
        result = []
        for movie in movies:
            movie_dict = dict(movie)
            if movie_dict.get('poster'):
                movie_dict['poster_url'] = s3_client.get_public_url(movie_dict['poster'])
            else:
                movie_dict['poster_url'] = None
            # Convertir estado a formato amigable
            if movie_dict.get('estado') == 'DISPONIBLE':
                movie_dict['estado'] = 'Disponible'
            elif movie_dict.get('estado') == 'PROXIMO_ESTRENO':
                movie_dict['estado'] = 'Próximo estreno'
            result.append(movie_dict)
        
        return result

    @staticmethod
    def get_movie_by_id(movie_id):
        """Obtiene una película por su ID"""
        query = """
            SELECT 
                id, 
                titulo, 
                director, 
                anio, 
                url_contenido, 
                estado,
                poster
            FROM peliculas
            WHERE id = %s
        """
        movie = db.execute_query(query, (movie_id,), fetch_one=True)
        
        if not movie:
            raise NotFoundError(f'Película con ID {movie_id} no encontrada')
        
        movie_dict = dict(movie)
        if movie_dict.get('poster'):
            movie_dict['poster_url'] = s3_client.get_public_url(movie_dict['poster'])
        else:
            movie_dict['poster_url'] = None
            
        if movie_dict.get('estado') == 'DISPONIBLE':
            movie_dict['estado'] = 'Disponible'
        elif movie_dict.get('estado') == 'PROXIMO_ESTRENO':
            movie_dict['estado'] = 'Próximo estreno'
        
        return movie_dict

    @staticmethod
    def get_available_movies():
        """Obtiene solo las películas disponibles"""
        query = """
            SELECT 
                id, 
                titulo, 
                director, 
                anio, 
                url_contenido, 
                estado,
                poster
            FROM peliculas
            WHERE estado = 'DISPONIBLE'
            ORDER BY titulo ASC
        """
        movies = db.execute_query(query, fetch_all=True)
        
        result = []
        for movie in movies:
            movie_dict = dict(movie)
            if movie_dict.get('poster'):
                movie_dict['poster_url'] = s3_client.get_public_url(movie_dict['poster'])
            else:
                movie_dict['poster_url'] = None
            movie_dict['estado'] = 'Disponible'
            result.append(movie_dict)
        
        return result