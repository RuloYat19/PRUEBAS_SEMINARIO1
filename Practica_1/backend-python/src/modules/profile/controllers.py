from flask import request, jsonify
from src.modules.profile.services import ProfileService
from src.shared.errors import ValidationError
from src.shared.validators import validate_file_extension

class ProfileController:
    @staticmethod
    def get_profile(user_id):
        """GET /profile/:userId - Obtiene el perfil de un usuario"""
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        profile = ProfileService.get_profile(user_id)
        return jsonify(profile), 200

    @staticmethod
    def update_profile(user_id):
        """PUT /profile/:userId - Actualiza el perfil de un usuario"""
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        # Obtener datos del formulario
        nombre = request.form.get('nombre')
        password_actual = request.form.get('passwordActual')
        
        # Procesar foto
        foto = request.files.get('foto')
        foto_data = None
        foto_extension = None
        
        if foto:
            if not ProfileController._validate_file_size(foto):
                raise ValidationError(f'La foto no puede exceder los 5MB')
            
            foto_data = foto.read()
            foto_extension = foto.filename.rsplit('.', 1)[1].lower() if '.' in foto.filename else ''
            
            if foto_extension not in {'jpg', 'jpeg', 'png', 'webp'}:
                raise ValidationError('Formato de imagen no soportado. Use JPEG, PNG o WebP')
        
        updated_profile = ProfileService.update_profile(
            user_id, nombre, password_actual, foto_data, foto_extension
        )
        
        return jsonify(updated_profile), 200

    @staticmethod
    def update_profile_photo(user_id):
        """PUT /profile/:userId/photo - Actualiza solo la foto de perfil"""
        try:
            user_id = int(user_id)
        except ValueError:
            raise ValidationError('ID de usuario inválido')
        
        foto = request.files.get('foto')
        if not foto:
            raise ValidationError('Se requiere una foto para actualizar')
        
        if not ProfileController._validate_file_size(foto):
            raise ValidationError(f'La foto no puede exceder los 5MB')
        
        foto_data = foto.read()
        foto_extension = foto.filename.rsplit('.', 1)[1].lower() if '.' in foto.filename else ''
        
        if foto_extension not in {'jpg', 'jpeg', 'png', 'webp'}:
            raise ValidationError('Formato de imagen no soportado. Use JPEG, PNG o WebP')
        
        updated_profile = ProfileService.update_profile_photo_only(
            user_id, foto_data, foto_extension
        )
        
        return jsonify(updated_profile), 200

    @staticmethod
    def _validate_file_size(file):
        from src.config import Config
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size <= Config.MAX_FILE_SIZE_BYTES