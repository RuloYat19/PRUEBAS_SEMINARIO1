from functools import wraps
from flask import request, jsonify
from src.shared.errors import AuthenticationError, ValidationError
import traceback

def require_auth(f):
    """Middleware para verificar autenticación via header"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            print("="*50)
            print("🔍 MIDDLEWARE - require_auth")
            print("="*50)
            print(f"🔍 Headers: {dict(request.headers)}")
            
            # En una implementación real, verificarías un token JWT
            # Aquí asumimos que el frontend envía un userId en el header
            user_id = request.headers.get('X-User-Id')
            print(f"🔍 X-User-Id header: {user_id}")
            
            if not user_id:
                print("❌ No se encontró X-User-Id en los headers")
                raise AuthenticationError('Se requiere autenticación')
            
            try:
                user_id = int(user_id)
                print(f"✅ user_id convertido a entero: {user_id}")
            except ValueError:
                print(f"❌ user_id no es un número válido: {user_id}")
                raise AuthenticationError('ID de usuario inválido')
            
            kwargs['user_id'] = user_id
            print(f"✅ Autenticación exitosa para usuario: {user_id}")
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"❌ ERROR EN MIDDLEWARE: {e}")
            traceback.print_exc()
            raise
    
    return decorated

def validate_multipart(f):
    """Valida que la petición sea multipart/form-data"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method in ['POST', 'PUT'] and not request.files and not request.form:
            raise ValidationError('La petición debe ser multipart/form-data')
        return f(*args, **kwargs)
    return decorated