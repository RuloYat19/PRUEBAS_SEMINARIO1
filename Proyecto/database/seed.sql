-- =====================================================================
-- Semi-Social  ·  Proyecto  ·  Grupo 8
-- Datos de prueba  ·  MySQL 8.4  ·  Amazon RDS `proyecto-rds-g8`
-- Responsable: R2 (Valery Alarcón, 202300794)
-- =====================================================================
--
-- ADVERTENCIA: este script BORRA el contenido de todas las tablas antes
-- de insertar, para poder ejecutarlo varias veces sin duplicar filas.
-- No ejecutar sobre datos que se quieran conservar.
--
-- Contraseña de los 6 usuarios de prueba: Demo1234
--   MD5('Demo1234') = fd6138204c4eb1dd19e63896c1557e27
--
-- Estos usuarios existen SOLO en RDS: su `cognito_sub` es inventado, así
-- que no pueden iniciar sesión por Cognito. Sirven para desarrollar el
-- feed, los filtros, las amistades y el chat contra datos que existen.
-- Las URL usan el bucket real; los objetos se suben después.
--
-- Escenario pensado desde `valery_demo` (id 1):
--   · Amiga de isaac (2) y de raul (3)   → ve sus publicaciones.
--   · fatima (4) le envió solicitud       → PENDIENTE, aparece para aceptar.
--   · Le envió solicitud a daniel (5)     → RECHAZADA, no son amigos.
--   · ana (6) no tiene relación con nadie → aparece en "usuarios".
--   · isaac (2) y raul (3) son amigos entre sí, pero no de daniel.
--   · Las publicaciones de daniel (5) NO deben salir en el feed de 1.
-- =====================================================================

USE semisocial;

-- Primero los hijos: las claves ajenas apuntan a `usuario` y a
-- `publicacion`. Con TRUNCATE habría que desactivar FOREIGN_KEY_CHECKS.
DELETE FROM mensaje;
DELETE FROM comentario;
DELETE FROM publicacion_etiqueta;
DELETE FROM etiqueta;
DELETE FROM publicacion;
DELETE FROM solicitud_amistad;
DELETE FROM usuario;

ALTER TABLE mensaje           AUTO_INCREMENT = 1;
ALTER TABLE comentario        AUTO_INCREMENT = 1;
ALTER TABLE etiqueta          AUTO_INCREMENT = 1;
ALTER TABLE publicacion       AUTO_INCREMENT = 1;
ALTER TABLE solicitud_amistad AUTO_INCREMENT = 1;
ALTER TABLE usuario           AUTO_INCREMENT = 1;

-- ---------------------------------------------------------------------
-- usuario
-- ---------------------------------------------------------------------
INSERT INTO usuario
  (id, cognito_sub, nombre_completo, correo, dpi, password_md5,
   foto_perfil_url, foto_perfil_key, fecha_registro)
VALUES
  (1, '00000000-0000-4000-8000-000000000001', 'Valery Alarcón',   'valery.demo@semisocial.test', '3000000000101',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-valery.jpg', 'Fotos_Perfil/seed-valery.jpg',
   '2026-10-19 09:00:00'),
  (2, '00000000-0000-4000-8000-000000000002', 'Isaac Loarca',     'isaac.demo@semisocial.test',  '3000000000202',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-isaac.jpg', 'Fotos_Perfil/seed-isaac.jpg',
   '2026-10-19 09:05:00'),
  (3, '00000000-0000-4000-8000-000000000003', 'Raúl Yat',         'raul.demo@semisocial.test',   '3000000000303',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-raul.jpg', 'Fotos_Perfil/seed-raul.jpg',
   '2026-10-19 09:10:00'),
  (4, '00000000-0000-4000-8000-000000000004', 'Fátima Cerezo',    'fatima.demo@semisocial.test', '3000000000404',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-fatima.jpg', 'Fotos_Perfil/seed-fatima.jpg',
   '2026-10-19 09:15:00'),
  (5, '00000000-0000-4000-8000-000000000005', 'Daniel Hernández', 'daniel.demo@semisocial.test', '3000000000505',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-daniel.jpg', 'Fotos_Perfil/seed-daniel.jpg',
   '2026-10-19 09:20:00'),
  (6, '00000000-0000-4000-8000-000000000006', 'Ana Pérez',        'ana.demo@semisocial.test',    '3000000000606',
   'fd6138204c4eb1dd19e63896c1557e27',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Perfil/seed-ana.jpg', 'Fotos_Perfil/seed-ana.jpg',
   '2026-10-19 09:25:00');

-- ---------------------------------------------------------------------
-- solicitud_amistad
-- ---------------------------------------------------------------------
INSERT INTO solicitud_amistad
  (id, emisor_id, receptor_id, estado, fecha_solicitud, fecha_respuesta)
