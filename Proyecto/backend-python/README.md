# Backend Python — EC2 No. 2

Backend Flask para Semi-Social. Los módulos implementan los dominios bajo `src/<dominio>/` y
comparten conexión MySQL en RDS, autenticación de Cognito y clientes AWS. La aplicación registra
identidad, amistades, chat, Lex, perfil, publicaciones, comentarios y traducción.

## Requisitos y ejecución

- Python 3.12 o compatible.
- MySQL 8.4 en Amazon RDS con `Proyecto/database/schema.sql` aplicado.
- Instance profile con permisos específicos para Cognito, Lex, Rekognition, Translate y S3; no se
  deben copiar claves AWS al servidor.
- Copia `.env.example` a `.env`; el backend carga ese archivo automáticamente. El ejemplo usa
  el usuario de desarrollo `semisocial` de Docker Compose. Para conectar a RDS, cambia en tu `.env`
  local `DB_HOST`, `DB_USER` y `DB_PASSWORD`; no guardes esas credenciales en Git.

Instalar dependencias y arrancar el servidor:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:5000 --workers 1 --threads 100 --timeout 0 src.wsgi:app
```

El ALB usa `GET /health` como health check y envía HTTP/WebSocket al puerto 5000. En producción,
RDS debe aceptar conexiones únicamente desde el security group de las EC2. El pool de conexiones
MySQL se comparte dentro del proceso Flask.

## Configuración

Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `COGNITO_USER_POOL_ID`,
`COGNITO_CLIENT_ID`, `AWS_REGION`, `LEX_BOT_ID`, `LEX_BOT_ALIAS_ID`, `CORS_ORIGINS`, `S3_BUCKET`,
`S3_PUBLIC_URL` y `WS_TICKET_SECRET`. `LEX_LOCALE` usa `es_US` por defecto.
`COGNITO_CLIENT_SECRET` es opcional y se usa solo si el App Client tiene un secret. El login facial
requiere `FACIAL_AUTH_SECRET` aleatorio, compartido de manera segura con los tres triggers Lambda.
`WS_TICKET_SECRET` debe tener al menos 32 caracteres aleatorios y ser igual en ambas EC2.

En EC2 las credenciales AWS se obtienen del instance profile. Para desarrollo local se pueden usar
perfiles AWS o variables específicas `<SERVICIO>_ACCESS_KEY_ID` y
`<SERVICIO>_SECRET_ACCESS_KEY`; no subir secretos a Git.

La autenticación valida firma, issuer, expiración, `token_use=access` y `client_id` de Cognito; luego
resuelve `sub` a `usuario.id` en RDS. Los endpoints funcionales requieren `Authorization: Bearer <JWT>`.
Los seis usuarios de `seed.sql` existen solo en RDS y tienen `cognito_sub` de prueba; no pueden
obtener un JWT de Cognito ni autenticarse contra la aplicación desplegada.
El cliente solicita `POST /chat/ticket` con Bearer y luego pasa el ticket firmado, válido 30 segundos,
al WebSocket; el JWT de acceso no aparece en la URL. CORS permite solo los orígenes exactos en
`CORS_ORIGINS`; agrega el origen real del hosting en AWS antes de publicar.

## Endpoints de este alcance

- Identidad: `POST /auth/registro`, `/auth/verificar`, `/auth/reenviar-codigo`, `/auth/login` y
  `/auth/login-facial`.
- Amistades: `GET /amistades/personas`, `/amistades/solicitudes`, `POST /amistades/solicitudes`,
  `PUT /amistades/solicitudes/{id}` y `GET /amistades`.
- Chat: `GET /chat/{amigoId}/mensajes`, `POST /chat/ticket` y `WS /chat?ticket=...`. Los mensajes se persisten en RDS;
  cada proceso lee mensajes entrantes nuevos para entregar los que se originan en la otra EC2.
- Lex: `POST /chatbot`, con `mensaje` y `sesionId`.
- Página principal, perfil, comentarios y traducción: `GET/POST /publicaciones`, `/perfil`,
  `/publicaciones/{id}/comentarios` y `POST /traducciones`.

Los contratos completos y las capturas pendientes están en los README de
[`amistades`](../dominios/amistades/README.md), [`chat`](../dominios/chat/README.md) y
[`chatbot`](../dominios/chatbot/README.md).
