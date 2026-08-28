#!/usr/bin/env bash
# Verifica que cada imagen referenciada en seed.sql sea publicamente accesible en S3.
# Los nombres se sacan del propio seed.sql: no hay lista duplicada que se desincronice.
#
# Uso:  ./verificar-s3.sh [nombre-bucket] [region]
set -uo pipefail

BUCKET="${1:-practica1-images-g8}"
REGION="${2:-us-east-1}"
BASE="https://${BUCKET}.s3.${REGION}.amazonaws.com"

# Localiza seed.sql relativo a este script, funcione desde donde funcione.
SEED="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/database/seed.sql"
[ -f "$SEED" ] || { echo "No encuentro $SEED"; exit 1; }

mapfile -t RUTAS < <(grep -oE "Fotos_(Peliculas|Perfil)/[a-z0-9._-]+" "$SEED" | sort -u)
[ ${#RUTAS[@]} -gt 0 ] || { echo "seed.sql no tiene rutas de imagen"; exit 1; }

echo "== $BASE =="
echo "   ${#RUTAS[@]} archivos referenciados en seed.sql"
echo

ok=0; fail=0
for r in "${RUTAS[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE/$r")
  case "$code" in
    200) printf '  200  %s\n' "$r"; ok=$((ok+1)) ;;
    403) printf '  403  %s   <- politica de bucket o bloqueo de acceso publico\n' "$r"; fail=$((fail+1)) ;;
    404) printf '  404  %s   <- no existe o el nombre no coincide\n' "$r"; fail=$((fail+1)) ;;
    *)   printf '  %-4s %s\n' "$code" "$r"; fail=$((fail+1)) ;;
  esac
done

echo
echo "== $ok accesibles, $fail con problema =="
[ $fail -eq 0 ]
