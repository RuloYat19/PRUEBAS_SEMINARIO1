import boto3
from src.infrastructure.aws.credenciales import credenciales_de


class Etiquetador:
    """DetectLabels sobre una imagen que ya está en S3.

    En la EC2 boto3 toma las credenciales del rol `proyecto-ec2-role-g8`.
    En local, de AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY del usuario
    `proyecto-iam-rekognition-g8`.
    """

    def __init__(self, region, bucket, max_labels=10, min_confidence=75):
        self.client = boto3.client(
            "rekognition", region_name=region, **credenciales_de("REKOGNITION")
        )
        self.bucket = bucket
        self.max_labels = max_labels
        self.min_confidence = min_confidence

    def detectar_etiquetas(self, imagen_key):
        respuesta = self.client.detect_labels(
            Image={"S3Object": {"Bucket": self.bucket, "Name": imagen_key}},
            MaxLabels=self.max_labels,
            MinConfidence=self.min_confidence,
        )
        return [
            {"nombre": label["Name"], "confianza": round(label["Confidence"], 2)}
            for label in respuesta.get("Labels", [])
        ]

    def comparar_rostro(self, foto_perfil_key, imagen, umbral=90):
        respuesta=self.client.compare_faces(
            SourceImage={"S3Object":{"Bucket":self.bucket,"Name":foto_perfil_key}},
            TargetImage={"Bytes":imagen},
            SimilarityThreshold=umbral,
        )
        return any(
            match.get("Similarity",0) >= umbral
            for match in respuesta.get("FaceMatches",[])
        )
