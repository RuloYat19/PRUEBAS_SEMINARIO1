from flask import request, jsonify
from src.modules.movies.services import MoviesService
from src.shared.errors import ValidationError

class MoviesController:
    @staticmethod
    def get_all_movies():
        """GET /movies - Obtiene todas las películas"""
        movies = MoviesService.get_all_movies()
        return jsonify(movies), 200

    @staticmethod
    def get_movie(movie_id):
        """GET /movies/:id - Obtiene una película específica"""
        try:
            movie_id = int(movie_id)
        except ValueError:
            raise ValidationError('ID de película inválido')
        
        movie = MoviesService.get_movie_by_id(movie_id)
        return jsonify(movie), 200

    @staticmethod
    def get_available_movies():
        """GET /movies/available - Obtiene solo películas disponibles"""
        movies = MoviesService.get_available_movies()
        return jsonify(movies), 200

    @staticmethod
    def create_movie():
        """POST /movies - Crea una nueva película"""
        titulo = request.form.get('titulo')
        director = request.form.get('director')
        anio_estreno = request.form.get('anio_estreno')
        url_contenido = request.form.get('url_contenido')
        estado = request.form.get('estado')
        
        # Validaciones básicas
        if not titulo:
            raise ValidationError('El título es requerido')
        if not director:
            raise ValidationError('El director es requerido')
        if not anio_estreno:
            raise ValidationError('El año de estreno es requerido')
        if not url_contenido:
            raise ValidationError('La URL de contenido es requerida')
        if not estado or estado not in ['Disponible', 'Próximo estreno']:
            raise ValidationError('El estado debe ser "Disponible" o "Próximo estreno"')
        
        # Procesar poster
        poster = request.files.get('poster')
        poster_data = None
        poster_extension = None
        
        if poster:
            # Validar tamaño
            if not MoviesController._validate_file_size(poster):
                raise ValidationError(f'El poster no puede exceder los 5MB')
            
            poster_data = poster.read()
            poster_extension = poster.filename.rsplit('.', 1)[1].lower() if '.' in poster.filename else ''
            
            if poster_extension not in {'jpg', 'jpeg', 'png', 'webp'}:
                raise ValidationError('Formato de imagen no soportado. Use JPEG, PNG o WebP')
        
        movie = MoviesService.create_movie(
            titulo, director, anio_estreno, url_contenido, estado,
            poster_data, poster_extension
        )
        
        return jsonify(movie), 201

    @staticmethod
    def _validate_file_size(file):
        from src.config import Config
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size <= Config.MAX_FILE_SIZE_BYTES