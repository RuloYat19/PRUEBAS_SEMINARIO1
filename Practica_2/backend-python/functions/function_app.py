import base64
import binascii
import json
import logging
import os
import re
import time
import uuid

import azure.functions as func
from azure.storage.blob import BlobServiceClient, ContentSettings

app = func.FunctionApp()
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", "4194304"))
CONTAINER = os.getenv(
    "AZURE_STORAGE_CONTAINER", "practica2semi1b2s2026archivosg8"
)


def _response(payload, status_code):
    return func.HttpResponse(
        json.dumps(payload, ensure_ascii=True),
        status_code=status_code,
        mimetype="application/json",
    )


def _upload(request: func.HttpRequest, expected_kind: str):
    try:
        payload = request.get_json()
    except ValueError:
        return _response({"error": "El cuerpo debe ser JSON válido"}, 400)
    if not isinstance(payload, dict):
        return _response({"error": "El cuerpo JSON debe ser un objeto"}, 400)

    user_id = payload.get("usuarioId")
    filename = payload.get("nombreArchivo")
    content_type = (payload.get("tipoMime") or "").strip().lower()
    encoded = payload.get("contenidoBase64")
    if not isinstance(user_id, int) or isinstance(user_id, bool) or user_id < 1:
        return _response({"error": "usuarioId debe ser un entero positivo"}, 400)
    if not isinstance(filename, str) or not filename.strip():
        return _response({"error": "nombreArchivo es requerido"}, 400)
    if not isinstance(encoded, str) or not encoded:
        return _response({"error": "contenidoBase64 es requerido"}, 400)

    is_image = content_type.startswith("image/")
    is_document = content_type.startswith("text/") or content_type == "application/pdf"
    if (expected_kind == "IMAGEN" and not is_image) or (
        expected_kind == "TEXTO" and not is_document
    ):
        return _response({"error": "El tipo MIME no corresponde a esta ruta"}, 415)
    if len(encoded) > ((MAX_UPLOAD_BYTES + 2) // 3) * 4:
        return _response({"error": "El archivo excede 4 MiB"}, 413)

    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return _response({"error": "contenidoBase64 no es válido"}, 400)
    if not content:
        return _response({"error": "El archivo está vacío"}, 400)
    if len(content) > MAX_UPLOAD_BYTES:
        return _response({"error": "El archivo excede 4 MiB"}, 413)

    clean_name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    clean_name = re.sub(r"[^A-Za-z0-9._-]", "_", clean_name).strip("._")[:180]
    if not clean_name:
        return _response({"error": "nombreArchivo no es válido"}, 400)
    folder = "imagenes" if expected_kind == "IMAGEN" else "documentos"
    blob_name = f"{folder}/{user_id}/{int(time.time())}-{uuid.uuid4().hex[:8]}-{clean_name}"

    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        logging.error("AZURE_STORAGE_CONNECTION_STRING no está configurado")
        return _response({"error": "Almacenamiento no configurado"}, 500)
    try:
        service = BlobServiceClient.from_connection_string(connection_string)
        blob = service.get_blob_client(container=CONTAINER, blob=blob_name)
        blob.upload_blob(
            content,
            overwrite=False,
            content_settings=ContentSettings(content_type=content_type),
        )
        return _response(
            {
                "url": blob.url,
                "nombre": filename,
                "tipo": expected_kind,
                "tamanoBytes": len(content),
                "proveedor": "AZURE",
            },
            201,
        )
    except Exception:
        logging.exception("No se pudo guardar el archivo en Blob Storage")
        return _response({"error": "No se pudo guardar el archivo"}, 500)


@app.route(
    route="upload/imagen",
    methods=["POST"],
    auth_level=func.AuthLevel.FUNCTION,
)
def cargar_imagen(request: func.HttpRequest) -> func.HttpResponse:
    return _upload(request, "IMAGEN")


@app.route(
    route="upload/documento",
    methods=["POST"],
    auth_level=func.AuthLevel.FUNCTION,
)
def cargar_documento(request: func.HttpRequest) -> func.HttpResponse:
    return _upload(request, "TEXTO")