# Importar todos los módulos para facilitar el registro
from src.modules.auth.routes import auth_bp
from src.modules.movies.routes import movies_bp
from src.modules.profile.routes import profile_bp
from src.modules.playlist.routes import playlist_bp

__all__ = ['auth_bp', 'movies_bp', 'profile_bp', 'playlist_bp']