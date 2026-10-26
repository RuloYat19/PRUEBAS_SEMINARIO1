"""Triggers Cognito CUSTOM_AUTH para completar el login facial.

Configurar estos tres handlers en el user pool y compartir
FACIAL_AUTH_SECRET con el backend Python. El valor se guarda en el
administrador de secretos/configuración de Lambda, nunca en Git.
"""
import base64
import hashlib
import hmac
import os
import secrets


def define_auth_challenge(event, context):
    sesiones=event.get("request",{}).get("session",[])
    respuesta=event.setdefault("response",{})
    if not sesiones:
        respuesta.update(challengeName="CUSTOM_CHALLENGE",issueTokens=False,failAuthentication=False)
    elif sesiones[-1].get("challengeName")=="CUSTOM_CHALLENGE" and sesiones[-1].get("challengeResult") is True:
        respuesta.update(issueTokens=True,failAuthentication=False)
    else:
        respuesta.update(issueTokens=False,failAuthentication=True)
    return event


def create_auth_challenge(event, context):
    respuesta=event.setdefault("response",{})
    nonce=secrets.token_urlsafe(32)
    respuesta["publicChallengeParameters"]={"nonce":nonce}
    respuesta["privateChallengeParameters"]={"nonce":nonce}
    respuesta["challengeMetadata"]="SEMI_SOCIAL_FACE_V1"
    return event


def verify_auth_challenge(event, context):
    request=event.get("request",{})
    private=request.get("privateChallengeParameters",{})
    nonce=private.get("nonce","")
    correo=request.get("userAttributes",{}).get("email") or event.get("userName","")
    secret=os.environ.get("FACIAL_AUTH_SECRET","")
    respuesta=request.get("challengeAnswer","")
    valido=False
    if len(secret)>=32 and nonce and correo and isinstance(respuesta,str):
        digest=hmac.new(secret.encode("utf-8"),f"{correo.lower()}:{nonce}".encode("utf-8"),hashlib.sha256).digest()
        esperado=base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
        valido=hmac.compare_digest(respuesta,esperado)
    event.setdefault("response",{})["answerCorrect"]=valido
    return event
