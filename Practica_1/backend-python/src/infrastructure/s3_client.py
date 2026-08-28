import boto3
import uuid
import os
from botocore.exceptions import ClientError
from src.config import Config
import logging

logger = logging.getLogger(__name__)

class S3Client:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_client()
        return cls._instance

    def _initialize_client(self):
        self.s3 = boto3.client(
            's3',
            region_name=Config.AWS_REGION,
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
        )
        self.bucket = Config.S3_BUCKET

    def upload_profile_photo(self, file_data, file_extension):
        """Sube foto de perfil a S3 y retorna la clave (ruta relativa)"""
        key = f"Fotos_Perfil/{uuid.uuid4()}.{file_extension.lower()}"
        return self._upload_file(file_data, key)

    def upload_movie_poster(self, file_data, file_extension):
        """Sube poster de película a S3 y retorna la clave (ruta relativa)"""
        key = f"Fotos_Peliculas/{uuid.uuid4()}.{file_extension.lower()}"
        return self._upload_file(file_data, key)

    def _upload_file(self, file_data, key):
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_data,
                ContentType='image/jpeg'
            )
            logger.info(f"File uploaded to S3: {key}")
            return key
        except ClientError as e:
            logger.error(f"Error uploading to S3: {e}")
            raise

    def delete_file(self, key):
        """Elimina un archivo de S3"""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            logger.info(f"File deleted from S3: {key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting from S3: {e}")
            return False

    def get_public_url(self, key):
        """Retorna la URL pública de un objeto en S3"""
        if not key:
            return None
        return f"https://{self.bucket}.s3.{Config.AWS_REGION}.amazonaws.com/{key}"

s3_client = S3Client()