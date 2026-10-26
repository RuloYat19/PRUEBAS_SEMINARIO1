from functools import lru_cache
import jwt
from jwt import PyJWKClient
from flask import g, jsonify, request
from src.config import COGNITO_CLIENT_ID,COGNITO_USER_POOL_ID,AWS_REGION,WS_TICKET_SECRET
from src.shared.ws_ticket import validar_ticket

_PUBLICAS=("/health",)

@lru_cache(maxsize=1)
def _jwks():
    issuer=f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
    return issuer,PyJWKClient(f"{issuer}/.well-known/jwks.json",cache_keys=True)

def instalar_autenticacion(app,obtener_conexion,origins=()):
    origenes=set(origins)
    @app.before_request
    def validar_token():
        origin=request.headers.get("Origin")
        if origin and origin not in origenes:
            return jsonify({"error":"Origen no permitido"}),403
        if request.method=="OPTIONS": return "",204
        if request.path in _PUBLICAS or request.path.startswith("/static/") or request.path.startswith("/auth/"): return
        if request.path=="/chat":
            usuario_id=validar_ticket(request.args.get("ticket"),WS_TICKET_SECRET)
            if not usuario_id: return jsonify({"error":"Ticket WebSocket inválido o vencido"}),401
            g.usuario={"id":usuario_id}
            return
        cabecera=request.headers.get("Authorization","")
        token=cabecera[7:] if cabecera.startswith("Bearer ") else None
        if not token or not COGNITO_USER_POOL_ID or not COGNITO_CLIENT_ID:
            return jsonify({"error":"No autenticado"}),401
        try:
            issuer,keys=_jwks()
            key=keys.get_signing_key_from_jwt(token).key
            claims=jwt.decode(token,key,algorithms=["RS256"],issuer=issuer,options={"verify_aud":False})
            if claims.get("token_use")!="access" or claims.get("client_id")!=COGNITO_CLIENT_ID:
                raise jwt.InvalidTokenError("Token Cognito no válido para este cliente")
            conn=obtener_conexion()
            try:
                cur=conn.cursor(dictionary=True); cur.execute("SELECT id FROM usuario WHERE cognito_sub=%s",(claims["sub"],)); user=cur.fetchone()
            finally: conn.close()
            if not user: return jsonify({"error":"No autenticado"}),401
            g.usuario={"id":user["id"],"sub":claims["sub"]}
        except Exception:
            return jsonify({"error":"No autenticado"}),401

    @app.after_request
    def encabezados_seguridad(response):
        origin=request.headers.get("Origin")
        if origin and origin in origenes:
            response.headers["Access-Control-Allow-Origin"]=origin
            response.headers["Access-Control-Allow-Methods"]="GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"]="Authorization, Content-Type"
            response.headers["Access-Control-Max-Age"]="600"
            response.headers.add("Vary","Origin")
        response.headers["X-Content-Type-Options"]="nosniff"
        response.headers["X-Frame-Options"]="DENY"
        response.headers["Referrer-Policy"]="no-referrer"
        if request.path.startswith("/auth/"): response.headers["Cache-Control"]="no-store"
        return response
