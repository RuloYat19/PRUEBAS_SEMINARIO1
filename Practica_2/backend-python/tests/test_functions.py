import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

import azure.functions as func

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "functions"))
import function_app


class AzureUploadFunctionTests(unittest.TestCase):
    def request(self, payload):
        return func.HttpRequest(
            method="POST",
            url="http://localhost/api/upload/documento",
            headers={"Content-Type": "application/json"},
            params={},
            route_params={},
            body=json.dumps(payload).encode(),
        )

    def test_document_route_rejects_image_mime(self):
        response = function_app.cargar_documento(
            self.request(
                {
                    "usuarioId": 4,
                    "nombreArchivo": "foto.png",
                    "tipoMime": "image/png",
                    "contenidoBase64": "aGVsbG8=",
                }
            )
        )

        self.assertEqual(response.status_code, 415)
        self.assertIn("error", response.get_body().decode())

    def test_upload_returns_contract_and_saves_blob(self):
        blob = Mock()
        blob.url = "https://storage.example/container/documentos/4/file.txt"
        service = Mock()
        service.get_blob_client.return_value = blob

        with (
            patch.dict(
                "os.environ",
                {"AZURE_STORAGE_CONNECTION_STRING": "test-only"},
            ),
            patch.object(
                function_app.BlobServiceClient,
                "from_connection_string",
                return_value=service,
            ) as create_service,
        ):
            response = function_app.cargar_documento(
                self.request(
                    {
                        "usuarioId": 4,
                        "nombreArchivo": "notas.txt",
                        "tipoMime": "text/plain",
                        "contenidoBase64": "SG9sYSBtdW5kbw==",
                    }
                )
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            json.loads(response.get_body()),
            {
                "url": blob.url,
                "nombre": "notas.txt",
                "tipo": "TEXTO",
                "tamanoBytes": 10,
                "proveedor": "AZURE",
            },
        )
        create_service.assert_called_once_with("test-only")
        self.assertEqual(blob.upload_blob.call_args.args[0], b"Hola mundo")


if __name__ == "__main__":
    unittest.main()