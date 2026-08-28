from functools import wraps
from flask import request, jsonify
from src.shared.errors import AuthenticationError, ValidationError

def require_auth(f):
    """Middleware para verificar autenticación via header"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # En una implementación real, verificarías un token JWT
        # Aquí asumimos que el frontend envía un userId en el header
        user_id = request.headers.get('X-User-Id')
        if not user_id:
            raise AuthenticationError('Se requiere autenticación')
        
        try:
            user_id = int(user_id)
        except ValueError:
            raise AuthenticationError('ID de usuario inválido')
            
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    return decorated

def validate_multipart(f):
    """Valida que la petición sea multipart/form-data"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method in ['POST', 'PUT'] and not request.files and not request.form:
            raise ValidationError('La petición debe ser multipart/form-data')
        return f(*args, **kwargs)
    return decorated