import base64
import hashlib
import hmac

import boto3

from src.infrastructure.aws.credenciales import credenciales_de


class CuentasCognito:
    def __init__(self, region, user_pool_id, client_id="", client_secret=""):
        self.client = boto3.client("cognito-idp", region_name=region, **credenciales_de("COGNITO"))
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.client_secret = client_secret

    def _secret_hash(self, username):
        if not self.client_secret:
            return None
        digest=hmac.new(self.client_secret.encode(),f"{username}{self.client_id}".encode(),hashlib.sha256).digest()
        return base64.b64encode(digest).decode()

    def registrar(self, correo, password, nombre_completo, dpi):
        args={"ClientId":self.client_id,"Username":correo,"Password":password,
              "UserAttributes":[{"Name":"email","Value":correo},{"Name":"name","Value":nombre_completo},{"Name":"custom:dpi","Value":dpi}]}
        secret_hash=self._secret_hash(correo)
        if secret_hash: args["SecretHash"]=secret_hash
        return self.client.sign_up(**args)

    def confirmar_registro(self, correo, codigo):
        args={"ClientId":self.client_id,"Username":correo,"ConfirmationCode":codigo}
        secret_hash=self._secret_hash(correo)
        if secret_hash: args["SecretHash"]=secret_hash
        return self.client.confirm_sign_up(**args)

    def reenviar_codigo(self, correo):
        args={"ClientId":self.client_id,"Username":correo}
        secret_hash=self._secret_hash(correo)
        if secret_hash: args["SecretHash"]=secret_hash
        return self.client.resend_confirmation_code(**args)

    def iniciar_auth(self, correo, password):
        params={"USERNAME":correo,"PASSWORD":password}
        secret_hash=self._secret_hash(correo)
        if secret_hash: params["SECRET_HASH"]=secret_hash
        return self.client.initiate_auth(AuthFlow="USER_PASSWORD_AUTH",ClientId=self.client_id,AuthParameters=params)

    def iniciar_auth_personalizado(self, correo):
        params={"USERNAME":correo}
        secret_hash=self._secret_hash(correo)
        if secret_hash: params["SECRET_HASH"]=secret_hash
        return self.client.initiate_auth(AuthFlow="CUSTOM_AUTH",ClientId=self.client_id,AuthParameters=params)

    def responder_auth_personalizado(self, correo, session, respuesta):
        params={"USERNAME":correo,"ANSWER":respuesta}
        secret_hash=self._secret_hash(correo)
        if secret_hash: params["SECRET_HASH"]=secret_hash
        return self.client.respond_to_auth_challenge(ChallengeName="CUSTOM_CHALLENGE",ClientId=self.client_id,
            Session=session,ChallengeResponses=params)

    def eliminar_usuario(self, correo):
        self.client.admin_delete_user(UserPoolId=self.user_pool_id,Username=correo)

    def actualizar_atributos(self, correo, nombre_completo, dpi):
        self.client.admin_update_user_attributes(
            UserPoolId=self.user_pool_id,
            Username=correo,
            UserAttributes=[
                {"Name": "name", "Value": nombre_completo},
                {"Name": "custom:dpi", "Value": dpi},
            ],
        )
