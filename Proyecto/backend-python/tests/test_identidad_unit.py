import base64
import hashlib
import hmac
import sys
from pathlib import Path

import pytest

from src.identidad import errors, schemas
from src.identidad.service import IdentidadService
sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
from serverless.identidad.custom_auth import define_auth_challenge, create_auth_challenge, verify_auth_challenge


class RepositorioFalso:
    def __init__(self): self.usuarios={}; self.creado=None
    def existe_correo(self,correo): return correo in self.usuarios
    def existe_dpi(self,dpi): return False
    def crear(self,*args): self.creado=args; self.usuarios[args[2]]=args; return 7
    def buscar_login(self,correo):
        if correo not in self.usuarios: return None
        return {"id":7,"cognito_sub":"sub-7","correo":correo,"foto_perfil_key":"Fotos_Perfil/perfil.jpg"}

class CognitoFalso:
    def __init__(self): self.answer=None
    def registrar(self,*args): return {"UserSub":"sub-7"}
    def eliminar_usuario(self,*args): pass
    def confirmar_registro(self,*args): pass
    def reenviar_codigo(self,*args): pass
    def iniciar_auth(self,*args): return {"AuthenticationResult":{"AccessToken":"jwt-access"}}
    def iniciar_auth_personalizado(self,*args):
        return {"ChallengeName":"CUSTOM_CHALLENGE","Session":"session-token","ChallengeParameters":{"nonce":"nonce-1"}}
    def responder_auth_personalizado(self,correo,session,respuesta):
        self.answer=respuesta
        return {"AuthenticationResult":{"AccessToken":"face-jwt"}}

class RekognitionFalso:
    def __init__(self,coincide=True): self.coincide=coincide; self.args=None
    def comparar_rostro(self,key,image): self.args=(key,image); return self.coincide

def test_registro_guarda_sub_hash_md5_y_url():
    repository=RepositorioFalso(); cognito=CognitoFalso()
    service=IdentidadService(repository,cognito,RekognitionFalso(),"bucket","https://bucket.s3.amazonaws.com","x"*32)
    datos=schemas.registrar({"nombreCompleto":"Raúl Yat","correo":" RAUL@example.com ","dpi":"3000000000123","password":"Demo1234!","fotoPerfilKey":"Fotos_Perfil/persona.jpg"})
    service.registrar(**datos)
    assert repository.creado[0]=="sub-7"
    assert repository.creado[4]==hashlib.md5("Demo1234!".encode()).hexdigest()
    assert repository.creado[5]=="https://bucket.s3.amazonaws.com/Fotos_Perfil/persona.jpg"

def test_login_password_devuelve_access_token():
    repository=RepositorioFalso(); repository.usuarios["raul@example.com"]=(1,)
    service=IdentidadService(repository,CognitoFalso(),RekognitionFalso(),"bucket","https://bucket","x"*32)
    assert service.iniciar_con_password("raul@example.com","Demo1234!")=="jwt-access"

def test_login_facial_compara_y_completa_reto_cognito():
    cognito=CognitoFalso(); rekognition=RekognitionFalso()
    repository=RepositorioFalso(); repository.usuarios["raul@example.com"]=(1,)
    secret="s"*32
    service=IdentidadService(repository,cognito,rekognition,"bucket","https://bucket",secret)
    assert service.iniciar_con_rostro("raul@example.com",b"jpeg-bytes")=="face-jwt"
    digest=hmac.new(secret.encode(),b"raul@example.com:nonce-1",hashlib.sha256).digest()
    expected=base64.urlsafe_b64encode(digest).decode().rstrip("=")
    assert cognito.answer==expected
    assert rekognition.args==("Fotos_Perfil/perfil.jpg",b"jpeg-bytes")

def test_login_facial_rechaza_cuando_compare_faces_no_coincide():
    repository=RepositorioFalso(); repository.usuarios["raul@example.com"]=(1,)
    service=IdentidadService(repository,CognitoFalso(),RekognitionFalso(False),"bucket","https://bucket","x"*32)
    with pytest.raises(errors.IdentidadError) as error:
        service.iniciar_con_rostro("raul@example.com",b"jpeg-bytes")
    assert error.value.status_code==401

def test_schema_login_facial_valida_data_url():
    photo=b"\xff\xd8\xffmock-jpeg"
    encoded=base64.b64encode(photo).decode()
    correo,decoded=schemas.login_facial({"correo":"A@example.com","imagen":f"data:image/jpeg;base64,{encoded}"})
    assert correo=="a@example.com" and decoded==photo

def test_triggers_custom_auth_emiten_reto_hmac_y_fallan_cerrado(monkeypatch):
    monkeypatch.setenv("FACIAL_AUTH_SECRET","z"*32)
    event={"request":{"session":[]},"response":{}}
    assert define_auth_challenge(event,None)["response"]["challengeName"]=="CUSTOM_CHALLENGE"
    event={"request":{},"response":{}}
    challenge=create_auth_challenge(event,None)
    nonce=challenge["response"]["publicChallengeParameters"]["nonce"]
    digest=hmac.new(("z"*32).encode(),f"ana@example.com:{nonce}".encode(),hashlib.sha256).digest()
    answer=base64.urlsafe_b64encode(digest).decode().rstrip("=")
    verify_event={"userName":"ana","request":{"userAttributes":{"email":"ana@example.com"},"privateChallengeParameters":{"nonce":nonce},"challengeAnswer":answer},"response":{}}
    assert verify_auth_challenge(verify_event,None)["response"]["answerCorrect"] is True

