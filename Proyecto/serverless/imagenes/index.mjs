// Lambda proyecto-lambda-imagenes-g8: recibe una imagen en base64 desde API Gateway (proxy)
// y la guarda en Fotos_Perfil/ o Fotos_Publicadas/ del bucket de imágenes.
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const BUCKET = process.env.BUCKET;
const CARPETAS = ['Fotos_Perfil', 'Fotos_Publicadas'];
// Rekognition (etiquetas y login facial) solo acepta JPEG y PNG.
const TIPOS = {
  'image/jpeg': { extension: 'jpg', firma: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', firma: [0x89, 0x50, 0x4e, 0x47] },
};
// Lambda acepta hasta 6 MB por invocación; en base64 eso deja unos 4.4 MB de imagen.
const MAX_BYTES = 4 * 1024 * 1024;

const s3 = new S3Client({});

const responder = (statusCode, cuerpo) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(cuerpo),
});

export const handler = async (event) => {
  let datos;
  try {
    datos = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
  } catch {
    return responder(400, { error: 'El cuerpo debe ser JSON' });
  }

  const { carpeta, imagen } = datos ?? {};
  if (!CARPETAS.includes(carpeta)) {
    return responder(400, { error: `carpeta debe ser ${CARPETAS.join(' o ')}` });
  }

  const partes = /^data:([\w/+.-]+);base64,(.+)$/s.exec(typeof imagen === 'string' ? imagen : '');
  if (!partes) {
    return responder(400, { error: 'imagen debe ser un data URL en base64 (data:image/...;base64,...)' });
  }

  const [, tipo, base64] = partes;
  const formato = TIPOS[tipo];
  if (!formato) {
    return responder(415, { error: 'Solo se aceptan imágenes JPEG o PNG' });
  }

  const contenido = Buffer.from(base64, 'base64');
  if (contenido.length > MAX_BYTES) {
    return responder(413, { error: 'La imagen no puede pasar de 4 MB' });
  }
  if (!formato.firma.every((byte, i) => contenido[i] === byte)) {
    return responder(415, { error: `El contenido no es un ${tipo} válido` });
  }

  const key = `${carpeta}/${randomUUID()}.${formato.extension}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: contenido, ContentType: tipo }));
  console.log(JSON.stringify({ guardada: key, bytes: contenido.length }));

  return responder(201, { key, url: `https://${BUCKET}.s3.amazonaws.com/${key}` });
};
