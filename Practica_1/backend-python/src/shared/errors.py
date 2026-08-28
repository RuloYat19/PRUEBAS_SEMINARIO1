from flask import jsonify

class AppError(Exception):
    def __init__(self, code, message, details=None, status_code=400):
        self.code = code
        self.message = message
        self.details = details or []
        self.status_code = status_code
        super().__init__(message)

class ValidationError(AppError):
    def __init__(self, message, details=None):
        super().__init__('VALIDATION_ERROR', message, details, 400)

class AuthenticationError(AppError):
    def __init__(self, message='Credenciales incorrectas'):
        super().__init__('AUTHENTICATION_ERROR', message, status_code=401)

class ConflictError(AppError):
    def __init__(self, message):
        super().__init__('CONFLICT_ERROR', message, status_code=409)

class NotFoundError(AppError):
    def __init__(self, message):
        super().__init__('NOT_FOUND', message, status_code=404)

def error_handler(error):
    if isinstance(error, AppError):
        response = {
            'error': {
                'code': error.code,
                'message': error.message,
                'details': error.details
            }
        }
        return jsonify(response), error.status_code
    
    # Error no manejado
    return jsonify({
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'Ocurrió un error interno en el servidor'
        }
    }), 500