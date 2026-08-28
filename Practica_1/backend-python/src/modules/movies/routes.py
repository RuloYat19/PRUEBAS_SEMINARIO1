from flask import Blueprint
from src.modules.movies.controllers import MoviesController
from src.shared.middleware import require_auth

movies_bp = Blueprint('movies', __name__)

# Rutas públicas (no requieren autenticación)
movies_bp.route('/movies', methods=['GET'])(MoviesController.get_all_movies)
movies_bp.route('/movies/available', methods=['GET'])(MoviesController.get_available_movies)
movies_bp.route('/movies/<movie_id>', methods=['GET'])(MoviesController.get_movie)

# Ruta protegida (solo admin - opcional)
movies_bp.route('/movies', methods=['POST'])(MoviesController.create_movie)