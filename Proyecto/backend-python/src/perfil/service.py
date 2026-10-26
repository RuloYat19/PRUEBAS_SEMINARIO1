import hashlib
import hmac
import logging

from mysql.connector import errorcode
from mysql.connector.errors import IntegrityError

from src.perfil import errors

logger = logging.getLogger(__name__)


def _password_coincide(password, md5_guardado):
    calculado = hashlib.md5(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(calculado, md5_guardado)


class PerfilService:
    def __init__(self, repository, cognito, s3_public_url):
        self.repository = repository
        self.cognito = cognito
        self.s3_public_url = s3_public_url.rstrip("/")

    def obtener(self, usuario_id):
        perfil = self.repository.buscar(usuario_id)
        if perfil is None:
            raise errors.no_encontrado()
        return perfil

    def actualizar(self, usuario_id, nombre_completo, dpi, foto_perfil_key, password):
        actual = self.repository.buscar_para_actualizar(usuario_id)
        if actual is None:
            raise errors.no_encontrado()
        if not _password_coincide(password, actual["passwordMd5"]):
            raise errors.password_incorrecta()
        if self.repository.dpi_de_otro_usuario(dpi, usuario_id):
            raise errors.dpi_en_uso()

        try:
            self.cognito.actualizar_atributos(actual["correo"], nombre_completo, dpi)
        except Exception as error:
            logger.exception("[perfil] Cognito falló")
            raise errors.cognito() from error

        try:
            self.repository.actualizar(
                usuario_id,
                nombre_completo,
                dpi,
                foto_perfil_url=f"{self.s3_public_url}/{foto_perfil_key}" if foto_perfil_key else None,
                foto_perfil_key=foto_perfil_key,
            )
        except Exception as error:
            self._restaurar_cognito(actual)
            if isinstance(error, IntegrityError) and error.errno == errorcode.ER_DUP_ENTRY:
                raise errors.dpi_en_uso() from error
            raise

        return self.obtener(usuario_id)

    def _restaurar_cognito(self, actual):
        try:
            self.cognito.actualizar_atributos(actual["correo"], actual["nombreCompleto"], actual["dpi"])
        except Exception:
            logger.exception("[perfil] No se pudo restaurar Cognito tras fallar RDS")