VALUES
  (1, 1, 2, 'ACEPTADA',  '2026-10-19 10:00:00', '2026-10-19 10:30:00'),
  (2, 3, 1, 'ACEPTADA',  '2026-10-19 11:00:00', '2026-10-19 11:15:00'),
  (3, 2, 3, 'ACEPTADA',  '2026-10-19 12:00:00', '2026-10-19 12:05:00'),
  (4, 4, 1, 'PENDIENTE', '2026-10-20 08:00:00', NULL),
  (5, 1, 5, 'RECHAZADA', '2026-10-20 09:00:00', '2026-10-20 09:45:00');

-- ---------------------------------------------------------------------
-- publicacion
-- ---------------------------------------------------------------------
INSERT INTO publicacion
  (id, usuario_id, descripcion, imagen_url, imagen_key, fecha_publicacion)
VALUES
  (1, 1, 'Mi perro en el parque',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-01.jpg', 'Fotos_Publicadas/seed-01.jpg',
   '2026-10-20 10:00:00'),
  (2, 2, 'Almuerzo en la facultad',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-02.jpg', 'Fotos_Publicadas/seed-02.jpg',
   '2026-10-20 13:00:00'),
  (3, 3, NULL,
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-03.jpg', 'Fotos_Publicadas/seed-03.jpg',
   '2026-10-20 16:30:00'),
  (4, 5, 'Volcán de Agua desde Antigua',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-04.jpg', 'Fotos_Publicadas/seed-04.jpg',
   '2026-10-20 18:00:00'),
  (5, 1, 'Estudiando para Seminario',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-05.jpg', 'Fotos_Publicadas/seed-05.jpg',
   '2026-10-21 08:00:00'),
  (6, 2, 'El edificio T-3',
   'https://semi1proyecto-g8-2s2026.s3.amazonaws.com/Fotos_Publicadas/seed-06.jpg', 'Fotos_Publicadas/seed-06.jpg',
   '2026-10-21 09:30:00');

-- ---------------------------------------------------------------------
-- etiqueta y publicacion_etiqueta
-- ---------------------------------------------------------------------
-- Nombres tal como los devuelve Rekognition DetectLabels (en inglés).
INSERT INTO etiqueta (id, nombre) VALUES
  (1, 'Dog'), (2, 'Animal'), (3, 'Pet'), (4, 'Park'),
  (5, 'Food'), (6, 'Person'), (7, 'Mountain'), (8, 'Nature'),
  (9, 'Computer'), (10, 'Book'), (11, 'Building'), (12, 'Architecture');

INSERT INTO publicacion_etiqueta (publicacion_id, etiqueta_id, confianza) VALUES
  (1, 1, 99.10), (1, 2, 99.10), (1, 3, 97.45), (1, 4, 88.20),
  (2, 5, 98.70), (2, 6, 91.35),
  (3, 6, 99.80), (3, 8, 84.10),
  (4, 7, 99.50), (4, 8, 99.50),
  (5, 9, 96.00), (5, 10, 90.25), (5, 6, 82.60),
  (6, 11, 99.90), (6, 12, 95.15);

-- ---------------------------------------------------------------------
-- comentario
-- ---------------------------------------------------------------------
INSERT INTO comentario (id, publicacion_id, usuario_id, texto, fecha_comentario) VALUES
  (1, 1, 2, '¡Qué bonito perro!',            '2026-10-20 10:15:00'),
  (2, 1, 3, '¿Cómo se llama?',               '2026-10-20 10:20:00'),
  (3, 1, 1, 'Se llama Max',                  '2026-10-20 10:25:00'),
  (4, 2, 1, 'Se ve delicioso',               '2026-10-20 13:10:00'),
  (5, 5, 2, 'Ánimo con el proyecto',         '2026-10-21 08:30:00');

-- ---------------------------------------------------------------------
-- mensaje
-- ---------------------------------------------------------------------
INSERT INTO mensaje (id, emisor_id, receptor_id, texto, fecha_envio) VALUES
  (1, 1, 2, 'Hola Isaac, ¿ya tienes la base de Node?', '2026-10-21 09:00:00.000'),
  (2, 2, 1, 'Casi, hoy la subo',                       '2026-10-21 09:01:30.250'),
  (3, 3, 1, 'Valery, ¿ya está el esquema?',            '2026-10-21 09:05:00.000');

-- =====================================================================
-- Verificación
-- =====================================================================
SELECT 'usuario' AS tabla, COUNT(*) AS filas FROM usuario
UNION ALL SELECT 'solicitud_amistad',    COUNT(*) FROM solicitud_amistad
UNION ALL SELECT 'publicacion',          COUNT(*) FROM publicacion
UNION ALL SELECT 'etiqueta',             COUNT(*) FROM etiqueta
UNION ALL SELECT 'publicacion_etiqueta', COUNT(*) FROM publicacion_etiqueta
UNION ALL SELECT 'comentario',           COUNT(*) FROM comentario
UNION ALL SELECT 'mensaje',              COUNT(*) FROM mensaje;
