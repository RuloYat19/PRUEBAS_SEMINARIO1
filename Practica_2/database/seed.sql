-- =====================================================================
-- TaskFlow + CloudDrive  ·  Práctica 2  ·  Grupo 8
-- Datos de prueba  ·  MySQL 8  ·  Amazon RDS `p2-rds-g8`
-- Responsable: R2 (Valery Alarcón, 202300794)
-- =====================================================================
--
-- ADVERTENCIA: este script BORRA el contenido de las 3 tablas antes de
-- insertar, para poder ejecutarlo varias veces sin duplicar filas.
-- No ejecutar sobre datos que se quieran conservar.
--
-- Contraseña de los 2 usuarios de prueba: Demo1234
-- Los hash son bcrypt reales, generados con bcryptjs (coste 10) y
-- verificados con compareSync. El backend de Isaac y el de Raúl deben
-- poder validar esa contraseña sin tocar nada más.
--
-- Las URL de ejemplo usan los nombres reales del bucket de S3 y del
-- contenedor de Blob Storage, así que quedan bien formadas. Los objetos
-- se suben después: estas filas sirven para que Fátima pueda maquetar
-- el frontend contra datos que existen.
-- =====================================================================

USE taskflow;

-- El orden importa: primero los hijos, porque las claves ajenas apuntan
-- a `usuarios`. Con TRUNCATE habría que desactivar FOREIGN_KEY_CHECKS,
-- así que se usa DELETE y se reinician los contadores a mano.
DELETE FROM archivos;
DELETE FROM tareas;
DELETE FROM usuarios;

ALTER TABLE archivos AUTO_INCREMENT = 1;
ALTER TABLE tareas   AUTO_INCREMENT = 1;
ALTER TABLE usuarios AUTO_INCREMENT = 1;

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
-- La foto de perfil de cada uno vive en una nube distinta a propósito:
-- demuestra que el registro funciona igual en AWS y en Azure.
INSERT INTO usuarios (id, username, correo, password_hash, foto_perfil_url) VALUES
  (1, 'valery_demo', 'valery.demo@taskflow.g8',
   '$2b$10$O/o7laLjyuxxkzBFhAen4eviJIsoc8UvsYUWSUivP79Rjn0eMm21O',
   'https://practica2semi1b2s2026archivosg8.s3.us-east-1.amazonaws.com/fotos_perfil/1/avatar-valery.png'),

  (2, 'isaac_demo', 'isaac.demo@taskflow.g8',
   '$2b$10$udNyNmPwIinzAPC4Q/EjY.Ehc58s8tIqIkzAnWwSthOL62tp8RYD.',
   'https://p2g8semi1b2s2026.blob.core.windows.net/practica2semi1b2s2026archivosg8/fotos_perfil/2/avatar-isaac.png');

-- ---------------------------------------------------------------------
-- tareas
-- ---------------------------------------------------------------------
-- Se dejan tareas pendientes y completadas para que el filtro del
-- frontend tenga algo que filtrar.
INSERT INTO tareas (usuario_id, titulo, descripcion, completada) VALUES
  (1, 'Crear la instancia de RDS',
      'Instancia MySQL p2-rds-g8 en us-east-1 con acceso público y el grupo de seguridad p2-rds-sg-g8.', TRUE),
  (1, 'Cargar el esquema en la base',
      'Ejecutar schema.sql y seed.sql contra el endpoint de RDS.', TRUE),
  (1, 'Crear los 2 buckets de S3',
      'Uno para la página web estática y otro para los archivos de los usuarios.', FALSE),
  (1, 'Crear la cuenta de almacenamiento de Azure',
      'Sitio web estático en $web y contenedor para archivos, en canadacentral.', FALSE),
  (1, 'Documentar la comparación S3 contra Blob Storage',
      'Sección del manual técnico que alimenta la conclusión de AWS contra Azure.', FALSE),

  (2, 'Levantar el backend de Node en las 2 nubes',
      'EC2 p2-ec2-node-g8 en AWS y VM vm-p2-node-g8 en Azure, escuchando en el puerto 3000.', TRUE),
  (2, 'Conectar el backend a RDS',
      'Variables DB_HOST, DB_USER, DB_PASSWORD y DB_NAME en el archivo .env de cada máquina.', FALSE),
  (2, 'Implementar el login con bcrypt',
      'Comparar la contraseña recibida contra password_hash, nunca guardarla en claro.', FALSE),
  (2, 'Probar el balanceador con una máquina apagada',
      'Verificar que el tráfico se reparte y que la aplicación sigue respondiendo.', FALSE);

-- ---------------------------------------------------------------------
-- archivos
-- ---------------------------------------------------------------------
-- Las 4 combinaciones de tipo y proveedor, para que se vea que la misma
-- tabla atiende las 2 nubes y los 2 tipos de archivo.
INSERT INTO archivos (usuario_id, nombre, tipo, url, proveedor, tamano_bytes) VALUES
  (1, 'diagrama-arquitectura.png', 'IMAGEN',
      'https://practica2semi1b2s2026archivosg8.s3.us-east-1.amazonaws.com/imagenes/1/diagrama-arquitectura.png',
      'AWS', 248310),
  (1, 'notas-rds.txt', 'TEXTO',
      'https://practica2semi1b2s2026archivosg8.s3.us-east-1.amazonaws.com/documentos/1/notas-rds.txt',
      'AWS', 1042),
  (1, 'captura-blob-storage.png', 'IMAGEN',
      'https://p2g8semi1b2s2026.blob.core.windows.net/practica2semi1b2s2026archivosg8/imagenes/1/captura-blob-storage.png',
      'AZURE', 315874),

  (2, 'endpoints-api.txt', 'TEXTO',
      'https://p2g8semi1b2s2026.blob.core.windows.net/practica2semi1b2s2026archivosg8/documentos/2/endpoints-api.txt',
      'AZURE', 2318),
  (2, 'captura-balanceador.png', 'IMAGEN',
      'https://practica2semi1b2s2026archivosg8.s3.us-east-1.amazonaws.com/imagenes/2/captura-balanceador.png',
      'AWS', 187265);

-- =====================================================================
-- Verificación
-- =====================================================================
SELECT 'usuarios' AS tabla, COUNT(*) AS filas FROM usuarios
UNION ALL SELECT 'tareas',   COUNT(*) FROM tareas
UNION ALL SELECT 'archivos', COUNT(*) FROM archivos;

-- Reparto de archivos por nube: la columna `proveedor` en acción.
SELECT proveedor, tipo, COUNT(*) AS cantidad
FROM archivos
GROUP BY proveedor, tipo
ORDER BY proveedor, tipo;

-- Prueba de que ON DELETE CASCADE está activo (solo lectura, no borra).
SELECT
  u.username,
  (SELECT COUNT(*) FROM tareas   t WHERE t.usuario_id = u.id) AS tareas,
  (SELECT COUNT(*) FROM archivos a WHERE a.usuario_id = u.id) AS archivos
FROM usuarios u
ORDER BY u.id;
