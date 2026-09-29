# Backend Python + Azure Functions

Implementación de R4 para TaskFlow + CloudDrive. Flask sirve la API REST en el puerto 3000
(EC2 y Azure VM); el proyecto `functions/` es una Azure Function App separada con las dos
rutas de carga para Blob Storage. Ambos backends usan el contrato de
[`docs/plan/distribucion-equipo.md`](../docs/plan/distribucion-equipo.md).

## Requisitos

- Python 3.12 y `venv`.
- MySQL 8 accesible por TCP desde la VM (RDS compartido).
- Bucket S3 de archivos creado y acceso IAM limitado al bucket para subir fotos de perfil.
- Function App Linux/Python en Canada Central, cuenta de Storage configurada y contenedor
  `practica2semi1b2s2026archivosg8` con lectura pública de blobs.
- API Management Consumption con las rutas de Functions publicadas bajo `/p2`.

## API Flask

Desde esta carpeta, en cada VM:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Completar `.env` fuera de Git. Se necesitan `DB_HOST`, `DB_USER`, `DB_PASSWORD`, un valor
aleatorio y privado en `JWT_SECRET`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID` y
`AWS_SECRET_ACCESS_KEY`. En la EC2 se puede usar un instance role en lugar de claves. Para la
VM de Azure, RDS debe permitir la IP pública estática de esa VM y el usuario IAM debe tener
`s3:PutObject` en el bucket de archivos. Establecer `CLOUD=aws` en EC2 y `CLOUD=azure` en
Azure.

Probar localmente en la VM:

```bash
python run.py
curl http://127.0.0.1:3000/health
```

Para Gunicorn, desde esta carpeta:

```bash
gunicorn --workers 2 --bind 0.0.0.0:3000 --access-logfile - src.app:app
```

El proceso de producción debe ejecutarse como servicio `systemd` con `WorkingDirectory` en
esta carpeta, `User` no privilegiado y `EnvironmentFile` apuntando al `.env` local. No poner
secretos dentro del unit file ni en el repositorio. El health check usado por ambos
balanceadores es `GET /health`.

## Rutas de backend

Todas las rutas salvo `/health` y `/auth/*` requieren `Authorization: Bearer <token>`.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/health` | Estado y nube (`CLOUD`) |
| POST | `/auth/register` | `multipart`: `username`, `correo`, `password`, `confirmPassword`, `fotoPerfil` |
| POST | `/auth/login` | JSON: `username`, `password`; devuelve usuario y JWT |
| GET/POST | `/tasks` | Listar y crear tareas del usuario autenticado |
| PUT | `/tasks/<id>` | Editar título y descripción propios |
| PATCH | `/tasks/<id>/estado` | JSON: `{"completada": true}` |
| DELETE | `/tasks/<id>` | Eliminar una tarea propia |
| GET/POST | `/files` | Listar y registrar metadatos tras la carga serverless |
| GET | `/files/<id>` | Obtener un archivo propio |

La contraseña se verifica con bcrypt. El token contiene el ID del usuario y caduca según
`JWT_TTL_HOURS`. Consultas y operaciones de escritura siempre se limitan al `usuario_id` del
token. Las cargas a Blob no registran filas en RDS: el cliente registra la respuesta de la
Function mediante `POST /files`.

## Azure Functions

`functions/` es la raíz de despliegue independiente. Configurar los siguientes App Settings en
`func-p2-g8` (Canada Central), sin guardarlos en Git:

- `FUNCTIONS_WORKER_RUNTIME=python`
- `AZURE_STORAGE_CONNECTION_STRING` (secreto de la cuenta de almacenamiento)
- `AZURE_STORAGE_CONTAINER=practica2semi1b2s2026archivosg8`
- `MAX_UPLOAD_BYTES=4194304`

Desde `functions/`, usando Azure Functions Core Tools v4:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
func azure functionapp publish func-p2-g8 --python
```

Las funciones exigen clave (`authLevel=FUNCTION`). En APIM se crean las operaciones `POST`
`/p2/upload/imagen` y `/p2/upload/documento`, apuntando a las rutas homónimas de la Function
App. Guardar cada Function key como **Named Value secreto** de APIM y reenviarla en el header
`x-functions-key`; la clave de suscripción de APIM queda desactivada según el contrato del
equipo. Configurar una política CORS en APIM que permita los orígenes de los dos frontends y
responda `OPTIONS` en el gateway (no en la Function).

Petición JSON para ambas rutas:

```json
{
  "usuarioId": 3,
  "nombreArchivo": "notas.txt",
  "tipoMime": "text/plain",
  "contenidoBase64": "SG9sYSBtdW5kbw=="
}
```

`/upload/imagen` acepta `image/*`; `/upload/documento` acepta `text/*` y `application/pdf`.
El límite es 4 MiB. La respuesta `201` contiene `url`, `nombre`, `tipo`, `tamanoBytes` y
`proveedor: "AZURE"`. APIM es la URL pública para el frontend; no usar directamente la URL
de Function.

## Seguridad y despliegue

- Los adjuntos de esta conversación contenían una llave privada SSH, credenciales IAM, usuario
  administrador AWS y contraseña de RDS. Revocar/rotar esas credenciales antes de seguir; no
  se copiaron al proyecto. Si la llave SSH se compartió con más personas, reemplazar el par y
  actualizar las cuatro máquinas.
- Mantener `.env`, `local.settings.json`, las llaves y los archivos `.pem` fuera de Git.
- En el contenedor de archivos, habilitar lectura pública solo de blobs; las credenciales de
  escritura permanecen exclusivamente en Function App settings.
- CORS del backend se define con `CORS_ORIGINS` como lista separada por comas.