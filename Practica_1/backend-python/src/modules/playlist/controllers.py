from flask import request, jsonify
from src.modules.playlist.services import PlaylistService
from src.shared.errors import ValidationError

class PlaylistController:
    @staticmethod
    def get_user_playlist(user_id):
        """GET /playlist/:userId - Obtiene la lista de reproducción del usuario"""
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        playlist = PlaylistService.get_user_playlist(user_id)
        return jsonify(playlist), 200

    @staticmethod
    def add_to_playlist():
        try:
            print("="*50)
            print("🔍 PLAYLIST CONTROLLER - add_to_playlist")
            print("="*50)
            
            data = request.get_json()
            print(f"🔍 Datos recibidos: {data}")
            
            if not data:
                raise ValidationError('Se requiere JSON en el body')
            
            user_id = data.get('userId')
            movie_id = data.get('movieId')
            
            print(f"🔍 userId: {user_id}, movieId: {movie_id}")
            
            if not user_id:
                raise ValidationError('userId es requerido')
            if not movie_id:
                raise ValidationError('movieId es requerido')
            
            try:
                user_id = int(user_id)
                movie_id = int(movie_id)
            except ValueError:
                raise ValidationError('userId y movieId deben ser números enteros')
            
            print(f"🔍 Llamando a PlaylistService.add_to_playlist({user_id}, {movie_id})")
            
            playlist_item = PlaylistService.add_to_playlist(user_id, movie_id)
            
            print(f"✅ Playlist item creado: {playlist_item}")
            return jsonify(playlist_item), 201
            
        except Exception as e:
            print(f"❌ ERROR EN add_to_playlist CONTROLLER: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def remove_from_playlist(playlist_id):
        """DELETE /playlist/:id - Elimina una película de la lista de reproducción"""
        try:
            playlist_id = int(playlist_id)
        except ValueError:
            raise ValidationError('ID de lista inválido')
        
        # Obtener user_id del header (autenticación)
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            raise ValidationError('Se requiere autenticación')
        
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        PlaylistService.remove_from_playlist(playlist_id, user_id)
        return '', 204

    @staticmethod
    def check_in_playlist(user_id, movie_id):
        """GET /playlist/check/:userId/:movieId - Verifica si una película está en la lista"""
        try:
            user_id = int(user_id)
            movie_id = int(movie_id)
        except ValueError:
            raise ValidationError('IDs deben ser números enteros')
        
        exists = PlaylistService.is_movie_in_playlist(user_id, movie_id)
        return jsonify({'inPlaylist': exists}), 200

    @staticmethod
    def get_playlist_count(user_id):
        """GET /playlist/count/:userId - Obtiene el conteo de la lista de reproducción"""
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        count = PlaylistService.get_playlist_count(user_id)
        return jsonify({'count': count}), 200