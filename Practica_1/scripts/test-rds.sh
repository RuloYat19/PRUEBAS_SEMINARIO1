#!/usr/bin/env bash
# Verifica que la RDS cloudcinema-db-g8 responde desde ESTA maquina (una EC2 de la VPC).
# Uso:  ./test-rds.sh <endpoint> [usuario] [puerto]
set -uo pipefail

EP="${1:-cloudcinema-db-g8.ccpys6oma90l.us-east-1.rds.amazonaws.com}"
USER="${2:-admin}"
PORT="${3:-3306}"
ok=0; fail=0
p() { printf '%-42s %s\n' "$1" "$2"; }
pass() { p "$1" "OK   $2"; ok=$((ok+1)); }
bad()  { p "$1" "FALLA $2"; fail=$((fail+1)); }

echo "== Probando $EP:$PORT desde $(hostname) =="
echo

# 1. DNS: debe resolver a una IP PRIVADA (10.x / 172.16-31.x / 192.168.x)
IP=$(getent hosts "$EP" | awk '{print $1; exit}')
if [ -z "$IP" ]; then
  bad "1. DNS resuelve" "sin respuesta (¿endpoint mal escrito, o no estás en la VPC?)"
elif [[ $IP =~ ^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\. ]]; then
  pass "1. DNS resuelve" "-> $IP (privada, correcto)"
else
  bad "1. DNS resuelve" "-> $IP es PUBLICA: la instancia quedó expuesta"
fi

# 2. TCP 3306 abierto (sin depender de nc, que no siempre viene instalado)
if timeout 5 bash -c "exec 3<>/dev/tcp/$EP/$PORT" 2>/dev/null; then
  pass "2. Puerto $PORT alcanzable" ""
else
  bad "2. Puerto $PORT alcanzable" "timeout -> falta la regla de entrada en sg-rds-g8"
fi

# 3. Handshake MySQL: el server manda su version en los primeros bytes
BANNER=$(timeout 5 bash -c "head -c 80 < /dev/tcp/$EP/$PORT" 2>/dev/null \
         | tr -c '[:print:]' '\n' | grep -Eo '^[0-9]+\.[0-9]+\.[0-9]+' | head -1)
if [ -n "${BANNER:-}" ]; then
  pass "3. Handshake MySQL" "version: $BANNER"
else
  bad "3. Handshake MySQL" "no respondió (algo escucha pero no es MySQL)"
fi

# 4. Login real + consulta
if ! command -v mysql >/dev/null; then
  p "4. Login y consulta" "OMITIDO  falta cliente mysql (ver instalación abajo)"
else
  echo
  echo "-- Credenciales para $USER --"
  OUT=$(mysql -h "$EP" -P "$PORT" -u "$USER" -p --connect-timeout=10 \
        -e "SELECT VERSION() AS version, DATABASE() AS base_actual, NOW() AS hora;
            SHOW DATABASES;" cloudcinema 2>&1)
  RC=$?
  if [ $RC -eq 0 ]; then
    pass "4. Login y consulta" ""
    echo "$OUT"
  else
    bad "4. Login y consulta" "$(echo "$OUT" | head -2)"
  fi
fi

echo
echo "== $ok OK, $fail fallas =="
[ $fail -eq 0 ]
