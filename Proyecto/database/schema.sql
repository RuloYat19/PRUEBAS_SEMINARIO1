-- =====================================================================
-- Semi-Social  ·  Proyecto  ·  Grupo 8
-- Esquema relacional  ·  MySQL 8.4  ·  Amazon RDS `proyecto-rds-g8`
-- Responsable: R2 (Valery Alarcón, 202300794)
-- =====================================================================
--
-- Los dos backends (Node.js en la EC2 No.1 y Python en la EC2 No.2)
-- escriben sobre estas mismas tablas. Cualquier regla que deba cumplirse
-- sin importar a qué instancia mande el ALB la petición vive aquí, en la
-- base de datos, y no solo en el código.
--
-- Reglas que exige el enunciado:
--   · La contraseña se guarda en MD5 (criterio 1.5 de la rúbrica).
--     Cognito guarda la suya por separado.
--   · No se guardan binarios: de cada imagen solo se almacena su URL
--     pública en S3 y su key (la necesita Rekognition).
--   · La amistad se obtiene de las solicitudes ACEPTADAS, sin tabla aparte.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS semisocial
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE semisocial;

-- ---------------------------------------------------------------------
-- usuario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,

  -- Identificador del usuario en el user pool de Cognito (UUID de 36
  -- caracteres). Es el puente entre las dos fuentes: el token que valida
  -- el backend trae el `sub`, y con él se encuentra la fila en RDS.
  cognito_sub      VARCHAR(64)   NOT NULL,

  nombre_completo  VARCHAR(150)  NOT NULL,

  -- Es también el nombre de usuario en Cognito, por eso es único.
  correo           VARCHAR(150)  NOT NULL,

  -- El DPI guatemalteco tiene 13 dígitos. Se guarda como texto porque
  -- es un identificador, no un número con el que se opere.
  dpi              CHAR(13)      NOT NULL,

  -- MD5 produce siempre 32 caracteres hexadecimales. Lo exige la
  -- rúbrica aunque MD5 ya no se considera seguro para contraseñas.
  password_md5     CHAR(32)      NOT NULL,

  -- URL pública del objeto en `Fotos_Perfil/` (la muestra el frontend) y
  -- su key (la usa Rekognition CompareFaces en el login facial).
  foto_perfil_url  VARCHAR(500)  NOT NULL,
  foto_perfil_key  VARCHAR(255)  NOT NULL,

  fecha_registro   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_cognito_sub (cognito_sub),
  UNIQUE KEY uq_usuario_correo (correo),
  UNIQUE KEY uq_usuario_dpi (dpi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- solicitud_amistad
-- ---------------------------------------------------------------------
-- Una sola fila por pareja de usuarios, sin importar quién la envió.
-- Si B ya le mandó solicitud a A, A no puede crear otra hacia B: la
-- pareja (menor, mayor) es única. Reenviar una solicitud RECHAZADA se
-- hace actualizando esa misma fila a PENDIENTE.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitud_amistad (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  emisor_id        INT UNSIGNED  NOT NULL,
  receptor_id      INT UNSIGNED  NOT NULL,

  estado           ENUM('PENDIENTE','ACEPTADA','RECHAZADA')
                                 NOT NULL DEFAULT 'PENDIENTE',

  fecha_solicitud  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_respuesta  DATETIME      DEFAULT NULL,

  -- Columnas calculadas que ordenan la pareja para el índice único.
  usuario_menor    INT UNSIGNED  AS (LEAST(emisor_id, receptor_id)) VIRTUAL,
  usuario_mayor    INT UNSIGNED  AS (GREATEST(emisor_id, receptor_id)) VIRTUAL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitud_pareja (usuario_menor, usuario_mayor),
  KEY idx_solicitud_receptor (receptor_id, estado),
  KEY idx_solicitud_emisor (emisor_id, estado),

  CONSTRAINT fk_solicitud_emisor
    FOREIGN KEY (emisor_id) REFERENCES usuario (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_solicitud_receptor
    FOREIGN KEY (receptor_id) REFERENCES usuario (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nadie puede mandarse una solicitud a sí mismo. MySQL no permite un
-- CHECK sobre columnas con ON DELETE CASCADE, así que se valida con
-- triggers.
DROP TRIGGER IF EXISTS trg_solicitud_no_propia_ins;
DROP TRIGGER IF EXISTS trg_solicitud_no_propia_upd;

DELIMITER //
CREATE TRIGGER trg_solicitud_no_propia_ins
BEFORE INSERT ON solicitud_amistad
FOR EACH ROW
BEGIN
  IF NEW.emisor_id = NEW.receptor_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Un usuario no puede enviarse solicitud a si mismo';
  END IF;
END//

CREATE TRIGGER trg_solicitud_no_propia_upd
BEFORE UPDATE ON solicitud_amistad
FOR EACH ROW
BEGIN
  IF NEW.emisor_id = NEW.receptor_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Un usuario no puede enviarse solicitud a si mismo';
  END IF;
END//
DELIMITER ;

-- Vista con la amistad en las dos direcciones: cada amistad aceptada
-- aparece dos veces, (A, B) y (B, A). Así "los amigos de X" es siempre
-- `WHERE usuario_id = X`, sin tener que revisar emisor y receptor.
CREATE OR REPLACE VIEW amistad AS
  SELECT emisor_id AS usuario_id, receptor_id AS amigo_id, fecha_respuesta AS desde
  FROM solicitud_amistad
  WHERE estado = 'ACEPTADA'
  UNION ALL
  SELECT receptor_id AS usuario_id, emisor_id AS amigo_id, fecha_respuesta AS desde
  FROM solicitud_amistad
  WHERE estado = 'ACEPTADA';

-- ---------------------------------------------------------------------
-- publicacion
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacion (
  id                 INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  usuario_id         INT UNSIGNED   NOT NULL,

  -- La descripción es opcional; la imagen es obligatoria.
  descripcion        VARCHAR(1000)  DEFAULT NULL,

  -- URL pública del objeto en `Fotos_Publicadas/` y su key, que es lo
  -- que recibe Rekognition DetectLabels.
  imagen_url         VARCHAR(500)   NOT NULL,
  imagen_key         VARCHAR(255)   NOT NULL,

  fecha_publicacion  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- El feed pide las publicaciones de un conjunto de usuarios, más
  -- recientes primero.
  KEY idx_publicacion_usuario_fecha (usuario_id, fecha_publicacion DESC),

  CONSTRAINT fk_publicacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- etiqueta
-- ---------------------------------------------------------------------
-- Catálogo de etiquetas que ha devuelto Rekognition. Cada nombre existe
-- una sola vez, así el filtro compara por id y la lista de filtros no
-- repite etiquetas.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etiqueta (
  id      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(100)  NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_etiqueta_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- publicacion_etiqueta
-- ---------------------------------------------------------------------
-- Relación muchos a muchos: una publicación tiene varias etiquetas y
-- una etiqueta aparece en muchas publicaciones.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacion_etiqueta (
  publicacion_id  INT UNSIGNED   NOT NULL,
  etiqueta_id     INT UNSIGNED   NOT NULL,

  -- Porcentaje de confianza que devolvió DetectLabels (0 a 100).
  confianza       DECIMAL(5,2)   NOT NULL,

  PRIMARY KEY (publicacion_id, etiqueta_id),

  -- Para filtrar: "publicaciones que tienen la etiqueta X".
  KEY idx_publicacion_etiqueta_etiqueta (etiqueta_id),

  CONSTRAINT fk_pub_etiqueta_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicacion (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pub_etiqueta_etiqueta
    FOREIGN KEY (etiqueta_id) REFERENCES etiqueta (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- comentario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentario (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  publicacion_id    INT UNSIGNED   NOT NULL,
  usuario_id        INT UNSIGNED   NOT NULL,

  texto             VARCHAR(1000)  NOT NULL,
  fecha_comentario  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_comentario_publicacion_fecha (publicacion_id, fecha_comentario),

  CONSTRAINT fk_comentario_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicacion (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_comentario_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- mensaje
-- ---------------------------------------------------------------------
-- Cada mensaje del chat se guarda aquí. Las dos EC2 lo usan como relevo:
-- cada instancia consulta los mensajes con `id` mayor al último que
-- entregó y los reenvía a sus propios sockets, así emisor y receptor
-- pueden estar conectados a instancias distintas.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensaje (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  emisor_id    INT UNSIGNED     NOT NULL,
  receptor_id  INT UNSIGNED     NOT NULL,

  texto        VARCHAR(2000)    NOT NULL,

  -- Milisegundos: varios mensajes pueden llegar en el mismo segundo.
  fecha_envio  DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),

  -- Relevo: mensajes nuevos para un receptor (`id > ultimo`).
  KEY idx_mensaje_receptor (receptor_id, id),

  -- Historial de una conversación en orden.
  KEY idx_mensaje_conversacion (emisor_id, receptor_id, id),

  CONSTRAINT fk_mensaje_emisor
    FOREIGN KEY (emisor_id) REFERENCES usuario (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mensaje_receptor
    FOREIGN KEY (receptor_id) REFERENCES usuario (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- Verificación
-- =====================================================================
SELECT
  TABLE_NAME       AS tabla,
  TABLE_TYPE       AS tipo,
  ENGINE           AS motor,
  TABLE_COLLATION  AS colacion
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'semisocial'
ORDER BY TABLE_TYPE, TABLE_NAME;
