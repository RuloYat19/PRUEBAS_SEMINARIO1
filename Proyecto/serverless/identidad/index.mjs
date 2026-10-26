import { CompareFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const MIN_SIMILARITY = 90;

export async function defineAuthChallenge(event) {
  const session = event.request.session ?? [];
  const last = session.at(-1);
  if (last?.challengeName === 'CUSTOM_CHALLENGE' && last.challengeResult) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if (session.filter((item) => item.challengeName === 'CUSTOM_CHALLENGE').length >= 3) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  } else {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  }
  return event;
}

export async function createAuthChallenge(event) {
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') return event;
  const fotoPerfilKey = event.request.userAttributes?.['custom:foto_perfil_key'];
  if (!fotoPerfilKey?.startsWith('Fotos_Perfil/')) throw new Error('El usuario no tiene foto de perfil configurada');
  event.response.publicChallengeParameters = { prompt: 'Verifica tu rostro' };
  event.response.privateChallengeParameters = { fotoPerfilKey };
  event.response.challengeMetadata = 'FACE_MATCH_V1';
  return event;
}

export async function verifyAuthChallenge(event) {
  event.response.answerCorrect = false;
  const sourceKey = event.request.challengeAnswer ?? '';
  const bucket = process.env.S3_BUCKET_IMAGENES;
  const fotoPerfilKey = event.request.privateChallengeParameters?.fotoPerfilKey;
  if (!bucket || !sourceKey.startsWith('Fotos_Desafios/') || !fotoPerfilKey?.startsWith('Fotos_Perfil/')) return event;

  try {
    const { FaceMatches = [] } = await rekognition.send(new CompareFacesCommand({
      SourceImage: { S3Object: { Bucket: bucket, Name: sourceKey } },
      TargetImage: { S3Object: { Bucket: bucket, Name: fotoPerfilKey } },
      SimilarityThreshold: MIN_SIMILARITY,
    }));
    event.response.answerCorrect = FaceMatches.some(({ Similarity = 0 }) => Similarity >= MIN_SIMILARITY);
  } catch (error) {
    console.error('[lambda-identidad] CompareFaces falló:', error);
  } finally {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey }));
    } catch (error) {
      console.error('[lambda-identidad] No se pudo borrar la imagen temporal:', error);
    }
  }
  return event;
}

export async function handler(event) {
  switch (event.triggerSource) {
    case 'DefineAuthChallenge_Authentication':
      return defineAuthChallenge(event);
    case 'CreateAuthChallenge_Authentication':
      return createAuthChallenge(event);
    case 'VerifyAuthChallenge_Authentication':
      return verifyAuthChallenge(event);
    default:
      return event;
  }
}
