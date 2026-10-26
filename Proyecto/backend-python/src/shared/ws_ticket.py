import base64
import hashlib
import hmac
import json
import secrets
import time

TTL_SEGUNDOS=30

def _b64url(data): return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

def emitir_ticket(usuario_id,secret,now=None):
    if not isinstance(secret,str) or len(secret)<32: raise ValueError("WS_TICKET_SECRET debe tener al menos 32 caracteres")
    ahora=int(time.time() if now is None else now)
    payload={"uid":int(usuario_id),"exp":ahora+TTL_SEGUNDOS,"jti":secrets.token_urlsafe(12)}
    cuerpo=_b64url(json.dumps(payload,separators=(",",":"),sort_keys=True).encode("utf-8"))
    firma=_b64url(hmac.new(secret.encode("utf-8"),cuerpo.encode("ascii"),hashlib.sha256).digest())
    return f"{cuerpo}.{firma}"

def validar_ticket(ticket,secret,now=None):
    if not isinstance(secret,str) or len(secret)<32 or not isinstance(ticket,str): return None
    try:
        cuerpo,firma=ticket.split(".",1)
        esperado=_b64url(hmac.new(secret.encode("utf-8"),cuerpo.encode("ascii"),hashlib.sha256).digest())
        if not hmac.compare_digest(firma,esperado): return None
        payload=json.loads(base64.urlsafe_b64decode(cuerpo+"="*((4-len(cuerpo)%4)%4)))
        actual=int(time.time() if now is None else now)
        usuario_id=payload.get("uid"); exp=payload.get("exp")
        if not isinstance(usuario_id,int) or usuario_id<=0 or not isinstance(exp,int) or exp<actual or exp>actual+TTL_SEGUNDOS:
            return None
        if not isinstance(payload.get("jti"),str): return None
        return usuario_id
    except (ValueError,TypeError,KeyError,json.JSONDecodeError):
        return None
