from flask import Blueprint
from src.modules.profile.controllers import ProfileController
from src.shared.middleware import require_auth

profile_bp = Blueprint('profile', __name__)

# Todas las rutas de perfil requieren autenticación
profile_bp.route('/profile/<user_id>', methods=['GET'])(require_auth(ProfileController.get_profile))
profile_bp.route('/profile/<user_id>', methods=['PUT'])(require_auth(ProfileController.update_profile))
profile_bp.route('/profile/<user_id>/photo', methods=['PUT'])(require_auth(ProfileController.update_profile_photo))