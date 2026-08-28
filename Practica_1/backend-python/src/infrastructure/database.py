import mysql.connector
from mysql.connector import pooling
from src.config import Config
import logging

logger = logging.getLogger(__name__)

class Database:
    _instance = None
    _pool = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_pool()
        return cls._instance

    def _initialize_pool(self):
        try:
            self._pool = pooling.MySQLConnectionPool(
                pool_name="mypool",
                pool_size=10,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                database=Config.DB_NAME,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                charset='utf8mb4',
                use_unicode=True
            )
            logger.info("MySQL connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise

    def get_connection(self):
        return self._pool.get_connection()

    def release_connection(self, conn):
        if conn:
            conn.close()

    def execute_query(self, query, params=None, fetch_one=False, fetch_all=False, commit=True):
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params)
            
            if fetch_one:
                result = cursor.fetchone()
                return result
            if fetch_all:
                result = cursor.fetchall()
                return result
            if commit:
                conn.commit()
                return cursor.rowcount
            return cursor.rowcount
        except Exception as e:
            if conn and commit:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if cursor:
                cursor.close()
            if conn:
                self.release_connection(conn)

db = Database()