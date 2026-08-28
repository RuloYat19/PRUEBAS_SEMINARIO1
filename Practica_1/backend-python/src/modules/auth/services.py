import hashlib
from src.infrastructure.database import db
from src.infrastructure.s3_client import s3_client
from src.shared.errors import ConflictError, AuthenticationError, ValidationError
from src.shared.validators import validate_email, validate_password, validate_name

class AuthService:
    @staticmethod
    def hash_password(password):
        """Encripta contraseña con MD5 (requisito obligatorio)"""
        return hashlib.md5(password.encode('utf-8')).hexdigest()

    @staticmethod
    def register(correo, nombre, password, confirm_password, foto_data=None, foto_extension=None):
        # Validaciones
        email = validate_email(correo)
        name = validate_name(nombre)
        passwd = validate_password(password, confirm_password)
        
        # Verificar que el correo no exista
        existing = db.execute_query(
            "SELECT id FROM usuarios WHERE correo = %s",
            (email,),
            fetch_one=True
        )
        if existing:
            raise ConflictError('El correo electrónico ya está registrado')
        
        # Subir foto a S3 si se proporcionó
        foto_path = None
        if foto_data:
            if not foto_extension:
                raise ValidationError('No se pudo determinar la extensión de la foto')
            foto_path = s3_client.upload_profile_photo(foto_data, foto_extension)
        
        # Encriptar contraseña con MD5
        hashed_password = AuthService.hash_password(passwd)
        
        # Guardar usuario en la base (MySQL)
        query = """
            INSERT INTO usuarios (correo, nombre, password, foto_perfil, fecha_registro)
            VALUES (%s, %s, %s, %s, NOW())
        """
        # MySQL no tiene RETURNING, tenemos que hacer un SELECT después
        db.execute_query(query, (email, name, hashed_password, foto_path))
        
        # Obtener el usuario recién creado
        user = db.execute_query(
            "SELECT id, correo, nombre, foto_perfil, fecha_registro FROM usuarios WHERE correo = %s",
            (email,),
            fetch_one=True
        )
        
        return dict(user)

    @staticmethod
    def login(correo, password):
        if not correo or not password:
            raise ValidationError('Correo y contraseña son requeridos')
        
        email = validate_email(correo)
        hashed_password = AuthService.hash_password(password)
        
        query = """
            SELECT id, correo, nombre, foto_perfil, fecha_registro
            FROM usuarios
            WHERE correo = %s AND password = %s
        """
        user = db.execute_query(query, (email, hashed_password), fetch_one=True)
        
        if not user:
            raise AuthenticationError('Correo o contraseña incorrectos')
        
        # Agregar URL pública de la foto
        if user.get('foto_perfil'):
            user['foto_perfil_url'] = s3_client.get_public_url(user['foto_perfil'])
        else:
            user['foto_perfil_url'] = None
        
        return dict(user)