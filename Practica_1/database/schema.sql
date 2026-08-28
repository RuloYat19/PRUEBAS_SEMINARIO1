-- ============================================================================
-- Cloud Cinema — Práctica 1 · Seminario de Sistemas 1 · Sección B · Grupo 8
-- Esquema relacional  ·  Motor: MySQL 8.0 (RDS)
-- Responsable: R2 — Datos y Almacenamiento (202300512)
--
-- Uso:
--   mysql -h 127.0.0.1 -P 3306 -u admin -p cloudcinema < schema.sql
--   (127.0.0.1 = extremo local del túnel SSH contra la EC2; ver docs/r2-datos-almacenamiento)
--
-- REGLAS DURAS DEL ENUNCIADO:
--   * La contraseña se guarda encriptada con MD5 (32 caracteres hexadecimales).
--   * Prohibido guardar binarios de imágenes. Solo se guarda la RUTA RELATIVA
--     dentro del bucket, p. ej. 'Fotos_Perfil/foto1.jpg'. Nunca la URL completa:
--     el frontend concatena el endpoint público de practica1-images-g8.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS cloudcinema
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cloudcinema;

-- Idempotente: permite recargar el esquema desde cero durante el desarrollo.
-- El orden importa por las llaves foráneas (primero la hija).
DROP TABLE IF EXISTS lista_reproduccion;
DROP TABLE IF EXISTS peliculas;
DROP TABLE IF EXISTS usuarios;

-- ----------------------------------------------------------------------------
-- usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  correo         VARCHAR(150)  NOT NULL,
  nombre         VARCHAR(100)  NOT NULL,
  -- MD5 en hexadecimal siempre mide 32 caracteres: CHAR(32) lo fija y evita
  -- que alguien inserte una contraseña en texto plano por accidente.
  password       CHAR(32)      NOT NULL,
  -- Ruta relativa dentro del bucket de imágenes: 'Fotos_Perfil/<archivo>.jpg'
  foto_perfil    VARCHAR(255)  DEFAULT NULL,
  fecha_registro DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- El correo es único: el backend responde 409 cuando este índice truena.
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- peliculas
-- ----------------------------------------------------------------------------
CREATE TABLE peliculas (
  id            INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  titulo        VARCHAR(150)   NOT NULL,
  director      VARCHAR(120)   NOT NULL,
  anio          SMALLINT UNSIGNED NOT NULL,
  -- URL de YouTube a la que redirige la lista de reproducción.
  url_contenido VARCHAR(500)   NOT NULL,
  -- Ruta relativa dentro del bucket: 'Fotos_Peliculas/<archivo>.jpg'
  poster        VARCHAR(255)   NOT NULL,
  estado        ENUM('DISPONIBLE','PROXIMO_ESTRENO') NOT NULL DEFAULT 'DISPONIBLE',

  PRIMARY KEY (id),
  -- La cartelera filtra y ordena por estado con frecuencia.
  KEY idx_peliculas_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- lista_reproduccion
-- ----------------------------------------------------------------------------
CREATE TABLE lista_reproduccion (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED NOT NULL,
  pelicula_id    INT UNSIGNED NOT NULL,
  fecha_agregado DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  -- Un usuario no puede agregar dos veces la misma película.
  UNIQUE KEY uq_lista_usuario_pelicula (usuario_id, pelicula_id),
  -- GET /playlist/:userId ordena descendente por fecha_agregado.
  KEY idx_lista_usuario_fecha (usuario_id, fecha_agregado DESC),

  CONSTRAINT fk_lista_usuario
    FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_lista_pelicula
    FOREIGN KEY (pelicula_id) REFERENCES peliculas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
