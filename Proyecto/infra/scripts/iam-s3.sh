#!/usr/bin/env bash
# Crea los usuarios, roles y políticas de IAM y los dos buckets de S3 del proyecto.
# Se puede correr varias veces: lo que ya existe se omite y las políticas se actualizan.
# Las llaves de acceso NO se crean aquí (ver dominios/plataforma/README.md §7).
set -euo pipefail

CUENTA=237145860265
REGION=us-east-1
ETIQUETA='Key=Proyecto,Value=proyecto-g8'
INFRA="$(cd "$(dirname "$0")/.." && pwd)"
POL="$INFRA/iam/politicas"
TRUST="$INFRA/iam/confianza"
S3="$INFRA/s3"

[ "$(aws sts get-caller-identity --query Account --output text)" = "$CUENTA" ] \
  || { echo "Las credenciales no son de la cuenta $CUENTA" >&2; exit 1; }

# Crea la política administrada o publica una versión nueva si ya existe (máximo 5 versiones).
politica() {
  local nombre=$1 arn="arn:aws:iam::$CUENTA:policy/$1"
  if aws iam get-policy --policy-arn "$arn" >/dev/null 2>&1; then
    local viejas
    viejas=$(aws iam list-policy-versions --policy-arn "$arn" \
      --query 'Versions[?!IsDefaultVersion].VersionId' --output text)
    for v in $viejas; do aws iam delete-policy-version --policy-arn "$arn" --version-id "$v"; done
    aws iam create-policy-version --policy-arn "$arn" --set-as-default \
      --policy-document "file://$POL/$nombre.json" >/dev/null
  else
    aws iam create-policy --policy-name "$nombre" --tags "$ETIQUETA" \
      --policy-document "file://$POL/$nombre.json" >/dev/null
  fi
  echo "política  $nombre"
}

usuario() {
  local nombre=$1 pol=$2
  aws iam get-user --user-name "$nombre" >/dev/null 2>&1 \
    || aws iam create-user --user-name "$nombre" --tags "$ETIQUETA" >/dev/null
  aws iam attach-user-policy --user-name "$nombre" --policy-arn "arn:aws:iam::$CUENTA:policy/$pol"
  echo "usuario   $nombre -> $pol"
}

rol() {
  local nombre=$1 confianza=$2; shift 2
  aws iam get-role --role-name "$nombre" >/dev/null 2>&1 \
    || aws iam create-role --role-name "$nombre" --tags "$ETIQUETA" \
         --assume-role-policy-document "file://$TRUST/$confianza.json" >/dev/null
  for pol in "$@"; do
    aws iam attach-role-policy --role-name "$nombre" --policy-arn "arn:aws:iam::$CUENTA:policy/$pol"
  done
  echo "rol       $nombre -> $*"
}

# --- IAM ---------------------------------------------------------------------
for p in s3 ec2 rds cognito rekognition translate lex lambda-imagenes; do
  politica "proyecto-$p-policy-g8"
done

for s in s3 ec2 rds cognito rekognition translate lex; do
  usuario "proyecto-iam-$s-g8" "proyecto-$s-policy-g8"
done

# Las EC2 usan rol (no llaves): mismos permisos que los usuarios de los servicios que llama el backend.
rol proyecto-ec2-role-g8 ec2 \
  proyecto-cognito-policy-g8 proyecto-rekognition-policy-g8 \
  proyecto-translate-policy-g8 proyecto-lex-policy-g8
aws iam get-instance-profile --instance-profile-name proyecto-ec2-role-g8 >/dev/null 2>&1 || {
  aws iam create-instance-profile --instance-profile-name proyecto-ec2-role-g8 --tags "$ETIQUETA" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name proyecto-ec2-role-g8 \
    --role-name proyecto-ec2-role-g8
}
echo "perfil    proyecto-ec2-role-g8"

rol proyecto-lambda-role-g8 lambda proyecto-lambda-imagenes-policy-g8

# --- S3 ----------------------------------------------------------------------
bucket() {
  local nombre=$1
  aws s3api head-bucket --bucket "$nombre" >/dev/null 2>&1 \
    || aws s3api create-bucket --bucket "$nombre" --region "$REGION" >/dev/null
  aws s3api put-bucket-tagging --bucket "$nombre" --tagging "TagSet=[{$ETIQUETA}]"
  # Se permiten políticas públicas; las ACL siguen bloqueadas (el bucket es BucketOwnerEnforced).
  aws s3api put-public-access-block --bucket "$nombre" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
  aws s3api put-bucket-policy --bucket "$nombre" --policy "file://$S3/$nombre-policy.json"
  echo "bucket    $nombre"
}

bucket semi1proyecto-g8-2s2026
aws s3api put-bucket-cors --bucket semi1proyecto-g8-2s2026 --cors-configuration "file://$S3/semi1proyecto-g8-2s2026-cors.json"
for carpeta in Fotos_Perfil Fotos_Publicadas; do
  aws s3api put-object --bucket semi1proyecto-g8-2s2026 --key "$carpeta/" >/dev/null
done

bucket proyecto-web-g8
aws s3api put-bucket-website --bucket proyecto-web-g8 \
  --website-configuration "file://$S3/proyecto-web-g8-website.json"

echo
echo "Sitio: http://proyecto-web-g8.s3-website-$REGION.amazonaws.com"
echo "Imágenes: https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/<archivo>"
