import boto3

from src.infrastructure.aws.credenciales import credenciales_de


class Traductor:
    def __init__(self, region):
        self.client = boto3.client("translate", region_name=region, **credenciales_de("TRANSLATE"))

    def traducir(self, texto, idioma):
        respuesta = self.client.translate_text(
            Text=texto, SourceLanguageCode="auto", TargetLanguageCode=idioma
        )
        return {"texto": respuesta["TranslatedText"], "idiomaOrigen": respuesta["SourceLanguageCode"]}
