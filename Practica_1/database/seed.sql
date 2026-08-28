-- ============================================================================
-- Cloud Cinema — Datos semilla
-- 15 películas: 12 DISPONIBLE + 3 PROXIMO_ESTRENO.
--
-- Uso:
--   mysql -h 127.0.0.1 -P 3306 -u admin -p cloudcinema < seed.sql
--   Ejecutar DESPUÉS de schema.sql.
--
-- ============================================================================

USE cloudcinema;

INSERT INTO peliculas (titulo, director, anio, url_contenido, poster, estado) VALUES
  ('Inception',
   'Christopher Nolan', 2010,
   'https://www.youtube.com/watch?v=YoHD9XEInc0',
   'Fotos_Peliculas/inception.jpg', 'DISPONIBLE'),

  ('Interstellar',
   'Christopher Nolan', 2014,
   'https://www.youtube.com/watch?v=zSWdZVtXT7E',
   'Fotos_Peliculas/interstellar.jpg', 'DISPONIBLE'),

  ('The Matrix',
   'Lana Wachowski, Lilly Wachowski', 1999,
   'https://www.youtube.com/watch?v=vKQi3bBA1y8',
   'Fotos_Peliculas/the-matrix.jpg', 'DISPONIBLE'),

  ('Parasite',
   'Bong Joon-ho', 2019,
   'https://www.youtube.com/watch?v=5xH0HfJHsaY',
   'Fotos_Peliculas/parasite.jpg', 'DISPONIBLE'),

  ('El viaje de Chihiro',
   'Hayao Miyazaki', 2001,
   'https://www.youtube.com/watch?v=ByXuk9QqQkk',
   'Fotos_Peliculas/el-viaje-de-chihiro.jpg', 'DISPONIBLE'),

  ('Mad Max: Fury Road',
   'George Miller', 2015,
   'https://www.youtube.com/watch?v=hEJnMQG9ev8',
   'Fotos_Peliculas/mad-max-fury-road.jpg', 'DISPONIBLE'),

  ('El Gran Hotel Budapest',
   'Wes Anderson', 2014,
   'https://www.youtube.com/watch?v=1Fg5iWmQjwk',
   'Fotos_Peliculas/el-gran-hotel-budapest.jpg', 'DISPONIBLE'),

  ('Whiplash',
   'Damien Chazelle', 2014,
   'https://www.youtube.com/watch?v=7d_jQycdQGo',
   'Fotos_Peliculas/whiplash.jpg', 'DISPONIBLE'),

  ('Blade Runner 2049',
   'Denis Villeneuve', 2017,
   'https://www.youtube.com/watch?v=gCcx85zbxz4',
   'Fotos_Peliculas/blade-runner-2049.jpg', 'DISPONIBLE'),

  ('Dune: Parte Dos',
   'Denis Villeneuve', 2024,
   'https://www.youtube.com/watch?v=Way9Dexny3w',
   'Fotos_Peliculas/dune-parte-dos.jpg', 'DISPONIBLE'),

  ('Oppenheimer',
   'Christopher Nolan', 2023,
   'https://www.youtube.com/watch?v=uYPbbksJxIg',
   'Fotos_Peliculas/oppenheimer.jpg', 'DISPONIBLE'),

  ('Everything Everywhere All at Once',
   'Daniel Kwan, Daniel Scheinert', 2022,
   'https://www.youtube.com/watch?v=wxN1T1uxQ2g',
   'Fotos_Peliculas/everything-everywhere-all-at-once.jpg', 'DISPONIBLE'),


  ('Dune: Parte Tres',
   'Denis Villeneuve', 2026,
   'https://www.youtube.com/results?search_query=dune+parte+tres+trailer',
   'Fotos_Peliculas/dune-parte-tres.jpg', 'PROXIMO_ESTRENO'),

  ('The Odyssey',
   'Christopher Nolan', 2026,
   'https://www.youtube.com/results?search_query=the+odyssey+nolan+trailer',
   'Fotos_Peliculas/the-odyssey.jpg', 'PROXIMO_ESTRENO'),

  ('Toy Story 5',
   'Andrew Stanton', 2026,
   'https://www.youtube.com/results?search_query=toy+story+5+trailer',
   'Fotos_Peliculas/toy-story-5.jpg', 'PROXIMO_ESTRENO');

-- ----------------------------------------------------------------------------
-- Usuario de prueba para que R3 y R4 puedan probar /login sin registrarse.
-- MD5() lo calcula el propio MySQL, así queda idéntico al hash que generan
-- los backends. Contraseña en claro: demo1234
-- Su foto debe existir en s3://practica1-images-g8/Fotos_Perfil/demo.jpg
-- ----------------------------------------------------------------------------
INSERT INTO usuarios (correo, nombre, password, foto_perfil) VALUES
  ('demo@cloudcinema.gt', 'Usuario Demo', MD5('demo1234'), 'Fotos_Perfil/demo.jpg');

-- ----------------------------------------------------------------------------
-- Verificación rápida
-- ----------------------------------------------------------------------------
SELECT estado, COUNT(*) AS total FROM peliculas GROUP BY estado;
SELECT correo, nombre, password, CHAR_LENGTH(password) AS largo_hash FROM usuarios;
