import boto3
from src.config import AWS_REGION
from src.infrastructure.aws.credenciales import credenciales_de

class LexConversaciones:
    def __init__(self,region=None):
        self.client=boto3.client("lexv2-runtime",region_name=region or AWS_REGION,**credenciales_de("LEX"))
    def recognize_text(self,**kwargs): return self.client.recognize_text(**kwargs)
