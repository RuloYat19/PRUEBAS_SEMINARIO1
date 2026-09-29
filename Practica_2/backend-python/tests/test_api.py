import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt

from src.app import create_app
from src.config import Config


class BackendApiTests(unittest.TestCase):
    def setUp(self):
        self.old_secret = Config.JWT_SECRET
        Config.JWT_SECRET = "test-secret-that-is-not-used-outside-tests"
        self.client = create_app().test_client()

    def tearDown(self):
        Config.JWT_SECRET = self.old_secret

    def token(self, user_id=7):
        return jwt.encode(
            {
                "sub": str(user_id),
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            Config.JWT_SECRET,
            algorithm="HS256",
        )

    def auth_headers(self, user_id=7):
        return {"Authorization": f"Bearer {self.token(user_id)}"}

    def test_health_reports_python_and_cloud(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["server"], "python")
        self.assertIn(response.get_json()["cloud"], ("aws", "azure"))

    def test_task_routes_require_bearer_token(self):
        response = self.client.get("/tasks")

        self.assertEqual(response.status_code, 401)
        self.assertIn("error", response.get_json())

    @patch("src.app.db.execute")
    def test_list_tasks_is_scoped_to_authenticated_user(self, execute):
        execute.return_value = [
            {
                "id": 3,
                "titulo": "Demo",
                "descripcion": None,
                "completada": 0,
                "fecha_creacion": datetime(2026, 9, 28, 12, 0),
            }
        ]

        response = self.client.get("/tasks", headers=self.auth_headers(user_id=12))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()[0]["id"], 3)
        self.assertFalse(response.get_json()[0]["completada"])
        self.assertEqual(execute.call_args.args[1], (12,))

    @patch("src.app.db.execute")
    def test_create_task_returns_created_task(self, execute):
        execute.side_effect = [
            {"rowcount": 1, "lastrowid": 22},
            {
                "id": 22,
                "titulo": "Preparar demo",
                "descripcion": "",
                "completada": 0,
                "fecha_creacion": datetime(2026, 9, 28, 12, 0),
            },
        ]

        response = self.client.post(
            "/tasks",
            json={"titulo": "Preparar demo", "descripcion": ""},
            headers=self.auth_headers(),
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["tarea"]["id"], 22)
        self.assertEqual(execute.call_args_list[0].args[1][0], 7)

    def test_create_task_rejects_empty_title(self):
        response = self.client.post(
            "/tasks", json={"titulo": " "}, headers=self.auth_headers()
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())


if __name__ == "__main__":
    unittest.main()