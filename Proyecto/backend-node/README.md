# Backend Node.js

Servidor Express para la EC2 No. 1. Mantiene los contratos consumidos por React y usa el mismo esquema MySQL que el backend Python.

## Desarrollo local

Desde la raíz del repositorio:

```bash
docker compose -f Proyecto/database/docker-compose.yml up -d
cd Proyecto/backend-node
cp .env.example .env
npm install
npm start
```

El backend queda en `http://localhost:3000`; `GET /health` no requiere token. El Compose carga
`schema.sql` y `seed.sql` al crear el volumen por primera vez. Los seis usuarios `.demo` son datos
de RDS únicamente y no sirven para iniciar sesión por Cognito.

## Configuración

Completa `.env` con la configuración del entorno. Para desarrollo local, MySQL usa `127.0.0.1:3306`,
base `semisocial` y el usuario/contraseña `root`/`root`. En EC2 se configura `DB_HOST` con el
endpoint de RDS y se usa el rol de instancia para AWS. El archivo `.env` y las llaves no se suben.

Los clientes AWS leen `AWS_REGION` y las variables `<SERVICIO>_ACCESS_KEY_ID` /
`<SERVICIO>_SECRET_ACCESS_KEY` si ambas existen; si no, usan la cadena predeterminada del SDK.
Servicios: `COGNITO`, `REKOGNITION`, `TRANSLATE` y `LEX`.

El User Pool y su cliente deben habilitar `ALLOW_ADMIN_USER_PASSWORD_AUTH` y `ALLOW_CUSTOM_AUTH` y
permitir que el cliente escriba `email`, `name`, `custom:dpi` y `custom:foto_perfil_key`. Añade al pool el atributo
mutable `custom:foto_perfil_key`; Cognito lo recibe durante el registro y lo actualiza cuando el
usuario cambia su foto. Adjunta `index.handler` de los triggers exportados en
`../serverless/identidad/index.mjs` para Define, Create y Verify Auth Challenge. La Lambda requiere
`AWS_REGION` y `S3_BUCKET_IMAGENES`, el rol de `infra/iam/politicas/proyecto-lambda-identidad-policy-g8.json`
y permiso de Cognito para invocarla. La captura facial se guarda por unos segundos bajo el prefijo
privado `Fotos_Desafios/`; solo su key se envía a Cognito y backend/Lambda intentan borrarla al
terminar. El rol de la Lambda requiere leer `Fotos_Perfil/` y `Fotos_Desafios/` y borrar objetos de
`Fotos_Desafios/`. La EC2 requiere el permiso limitado de
`infra/iam/politicas/proyecto-ec2-identidad-temporal-policy-g8.json`; para local, las credenciales
`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` deben permitir escribir y borrar en ese prefijo. Configura
también una regla de ciclo de vida que expire `Fotos_Desafios/` después de un día, como limpieza ante
un cierre abrupto. Las reglas de red y recursos de AWS se configuran fuera de este repositorio.

El sitio S3 y `http://localhost:5173` están permitidos por CORS de forma predeterminada. Ajusta
`CORS_ORIGINS` como una lista separada por comas si hace falta. El servidor escucha en
`0.0.0.0:3000`, como espera el target group.

## Endpoints

- Público: `/health` y `/auth/{registro,verificar,reenviar-codigo,login,login-facial}`.
- Protegidos por Cognito: `/publicaciones`, `/publicaciones/:id/comentarios`, `/perfil`,
  `/traducciones`, `/amistades`, `/chat/:amigoId/mensajes` y `/chatbot`.
- WebSocket autenticado: `/chat?token=<access-token>`, en el mismo puerto. Cada proceso consulta
  el historial nuevo en RDS cada 500 ms y distribuye los mensajes a sus conexiones locales.

La autenticación valida el access token con Cognito, resuelve su `sub` contra `usuario.cognito_sub`
y asigna la fila de RDS a `req.usuario.id`. Las cargas de imágenes siguen pasando por API Gateway;
el backend recibe keys y URLs, salvo la imagen en base64 del desafío facial.

## Pruebas

Con MySQL local arriba:

```bash
npm test
```

Las pruebas de publicaciones, comentarios y perfil cargan `seed.sql` antes de cada caso; no las
ejecutes contra una base que contenga datos que quieras conservar.

Para ejecutar en EC2 con PM2:

```bash
pm2 start npm --name semisocial-node -- start
pm2 startup
pm2 save
```
