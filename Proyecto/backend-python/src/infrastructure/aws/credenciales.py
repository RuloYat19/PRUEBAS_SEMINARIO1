import os


def credenciales_de(servicio, env=None):
    env = os.environ if env is None else env
    access_key = env.get(f"{servicio}_ACCESS_KEY_ID")
    secret_key = env.get(f"{servicio}_SECRET_ACCESS_KEY")
    if access_key and secret_key:
        return {"aws_access_key_id": access_key, "aws_secret_access_key": secret_key}
    return {}
