from urllib.parse import quote

import boto3

from src.config import Config


def upload_profile_photo(file_storage, object_key):
    if not Config.S3_BUCKET:
        raise RuntimeError("S3_BUCKET no está configurado")

    key = f"fotos_perfil/{object_key}"
    client_options = {"region_name": Config.AWS_REGION}
    if Config.AWS_ACCESS_KEY_ID and Config.AWS_SECRET_ACCESS_KEY:
        client_options["aws_access_key_id"] = Config.AWS_ACCESS_KEY_ID
        client_options["aws_secret_access_key"] = Config.AWS_SECRET_ACCESS_KEY
    client = boto3.client("s3", **client_options)
    client.upload_fileobj(
        file_storage,
        Config.S3_BUCKET,
        key,
        ExtraArgs={"ContentType": file_storage.mimetype or "application/octet-stream"},
    )
    return (
        f"https://{Config.S3_BUCKET}.s3.{Config.AWS_REGION}.amazonaws.com/"
        f"{quote(key, safe='/')}"
    )