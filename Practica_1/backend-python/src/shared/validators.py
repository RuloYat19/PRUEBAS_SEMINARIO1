import re
from src.shared.errors import ValidationError

def validate_email(email):
    if not email:
        raise ValidationError('El correo electrónico es requerido')
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError('El formato del correo no es válido')
    return email

def validate_password(password, confirm_password):
    if not password:
        raise ValidationError('La contraseña es requerida')
    if len(password) < 6:
        raise ValidationError('La contraseña debe tener al menos 6 caracteres')
    if password != confirm_password:
        raise ValidationError('Las contraseñas no coinciden')
    return password

def validate_name(name):
    if not name or not name.strip():
        raise ValidationError('El nombre es requerido')
    return name.strip()

def validate_file_extension(filename):
    if not filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    from src.config import Config
    return extension in Config.ALLOWED_EXTENSIONS