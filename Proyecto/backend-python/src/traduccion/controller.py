from flask import g, jsonify, request

from src.traduccion import errors, schemas


class TraduccionController:
    def __init__(self, traduccion_service):
        self.traduccion_service = traduccion_service

    def traducir(self):
        if not (getattr(g, "usuario", None) or {}).get("id"):
            raise errors.no_autenticado()
        data = schemas.traducir(request.get_json(silent=True))
        traduccion = self.traduccion_service.traducir(**data)
        return jsonify({"traduccion": traduccion}), 200
