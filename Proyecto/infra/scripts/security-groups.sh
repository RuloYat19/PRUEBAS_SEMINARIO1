#!/usr/bin/env bash
# Crea los tres security groups del proyecto en la VPC por defecto:
#   Internet --80--> ALB --3000--> EC2 --3306--> RDS
# Se puede correr varias veces. Uso: security-groups.sh [IP_PARA_SSH ...]
# Sin argumentos abre SSH solo a la IP pública de quien lo corre.
set -euo pipefail

CUENTA=237145860265
PUERTO_APP=3000
ETIQUETA='{Key=Proyecto,Value=proyecto-g8}'
export AWS_DEFAULT_REGION=us-east-1

[ "$(aws sts get-caller-identity --query Account --output text)" = "$CUENTA" ] \
  || { echo "Las credenciales no son de la cuenta $CUENTA" >&2; exit 1; }

VPC=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
IPS_SSH=("$@")
[ ${#IPS_SSH[@]} -gt 0 ] || IPS_SSH=("$(curl -s https://checkip.amazonaws.com)")

sg() {
  local nombre=$1 descripcion=$2 id
  id=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$nombre" "Name=vpc-id,Values=$VPC" \
    --query 'SecurityGroups[0].GroupId' --output text)
  if [ "$id" = "None" ]; then
    id=$(aws ec2 create-security-group --group-name "$nombre" --description "$descripcion" --vpc-id "$VPC" \
      --tag-specifications "ResourceType=security-group,Tags=[$ETIQUETA,{Key=Name,Value=$nombre}]" \
      --query GroupId --output text)
  fi
  echo "$id"
}

# Agrega una regla; si ya existe, AWS responde Duplicate y se ignora.
regla() {
  local sentido=$1 grupo=$2 puerto=$3 origen=$4 descripcion=$5 destino
  if [[ $origen == sg-* ]]; then
    destino="UserIdGroupPairs=[{GroupId=$origen,Description=\"$descripcion\"}]"
  else
    destino="IpRanges=[{CidrIp=$origen,Description=\"$descripcion\"}]"
  fi
  aws ec2 "authorize-security-group-$sentido" --group-id "$grupo" \
    --ip-permissions "IpProtocol=tcp,FromPort=$puerto,ToPort=$puerto,$destino" >/dev/null 2>&1 || true
}

# Quita la regla de salida "todo a 0.0.0.0/0" que AWS pone por defecto.
sin_salida_abierta() {
  aws ec2 revoke-security-group-egress --group-id "$1" \
    --ip-permissions 'IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0}]' >/dev/null 2>&1 || true
}

ALB=$(sg proyecto-alb-sg-g8 'ALB: HTTP publico')
EC2=$(sg proyecto-ec2-sg-g8 'EC2: app solo desde el ALB, SSH solo del equipo')
RDS=$(sg proyecto-rds-sg-g8 'RDS: MySQL solo desde las EC2')

# ALB: recibe HTTP de cualquiera y solo puede hablar con las EC2 en el puerto de la app.
regla ingress "$ALB" 80 0.0.0.0/0 'HTTP publico'
sin_salida_abierta "$ALB"
regla egress "$ALB" $PUERTO_APP "$EC2" 'Hacia las EC2'

# EC2: la app solo desde el ALB; SSH solo desde las IP del equipo. La salida queda abierta
# porque las EC2 llaman a las APIs de AWS e instalan paquetes.
regla ingress "$EC2" $PUERTO_APP "$ALB" 'App desde el ALB'
for ip in "${IPS_SSH[@]}"; do
  regla ingress "$EC2" 22 "$ip/32" 'SSH equipo'
done

# RDS: MySQL solo desde el SG de las EC2; no inicia conexiones.
regla ingress "$RDS" 3306 "$EC2" 'MySQL desde las EC2'
sin_salida_abierta "$RDS"

echo "vpc  $VPC"
echo "alb  $ALB  proyecto-alb-sg-g8"
echo "ec2  $EC2  proyecto-ec2-sg-g8  (SSH: ${IPS_SSH[*]})"
echo "rds  $RDS  proyecto-rds-sg-g8"
