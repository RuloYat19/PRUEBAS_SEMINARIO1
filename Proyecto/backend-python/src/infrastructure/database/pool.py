import mysql.connector.pooling
from src.config import DB_CONFIG

def crear_pool():
    return mysql.connector.pooling.MySQLConnectionPool(pool_name="semisocial",pool_size=10,**DB_CONFIG)
