from flask import Blueprint
from src.modules.playlist.controllers import PlaylistController
from src.shared.middleware import require_auth

playlist_bp = Blueprint('playlist', __name__)

# Todas las rutas de playlist requieren autenticación
playlist_bp.route('/playlist/<user_id>', methods=['GET'])(require_auth(PlaylistController.get_user_playlist))
playlist_bp.route('/playlist', methods=['POST'])(require_auth(PlaylistController.add_to_playlist))
playlist_bp.route('/playlist/<playlist_id>', methods=['DELETE'])(require_auth(PlaylistController.remove_from_playlist))
playlist_bp.route('/playlist/check/<user_id>/<movie_id>', methods=['GET'])(require_auth(PlaylistController.check_in_playlist))
playlist_bp.route('/playlist/count/<user_id>', methods=['GET'])(require_auth(PlaylistController.get_playlist_count))