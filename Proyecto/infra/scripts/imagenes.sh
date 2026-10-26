#!/usr/bin/env bash
# Despliega la Lambda de imágenes y la API REST de API Gateway que la expone en POST /imagenes.
# Se puede correr varias veces: actualiza el código de la Lambda y vuelve a desplegar el stage.
# Requiere que antes se haya corrido iam-s3.sh (rol proyecto-lambda-role-g8 y el bucket).
set -euo pipefail

CUENTA=237145860265
REGION=us-east-1
BUCKET=semi1proyecto-g8-2s2026
LAMBDA=proyecto-lambda-imagenes-g8
API=proyecto-apigw-g8
STAGE=v1
ETIQUETA='Proyecto=proyecto-g8'
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
export AWS_DEFAULT_REGION=$REGION

[ "$(aws sts get-caller-identity --query Account --output text)" = "$CUENTA" ] \
  || { echo "Las credenciales no son de la cuenta $CUENTA" >&2; exit 1; }

# --- Lambda ------------------------------------------------------------------
ZIP="$(mktemp -d)/imagenes.zip"
(cd "$RAIZ/serverless/imagenes" && zip -q "$ZIP" index.mjs)

if aws lambda get-function --function-name "$LAMBDA" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$LAMBDA" --zip-file "fileb://$ZIP" >/dev/null
  aws lambda wait function-updated-v2 --function-name "$LAMBDA"
else
  # Se crea antes que la Lambda para fijar la retención; si no, Lambda lo crea sin vencimiento.
  aws logs create-log-group --log-group-name "/aws/lambda/$LAMBDA" --tags "$ETIQUETA" 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "/aws/lambda/$LAMBDA" --retention-in-days 14
  aws lambda create-function --function-name "$LAMBDA" \
    --runtime nodejs22.x --architectures arm64 --handler index.handler \
    --role "arn:aws:iam::$CUENTA:role/proyecto-lambda-role-g8" \
    --memory-size 256 --timeout 15 \
    --environment "Variables={BUCKET=$BUCKET}" \
    --zip-file "fileb://$ZIP" --tags "$ETIQUETA" >/dev/null
  aws lambda wait function-active-v2 --function-name "$LAMBDA"
fi
echo "lambda    $LAMBDA"

# --- API Gateway (REST, regional) ---------------------------------------------
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='$API'].id | [0]" --output text)
if [ "$API_ID" = "None" ]; then
  API_ID=$(aws apigateway create-rest-api --name "$API" \
    --description 'Carga de imágenes a S3 por medio de Lambda' \
    --endpoint-configuration types=REGIONAL --tags "$ETIQUETA" --query id --output text)
fi
RAIZ_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/'].id | [0]" --output text)
RECURSO=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/imagenes'].id | [0]" --output text)
if [ "$RECURSO" = "None" ]; then
  RECURSO=$(aws apigateway create-resource --rest-api-id "$API_ID" --parent-id "$RAIZ_ID" \
    --path-part imagenes --query id --output text)
fi

# POST /imagenes -> Lambda (proxy): la Lambda arma la respuesta completa, CORS incluido.
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method POST --authorization-type NONE >/dev/null 2>&1 || true
aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method POST --type AWS_PROXY --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$CUENTA:function:$LAMBDA/invocations" \
  >/dev/null

# OPTIONS /imagenes -> respuesta fija para el preflight de CORS del navegador.
aws apigateway put-method --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method OPTIONS --authorization-type NONE >/dev/null 2>&1 || true
aws apigateway put-integration --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method OPTIONS --type MOCK --request-templates '{"application/json":"{\"statusCode\": 200}"}' >/dev/null
aws apigateway put-method-response --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method OPTIONS --status-code 200 --response-parameters \
  'method.response.header.Access-Control-Allow-Origin=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Headers=false' \
  >/dev/null 2>&1 || true
aws apigateway put-integration-response --rest-api-id "$API_ID" --resource-id "$RECURSO" \
  --http-method OPTIONS --status-code 200 --response-parameters \
  "{\"method.response.header.Access-Control-Allow-Origin\":\"'*'\",\"method.response.header.Access-Control-Allow-Methods\":\"'OPTIONS,POST'\",\"method.response.header.Access-Control-Allow-Headers\":\"'Content-Type'\"}" \
  >/dev/null

# Los errores que genera API Gateway (413, 429, 502…) también llevan CORS, para que el frontend los lea.
for tipo in DEFAULT_4XX DEFAULT_5XX; do
  aws apigateway put-gateway-response --rest-api-id "$API_ID" --response-type "$tipo" \
    --response-parameters "{\"gatewayresponse.header.Access-Control-Allow-Origin\":\"'*'\"}" >/dev/null
done

# Permiso para que solo este método de esta API invoque la Lambda.
aws lambda add-permission --function-name "$LAMBDA" --statement-id apigw-post-imagenes \
  --action lambda:InvokeFunction --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$CUENTA:$API_ID/*/POST/imagenes" >/dev/null 2>&1 || true

aws apigateway create-deployment --rest-api-id "$API_ID" --stage-name "$STAGE" \
  --description "$(date -u +%FT%TZ)" >/dev/null
# Límite de peticiones para que nadie llene el bucket ni dispare la factura.
aws apigateway update-stage --rest-api-id "$API_ID" --stage-name "$STAGE" --patch-operations \
  'op=replace,path=/*/*/throttling/rateLimit,value=10' \
  'op=replace,path=/*/*/throttling/burstLimit,value=20' >/dev/null
aws apigateway tag-resource --resource-arn "arn:aws:apigateway:$REGION::/restapis/$API_ID/stages/$STAGE" \
  --tags "$ETIQUETA" 2>/dev/null || true
echo "api       $API ($API_ID)"

echo
echo "POST https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE/imagenes"
