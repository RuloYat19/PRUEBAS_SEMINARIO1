import base64
import hashlib
import hmac
import logging

from botocore.exceptions import ClientError
from mysql.connector import errorcode
from mysql.connector.errors import IntegrityError

from src.identidad import errors

logger=logging.getLogger(__name__)
_ERRORES_IMAGEN={"InvalidImageFormatException","ImageTooLargeException","InvalidParameterException"}

def _codigo(error):
    return getattr(error,"response",{}).get("Error",{}).get("Code")

def _error_cognito(error):
    codigo=_codigo(error)
    if codigo in ("UsernameExistsException","AliasExistsException"):
        return errors.conflicto("Ya existe una cuenta con ese correo")
    if codigo=="UserNotConfirmedException": return errors.no_verificado()
    if codigo in ("NotAuthorizedException","UserNotFoundException"): return errors.no_autenticado()
    if codigo in ("CodeMismatchException","ExpiredCodeException"):
        return errors.validacion("El código no es válido o ya venció")
    if codigo=="InvalidPasswordException": return errors.validacion("La contraseña no cumple la política de Cognito")
    if codigo=="InvalidParameterException": return errors.validacion("Cognito rechazó uno de los datos enviados")
    if codigo in ("LimitExceededException","TooManyRequestsException"): return errors.IdentidadError(429,"Se alcanzó el límite de solicitudes a Cognito")
    return errors.cognito()

class IdentidadService:
    def __init__(self,repository,cognito,rekognition,bucket,s3_public_url,facial_auth_secret):
        self.repository=repository; self.cognito=cognito; self.rekognition=rekognition
        self.bucket=bucket; self.s3_public_url=s3_public_url.rstrip("/")
        self.facial_auth_secret=facial_auth_secret

    def _exigir_cognito_configurado(self):
        client_id=getattr(self.cognito,"client_id",None)
        user_pool_id=getattr(self.cognito,"user_pool_id",None)
        if client_id is not None and (not client_id or not user_pool_id):
            raise errors.cognito_no_configurado()

    def registrar(self,nombre_completo,correo,dpi,password,foto_perfil_key):
        self._exigir_cognito_configurado()
        if self.repository.existe_correo(correo): raise errors.conflicto("Ya existe una cuenta con ese correo")
        if self.repository.existe_dpi(dpi): raise errors.conflicto("Ese DPI ya está registrado")
        sub=None
        try:
            respuesta=self.cognito.registrar(correo,password,nombre_completo,dpi)
            sub=respuesta.get("UserSub")
            if not sub: raise RuntimeError("Cognito no devolvió el sub de usuario")
            self.repository.crear(sub,nombre_completo,correo,dpi,hashlib.md5(password.encode("utf-8")).hexdigest(),
                f"{self.s3_public_url}/{foto_perfil_key}",foto_perfil_key)
        except ClientError as exc:
            raise _error_cognito(exc) from exc
        except IntegrityError as exc:
            self._eliminar_usuario_cognito(correo,sub)
            if exc.errno==errorcode.ER_DUP_ENTRY: raise errors.conflicto("El correo o DPI ya está registrado") from exc
            logger.exception("[identidad] No se pudo insertar la cuenta en RDS")
            raise errors.rds() from exc
        except Exception as exc:
            if sub: self._eliminar_usuario_cognito(correo,sub)
            logger.exception("[identidad] Falló el registro en RDS")
            raise errors.rds() from exc

    def _eliminar_usuario_cognito(self,correo,sub):
        try: self.cognito.eliminar_usuario(correo)
        except Exception: logger.exception("[identidad] No se pudo compensar el usuario Cognito %s",sub)

    def verificar(self,correo,codigo):
        self._exigir_cognito_configurado()
        try: self.cognito.confirmar_registro(correo,codigo)
        except ClientError as exc: raise _error_cognito(exc) from exc

    def reenviar_codigo(self,correo):
        self._exigir_cognito_configurado()
        try: self.cognito.reenviar_codigo(correo)
        except ClientError as exc: raise _error_cognito(exc) from exc

    def iniciar_con_password(self,correo,password):
        self._exigir_cognito_configurado()
        usuario=self.repository.buscar_login(correo)
        if not usuario: raise errors.no_autenticado()
        try:
            resultado=self.cognito.iniciar_auth(correo,password)
        except ClientError as exc: raise _error_cognito(exc) from exc
        auth=resultado.get("AuthenticationResult") or {}
        token=auth.get("AccessToken")
        if not token: raise errors.no_autenticado()
        return token

    def iniciar_con_rostro(self,correo,imagen):
        self._exigir_cognito_configurado()
        usuario=self.repository.buscar_login(correo)
        if not usuario: raise errors.no_autenticado()
        try:
            coincide=self.rekognition.comparar_rostro(usuario["foto_perfil_key"],imagen)
        except ClientError as exc:
            if _codigo(exc) in _ERRORES_IMAGEN: raise errors.validacion("La imagen no contiene un rostro válido") from exc
            logger.exception("[identidad] Rekognition CompareFaces falló")
            raise errors.rekognition() from exc
        except Exception as exc:
            logger.exception("[identidad] Rekognition CompareFaces falló")
            raise errors.rekognition() from exc
        if not coincide: raise errors.no_autenticado()
        if len(self.facial_auth_secret)<32: raise errors.no_configurado()
        try:
            inicio=self.cognito.iniciar_auth_personalizado(correo)
            challenge=inicio.get("ChallengeParameters",{})
            nonce=challenge.get("nonce")
            session=inicio.get("Session")
            if inicio.get("ChallengeName")!="CUSTOM_CHALLENGE" or not nonce or not session:
                raise RuntimeError("Cognito no inició el reto CUSTOM_CHALLENGE esperado")
            firma=hmac.new(self.facial_auth_secret.encode("utf-8"),f"{correo}:{nonce}".encode("utf-8"),hashlib.sha256).digest()
            respuesta=base64.urlsafe_b64encode(firma).decode("ascii").rstrip("=")
            final=self.cognito.responder_auth_personalizado(correo,session,respuesta)
        except ClientError as exc: raise _error_cognito(exc) from exc
        except Exception as exc:
            logger.exception("[identidad] Falló CUSTOM_AUTH facial")
            raise errors.cognito() from exc
        token=(final.get("AuthenticationResult") or {}).get("AccessToken")
        if not token: raise errors.no_autenticado()
        return token
