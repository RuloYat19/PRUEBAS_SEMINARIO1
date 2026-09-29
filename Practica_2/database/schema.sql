-- =====================================================================
-- TaskFlow + CloudDrive  ·  Práctica 2  ·  Grupo 8
-- Esquema relacional  ·  MySQL 8  ·  Amazon RDS `p2-rds-g8`
-- Responsable: R2 (Valery Alarcón, 202300794)
-- =====================================================================
--
-- Una sola base de datos atiende las dos nubes: los backends de AWS
-- (EC2) y los de Azure (VM) escriben sobre estas mismas tablas. Por eso
-- la tabla `archivos` guarda de qué proveedor viene cada objeto.
--
-- Reglas de diseño que exige el enunciado:
--   · La contraseña se almacena cifrada, nunca en claro.
--   · No se guardan binarios: de cada archivo e imagen se almacena
--     únicamente la URL pública del objeto en S3 o en Blob Storage.
--   · `username` es único en toda la plataforma.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS taskflow
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE taskflow;

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,

  -- Único en la plataforma: es la credencial con la que se inicia sesión.
  -- La restricción vive en la base de datos y no solo en el backend, para
  -- que dos peticiones simultáneas a máquinas distintas no puedan crear
  -- el mismo usuario dos veces.
  username         VARCHAR(50)   NOT NULL,

  correo           VARCHAR(150)  NOT NULL,

  -- bcrypt produce siempre 60 caracteres. Se reserva VARCHAR(255) para
  -- que un cambio futuro de algoritmo no obligue a migrar la columna.
  -- Nunca se almacena la contraseña en claro.
  password_hash    VARCHAR(255)  NOT NULL,

  -- URL pública completa del objeto, no la ruta ni el binario.
  -- La sube el backend con el SDK durante el registro.
  foto_perfil_url  VARCHAR(500)  DEFAULT NULL,

  fecha_registro   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- tareas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tareas (
  id                   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id           INT UNSIGNED  NOT NULL,

  titulo               VARCHAR(150)  NOT NULL,
  descripcion          TEXT          DEFAULT NULL,

  -- Estado de la tarea. TINYINT(1) es como MySQL representa BOOLEAN.
  completada           BOOLEAN       NOT NULL DEFAULT FALSE,

  fecha_creacion       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Se actualiza sola en cada UPDATE: sirve para auditar ediciones sin
  -- que el backend tenga que acordarse de tocarla.
  fecha_actualizacion  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- El contrato de API devuelve las tareas del usuario, más reciente
  -- primero. Este índice cubre exactamente esa consulta.
  KEY idx_tareas_usuario_fecha (usuario_id, fecha_creacion DESC),

  CONSTRAINT fk_tareas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- archivos
-- ---------------------------------------------------------------------
-- Guarda los METADATOS del archivo. El binario vive en S3 o en Blob
-- Storage, subido por Lambda o por Azure Functions; aquí solo queda su
-- URL pública.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archivos (
  id            INT UNSIGNED             NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED             NOT NULL,

  nombre        VARCHAR(255)             NOT NULL,

  -- El enunciado pide como mínimo imágenes y archivos de texto.
  tipo          ENUM('IMAGEN','TEXTO')   NOT NULL,

  url           VARCHAR(500)             NOT NULL,

  -- Columna clave de esta práctica: la misma base atiende dos nubes.
  -- Un archivo subido por la Lambda vive en S3 y uno subido por la
  -- Azure Function vive en Blob Storage. Sin esta columna no se puede
  -- explicar de dónde sale cada URL.
  proveedor     ENUM('AWS','AZURE')      NOT NULL,

  tamano_bytes  BIGINT UNSIGNED          NOT NULL DEFAULT 0,
  fecha_carga   DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_archivos_usuario_fecha (usuario_id, fecha_carga DESC),

  CONSTRAINT fk_archivos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Verificación
-- =====================================================================
SELECT
  TABLE_NAME       AS tabla,
  ENGINE           AS motor,
  TABLE_COLLATION  AS colacion
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'taskflow'
ORDER BY TABLE_NAME;
