import os
from dotenv import load_dotenv

load_dotenv()

AWS_REGION=os.getenv("AWS_REGION","us-east-1")
DB_CONFIG={
    "host":os.getenv("DB_HOST","127.0.0.1"),
    "port":int(os.getenv("DB_PORT","3306")),
    "user":os.getenv("DB_USER","semisocial"),
    "password":os.getenv("DB_PASSWORD","semisocial"),
    "database":os.getenv("DB_NAME","semisocial"),
    "time_zone":"+00:00",
}
COGNITO_USER_POOL_ID=os.getenv("COGNITO_USER_POOL_ID","")
COGNITO_CLIENT_ID=os.getenv("COGNITO_CLIENT_ID","")
COGNITO_CLIENT_SECRET=os.getenv("COGNITO_CLIENT_SECRET","")
FACIAL_AUTH_SECRET=os.getenv("FACIAL_AUTH_SECRET","")
WS_TICKET_SECRET=os.getenv("WS_TICKET_SECRET","")
LEX_BOT_ID=os.getenv("LEX_BOT_ID","")
LEX_BOT_ALIAS_ID=os.getenv("LEX_BOT_ALIAS_ID","")
LEX_LOCALE=os.getenv("LEX_LOCALE","es_US")
S3_BUCKET_IMAGENES=os.getenv("S3_BUCKET_IMAGENES",os.getenv("S3_BUCKET","semi1proyecto-g8-2s2026"))
S3_BUCKET=S3_BUCKET_IMAGENES
S3_BUCKET_WEB=os.getenv("S3_BUCKET_WEB","proyecto-web-g8")
IMAGENES_API_URL=os.getenv("IMAGENES_API_URL","")
S3_PUBLIC_URL=os.getenv("S3_PUBLIC_URL",f"https://{S3_BUCKET}.s3.amazonaws.com")
CORS_ORIGINS=tuple(origin.strip() for origin in os.getenv("CORS_ORIGINS","http://localhost:5173").split(",") if origin.strip())
