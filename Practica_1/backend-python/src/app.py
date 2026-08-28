from flask import Flask, jsonify
from flask_cors import CORS
from src.config import Config
from src.modules.auth.routes import auth_bp
from src.modules.movies.routes import movies_bp
from src.modules.profile.routes import profile_bp
from src.modules.playlist.routes import playlist_bp
from src.shared.errors import error_handler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE_BYTES
    
    # CORS
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)
    
    # Health check (debe responder siempre)
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'server': 'python'}), 200
    
    # Registrar blueprints (comentados por ahora)
    app.register_blueprint(auth_bp, url_prefix='')
    app.register_blueprint(movies_bp, url_prefix='')
    app.register_blueprint(profile_bp, url_prefix='')
    app.register_blueprint(playlist_bp, url_prefix='')
    
    # Manejo de errores global
    app.errorhandler(Exception)(error_handler)
    
    return app