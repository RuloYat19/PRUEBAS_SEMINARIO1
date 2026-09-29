from mysql.connector import pooling

from src.config import Config


class Database:
    def __init__(self):
        self._pool = None

    def _connection_pool(self):
        if self._pool is None:
            if not all((Config.DB_HOST, Config.DB_USER, Config.DB_PASSWORD)):
                raise RuntimeError("Faltan DB_HOST, DB_USER o DB_PASSWORD")
            self._pool = pooling.MySQLConnectionPool(
                pool_name="taskflow_pool",
                pool_size=5,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                charset="utf8mb4",
                use_unicode=True,
                connection_timeout=8,
            )
        return self._pool

    def execute(self, query, params=(), fetch_one=False, fetch_all=False):
        connection = self._connection_pool().get_connection()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(query, params)
            if fetch_one:
                return cursor.fetchone()
            if fetch_all:
                return cursor.fetchall()
            connection.commit()
            return {"rowcount": cursor.rowcount, "lastrowid": cursor.lastrowid}
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()


db = Database()