from src.infrastructure.database import db
from src.infrastructure.s3_client import s3_client
from src.modules.auth.services import AuthService
from src.shared.errors import NotFoundError, AuthenticationError, ValidationError
from src.shared.validators import validate_name
import logging

logger = logging.getLogger(__name__)

class ProfileService:
    @staticmethod
    def get_profile(user_id):
        """Obtiene el perfil de un usuario por su ID"""
        query = """
            SELECT id, correo, nombre, foto_perfil, fecha_registro
            FROM usuarios
            WHERE id = %s
        """
        user = db.execute_query(query, (user_id,), fetch_one=True)
        
        if not user:
            raise NotFoundError(f'Usuario con ID {user_id} no encontrado')
        
        user_dict = dict(user)
        if user_dict.get('foto_perfil'):
            user_dict['foto_perfil_url'] = s3_client.get_public_url(user_dict['foto_perfil'])
        else:
            user_dict['foto_perfil_url'] = None
        
        return user_dict

    @staticmethod
    def update_profile(user_id, nombre, password_actual, foto_data=None, foto_extension=None):
        """Actualiza el perfil de un usuario"""
        name = validate_name(nombre)
        
        if not password_actual:
            raise ValidationError('La contraseña actual es requerida para modificar el perfil')
        
        # Obtener usuario actual
        current_user = db.execute_query(
            "SELECT id, password, foto_perfil FROM usuarios WHERE id = %s",
            (user_id,),
            fetch_one=True
        )
        
        if not current_user:
            raise NotFoundError(f'Usuario con ID {user_id} no encontrado')
        
        # Verificar contraseña con MD5
        hashed_password = AuthService.hash_password(password_actual)
        if current_user['password'] != hashed_password:
            raise AuthenticationError('La contraseña actual es incorrecta')
        
        old_photo_key = current_user.get('foto_perfil')
        new_photo_key = None
        
        # Subir nueva foto si se proporcionó
        if foto_data:
            if not foto_extension:
                raise ValidationError('No se pudo determinar la extensión de la foto')
            new_photo_key = s3_client.upload_profile_photo(foto_data, foto_extension)
        
        # Construir query de actualización
        updates = []
        params = []
        
        if name:
            updates.append("nombre = %s")
            params.append(name)
        
        if new_photo_key:
            updates.append("foto_perfil = %s")
            params.append(new_photo_key)
        
        if not updates:
            raise ValidationError('No se proporcionaron campos para actualizar')
        
        params.append(user_id)
        query = f"""
            UPDATE usuarios 
            SET {', '.join(updates)}
            WHERE id = %s
        """
        db.execute_query(query, params)
        
        # Obtener usuario actualizado
        updated_user = db.execute_query(
            "SELECT id, correo, nombre, foto_perfil, fecha_registro FROM usuarios WHERE id = %s",
            (user_id,),
            fetch_one=True
        )
        
        # Eliminar foto vieja de S3 si se actualizó
        if foto_data and old_photo_key and new_photo_key:
            try:
                s3_client.delete_file(old_photo_key)
                logger.info(f"Deleted old profile photo: {old_photo_key}")
            except Exception as e:
                logger.warning(f"Could not delete old profile photo: {e}")
        
        user_dict = dict(updated_user)
        if user_dict.get('foto_perfil'):
            user_dict['foto_perfil_url'] = s3_client.get_public_url(user_dict['foto_perfil'])
        else:
            user_dict['foto_perfil_url'] = None
        
        return user_dict