from flask import request, jsonify
from src.modules.auth.services import AuthService
from src.shared.errors import ValidationError

class AuthController:
    @staticmethod
    def register():
        # Obtener datos del formulario
        correo = request.form.get('correo')
        nombre = request.form.get('nombre')
        password = request.form.get('password')
        confirm_password = request.form.get('confirmPassword')
        
        # Procesar la foto
        foto = request.files.get('foto')
        foto_data = None
        foto_extension = None
        
        if foto:
            if not AuthController._validate_file_size(foto):
                raise ValidationError(f'La foto no puede exceder los 5MB')
            
            foto_data = foto.read()
            foto_extension = foto.filename.rsplit('.', 1)[1].lower() if '.' in foto.filename else ''
            
            if foto_extension not in {'jpg', 'jpeg', 'png', 'webp'}:
                raise ValidationError('Formato de imagen no soportado. Use JPEG, PNG o WebP')
        
        user = AuthService.register(
            correo, nombre, password, confirm_password,
            foto_data, foto_extension
        )
        
        return jsonify({'usuario': user}), 201

    @staticmethod
    def login():
        data = request.get_json()
        if not data:
            raise ValidationError('Se requiere JSON en el body')
        
        correo = data.get('correo')
        password = data.get('password')
        
        user = AuthService.login(correo, password)
        return jsonify({'usuario': user}), 200

    @staticmethod
    def _validate_file_size(file):
        from src.config import Config
        file.seek(0, 2)  # Ir al final del archivo
        size = file.tell()
        file.seek(0)  # Volver al inicio
        return size <= Config.MAX_FILE_SIZE_BYTES