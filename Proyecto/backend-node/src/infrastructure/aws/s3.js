import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { credencialesDe } from './credenciales.js';

export function createChallengeImageStore({ AWS_REGION, S3_BUCKET_IMAGENES }) {
  const client = new S3Client({ region: AWS_REGION, credentials: credencialesDe('S3') });
  return {
    async guardar(bytes, contentType) {
      const extension = contentType === 'image/png' ? 'png' : 'jpg';
      const key = `Fotos_Desafios/${randomUUID()}.${extension}`;
      await client.send(new PutObjectCommand({
        Bucket: S3_BUCKET_IMAGENES,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'no-store',
      }));
      return key;
    },

    async eliminar(key) {
      if (!key?.startsWith('Fotos_Desafios/')) return;
      await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_IMAGENES, Key: key }));
    },
  };
}
