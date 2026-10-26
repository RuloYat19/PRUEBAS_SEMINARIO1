import { CompareFacesCommand, DetectLabelsCommand, RekognitionClient } from '@aws-sdk/client-rekognition';
import { credencialesDe } from './credenciales.js';

// En la EC2 el SDK toma las credenciales del rol `proyecto-ec2-role-g8`.
// En local, de AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY del usuario
// `proyecto-iam-rekognition-g8`.
export function createEtiquetador({ AWS_REGION: region, S3_BUCKET_IMAGENES: bucket, maxLabels = 10, minConfidence = 75 }) {
  const client = new RekognitionClient({ region, credentials: credencialesDe('REKOGNITION') });

  return {
    async detectarEtiquetas(imagenKey) {
      const { Labels = [] } = await client.send(
        new DetectLabelsCommand({
          Image: { S3Object: { Bucket: bucket, Name: imagenKey } },
          MaxLabels: maxLabels,
          MinConfidence: minConfidence,
        }),
      );
      return Labels.map((label) => ({
        nombre: label.Name,
        confianza: Math.round(label.Confidence * 100) / 100,
      }));
    },
  };
}

export function createComparadorRostros({ AWS_REGION: region }) {
  const client = new RekognitionClient({ region, credentials: credencialesDe('REKOGNITION') });
  return {
    async comparar({ imagen, bucket, fotoPerfilKey, similitudMinima = 90 }) {
      const { FaceMatches = [] } = await client.send(new CompareFacesCommand({
        SourceImage: { Bytes: Buffer.from(imagen, 'base64') },
        TargetImage: { S3Object: { Bucket: bucket, Name: fotoPerfilKey } },
        SimilarityThreshold: similitudMinima,
      }));
      return FaceMatches.some(({ Similarity = 0 }) => Similarity >= similitudMinima);
    },
  };
}
