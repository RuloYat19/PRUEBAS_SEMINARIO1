from flask import request, jsonify
from src.modules.playlist.services import PlaylistService
from src.shared.errors import ValidationError
import traceback

class PlaylistController:
    @staticmethod
    def get_user_playlist(user_id, **kwargs):
        """GET /playlist/:userId - Obtiene la lista de reproducción del usuario"""
        try:
            print(f"🔍 GET /playlist/{user_id}")
            user_id = int(user_id)
            playlist = PlaylistService.get_user_playlist(user_id)
            return jsonify(playlist), 200
        except Exception as e:
            print(f"❌ Error en get_user_playlist: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def add_to_playlist(**kwargs):
        """POST /playlist - Agrega una película a la lista de reproducción"""
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
    def remove_from_playlist(playlist_id, **kwargs):
        """DELETE /playlist/:id - Elimina una película de la lista de reproducción"""
        try:
            print(f"🔍 DELETE /playlist/{playlist_id}")
            playlist_id = int(playlist_id)
            
            # Obtener user_id del header (autenticación)
            user_id = request.headers.get('X-User-Id')
            if not user_id:
                raise ValidationError('Se requiere autenticación')
            
            user_id = int(user_id)
            
            PlaylistService.remove_from_playlist(playlist_id, user_id)
            return '', 204
            
        except Exception as e:
            print(f"❌ Error en remove_from_playlist: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def check_in_playlist(user_id, movie_id, **kwargs):
        """GET /playlist/check/:userId/:movieId - Verifica si una película está en la lista"""
        try:
            print(f"🔍 GET /playlist/check/{user_id}/{movie_id}")
            user_id = int(user_id)
            movie_id = int(movie_id)
            
            exists = PlaylistService.is_movie_in_playlist(user_id, movie_id)
            return jsonify({'inPlaylist': exists}), 200
            
        except Exception as e:
            print(f"❌ Error en check_in_playlist: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def get_playlist_count(user_id, **kwargs):
        """GET /playlist/count/:userId - Obtiene el conteo de la lista de reproducción"""
        try:
            print(f"🔍 GET /playlist/count/{user_id}")
            user_id = int(user_id)
            
            count = PlaylistService.get_playlist_count(user_id)
            return jsonify({'count': count}), 200
            
        except Exception as e:
            print(f"❌ Error en get_playlist_count: {e}")
            traceback.print_exc()
            raise