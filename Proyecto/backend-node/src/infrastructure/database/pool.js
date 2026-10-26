import mysql from 'mysql2/promise';

export function createDatabasePool(config, overrides = {}) {
  const pool = mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
    enableKeepAlive: true,
    ...overrides,
  });

  pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'").catch((error) => {
      console.error('[database] No se pudo establecer UTC en la sesión MySQL:', error);
    });
  });

  return pool;
}
