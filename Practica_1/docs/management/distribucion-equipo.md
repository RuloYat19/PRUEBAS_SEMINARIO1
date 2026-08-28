# Distribución de trabajo — Práctica 1 "Cloud Cinema"

**Curso:** Seminario de Sistemas 1 · Sección B
**Grupo:** G8
**Entrega:** 01/09/2026 · **Calificación:** 05/09/2026
**Repositorio:** `SEMINARIO1_A_2S2026_G8` → carpeta `Practica_1/`

---

## 1. Criterio de la división

La práctica se parte en **5 verticales que pueden avanzar en paralelo** una vez cerrado el
contrato de API (sección 5). Cada integrante es *dueño* de un conjunto cerrado de recursos AWS
y de código, de modo que:

- nadie bloquea a nadie más de un día,
- cada quien puede responder con dominio las **preguntas de conocimiento (10 pts)** sobre su área,
- la rúbrica queda cubierta al 100 % sin solapamientos.

La carga está deliberadamente desbalanceada en el tiempo: **R1 y R2 son intensivos en la
semana 1** (sin infraestructura nadie despliega) y a partir del 25/08 se reincorporan al
frontend, pruebas y documentación, que es donde se concentra el trabajo de la semana 2.

---

## 2. Tabla de asignación

| # | Integrante | Rol | Alcance principal | Pts de rúbrica que defiende |
|---|-----------|-----|-------------------|------------------------------|
| R1 | Valery | **Cloud Core / Seguridad** | IAM, Security Groups, Application Load Balancer | 10 + 7 + 12 = **29** |
| R2 | Daniel | **Datos y Almacenamiento** | RDS, modelo E-R, buckets S3 y políticas públicas | 10 + 7 = **17** |
| R3 | Isaac | **Backend Node.js** | EC2 #1, API Express, SDK de AWS | 7 + funcionalidad |
| R4 | Raúl | **Backend Python** | EC2 #2, API FastAPI/Flask, boto3 | 7 + funcionalidad |
| R5 | Fátima | **Frontend Web** | SPA React, hosting estático en S3 | 25 (funcionalidad) |
| — | Todos | Documentación | `README.md` / manual técnico | 5 |

> El total de infraestructura (60) + funcionalidad (25) + documentación (5) + preguntas (10) = 100.

---

## 3. Detalle por integrante

### R1 — Cloud Core / Seguridad *(también coordinador de integración)*

**Responsable de que la cuenta de AWS esté ordenada y de que el tráfico llegue a donde debe.**

Entregables:
1. **Usuarios y políticas IAM, uno por servicio** (separación de responsabilidades, es lo que
   pide la rúbrica explícitamente):
   - `iam-s3-g8` → política con `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` **solo** sobre
     los dos buckets del grupo.
   - `iam-ec2-g8` → administración de instancias del grupo.
   - `iam-rds-g8` → conexión/administración de la base de datos.
   - `iam-elb-g8` → creación y gestión del balanceador y target groups.
   - Credenciales de acceso programático entregadas a R3/R4 (nunca commiteadas al repo).
2. **Security Groups** con el mínimo necesario:
   - `sg-alb` → 80/tcp desde `0.0.0.0/0`.
   - `sg-ec2` → puerto de la app (p. ej. 3000) **solo** desde `sg-alb`; 22/tcp solo desde la IP
     del equipo.
   - `sg-rds` → 3306/5432 **solo** desde `sg-ec2` (nunca abierto a internet).
3. **Application Load Balancer**: target group con las dos instancias, health check sobre
   `GET /health`, verificación de reparto equitativo y **prueba de apagado manual de una EC2
   con la app siguiendo operativa** (es el criterio de los 12 pts).
4. Levantar las dos instancias EC2 (par de llaves, AMI, tipo) y entregarlas listas a R3 y R4.
5. Sección de IAM, Security Groups y arquitectura del manual técnico + diagrama de arquitectura.

Depende de: nadie. **Bloquea a: todos.** Debe terminar los puntos 1, 2 y 4 antes del 21/08.

---

### R2 — Datos y Almacenamiento

**Responsable de dónde vive la información: RDS para datos, S3 para binarios.**

Entregables:
1. **Instancia RDS** (MySQL o PostgreSQL), no pública, accesible solo desde `sg-ec2`.
2. **Esquema relacional** versionado en `Practica_1/database/schema.sql`:
   - `usuarios` (id, correo **único**, nombre, password **MD5**, foto_perfil *(ruta, no binario)*)
   - `peliculas` (id, titulo, director, anio, url_contenido, poster *(ruta)*, estado
     `DISPONIBLE | PROXIMO_ESTRENO`)
   - `lista_reproduccion` (id, usuario_id, pelicula_id, fecha_agregado, único por par
     usuario-película para evitar duplicados)
3. **Script de datos semilla** con al menos 12 películas, mezclando ambos estados, con sus
   pósters ya cargados en S3.
4. **Buckets S3**:
   - `practica1-web-g8` → hosting estático (entregado a R5).
   - `practica1-images-g8` → carpetas `Fotos_Perfil/` y `Fotos_Peliculas/`, con *bucket policy*
     pública de `s3:GetObject` para no tener que publicar cada objeto a mano.
5. **Diagrama entidad-relación** para el manual técnico + sección de RDS y S3.

**Nota:** los nombres de bucket en AWS no admiten mayúsculas. El enunciado los escribe como
`Practica1-Web-G8`; se crean en minúsculas (`practica1-web-g8`) y se deja constancia de ello en
el README para evitar restarle puntos por "nombre distinto".

**Regla dura:** en la base de datos solo se guardan rutas del tipo `Fotos_Perfil/foto1.jpg`,
nunca binarios ni URLs completas.

Depende de: R1 (usuarios IAM y `sg-rds`). Bloquea a: R3 y R4.

---

### R3 — Backend Node.js (EC2 #1)

**API en Express desplegada en la primera instancia.** Implementa el 100 % de los endpoints del
contrato (sección 5).

Entregables:
1. Código en `Practica_1/backend-node/`.
2. Conexión a RDS por variables de entorno (`.env` fuera del repo, `.env.example` dentro).
3. **AWS SDK v3 (`@aws-sdk/client-s3`)** para subir foto de perfil y pósters a
   `practica1-images-g8`; guardar en BD únicamente la ruta relativa.
4. Hash **MD5** de contraseñas en registro, login y validación de edición de perfil.
5. Validaciones: correo único, formato de correo, coincidencia de contraseña y confirmación.
6. `GET /health` para el health check del ALB.
7. Despliegue en EC2 #1 con **pm2** (o systemd) para que sobreviva a reinicios + CORS abierto al
   origen del sitio S3.
8. Sección de "Instancia EC2 No. 1" del manual, con capturas.

Depende de: R1 (instancia + SG + credenciales IAM), R2 (esquema y buckets).

---

### R4 — Backend Python (EC2 #2)

**Misma API, otro lenguaje.** El balanceador debe poder mandar cualquier petición a cualquiera
de las dos instancias sin que el frontend note diferencia.

Entregables:
1. Código en `Practica_1/backend-python/` con FastAPI (recomendado) o Flask.
2. Mismos endpoints, **mismos nombres de campos JSON y mismos códigos de estado** que R3.
3. **boto3** para S3 y driver correspondiente para RDS.
4. MD5, validaciones y `GET /health` idénticos.
5. Despliegue en EC2 #2 con gunicorn/uvicorn + systemd.
6. Sección de "Instancia EC2 No. 2" del manual, con capturas.

Depende de: R1 y R2. **Debe sincronizar diariamente con R3**: cualquier cambio al contrato se
acuerda entre ambos antes de implementarlo.

---

### R5 — Frontend Web

**SPA en React (la rúbrica exige React o Angular) apuntando al DNS del balanceador.**

Entregables:
1. Código en `Practica_1/frontend/`. La URL base de la API se toma de una variable de entorno
   (`VITE_API_URL`) apuntando **siempre al DNS del ALB**, nunca a una IP de EC2.
2. Pantallas:
   - **Registro:** correo, nombre, contraseña + confirmación, foto de perfil desde archivo
     **o capturada con la cámara** (`getUserMedia`) — este último punto se suele olvidar.
   - **Login:** validación de formato de correo antes de enviar.
   - **Galería/Cartelera:** póster desde S3, título, director, año, URL de contenido y estado.
     Botón "Agregar a mi lista" habilitado solo si está *Disponible*; si es *Próximo estreno*,
     etiqueta informativa. **Notificación (toast) al agregar.**
   - **Edición de perfil:** nombre y foto, con contraseña actual obligatoria para confirmar.
   - **Mi lista de reproducción:** orden cronológico inverso (lo más reciente primero), clic
     redirige a la URL de YouTube, opción de eliminar.
3. **Despliegue en `practica1-web-g8`** como sitio web estático y verificación del endpoint
   público del bucket.
4. Capturas de la aplicación web para el manual.

Depende de: contrato de API (día 1), no de que los backends estén listos — se trabaja contra
datos simulados hasta el 25/08.

---

## 4. Trabajo compartido (todos)

- **Manual técnico** en `Practica_1/README.md`: cada quien redacta su sección y adjunta sus
  capturas. R1 consolida y revisa que estén los cinco bloques exigidos (datos de estudiantes,
  arquitectura, usuarios IAM, diagrama E-R, capturas).
- **Preguntas de conocimiento (10 pts):** se califica que *todos* respondan. En la sesión del
  30/08 cada integrante explica su área al resto y responde preguntas cruzadas.
- Agregar como colaborador del repositorio privado a **`marckomatic`** (sección B) — tarea de R1
  el primer día.
- Ningún secreto (llaves IAM, contraseña de RDS, `.pem`) se sube al repositorio.

---

## 5. Contrato de API — acuerdo previo obligatorio

R3 y R4 implementan **exactamente** esto; R5 programa contra ello. Se cierra el **20/08** y
cualquier cambio posterior requiere aviso a los tres.

| Método | Ruta | Cuerpo / parámetros | Respuesta |
|--------|------|---------------------|-----------|
| `GET` | `/health` | — | `200 {"status":"ok","server":"node\|python"}` |
| `POST` | `/register` | `multipart`: `correo`, `nombre`, `password`, `confirmPassword`, `foto` | `201 {usuario}` · `409` correo duplicado |
| `POST` | `/login` | `{correo, password}` | `200 {usuario}` · `401` credenciales inválidas |
| `GET` | `/movies` | — | `200 [{id,titulo,director,anio,url,poster,estado}]` |
| `GET` | `/profile/:userId` | — | `200 {usuario}` |
| `PUT` | `/profile/:userId` | `multipart`: `nombre`, `foto?`, `passwordActual` | `200 {usuario}` · `401` contraseña incorrecta |
| `GET` | `/playlist/:userId` | — | `200 [...]` orden descendente por `fecha_agregado` |
| `POST` | `/playlist` | `{userId, movieId}` | `201` · `400` si la película es *Próximo estreno* |
| `DELETE` | `/playlist/:id` | — | `204` |

El campo `poster` y `foto_perfil` viajan como **ruta relativa**; el frontend arma la URL
concatenando el endpoint público del bucket de imágenes.

---

## 6. Cronograma

| Fecha | Hito | Responsable |
|-------|------|-------------|
| 19/08 | Repositorio creado, colaborador agregado, estructura de carpetas | R1 |
| 20/08 | **Contrato de API cerrado** y firmado por R3, R4, R5 | Todos |
| 21/08 | IAM, Security Groups y las 2 EC2 entregadas | R1 |
| 22/08 | RDS activa + esquema + buckets S3 creados | R2 |
| 25/08 | Datos semilla cargados y pósters en S3 | R2 |
| 26/08 | Ambos backends funcionando en sus EC2 (probados por IP directa) | R3, R4 |
| 27/08 | **ALB en línea** apuntando a ambas instancias | R1 |
| 28/08 | Frontend desplegado en S3 consumiendo el ALB | R5 |
| 29/08 | **Prueba de alta disponibilidad**: apagar una EC2 y verificar que todo sigue | R1 + todos |
| 30/08 | Manual técnico consolidado + repaso cruzado de preguntas | Todos |
| 31/08 | Congelamiento de código, pruebas de extremo a extremo | Todos |
| 01/09 | **Entrega** | — |

Hay un día de holgura antes de la entrega a propósito: la rúbrica prohíbe modificar código o
configuración durante la calificación, así que el 31/08 nada se toca salvo por un fallo crítico.

---

## 7. Convenciones

- **Ramas:** `feature/<carné>/<tema>` (ej. `feature/202300512/backend-node`), *pull request* a
  `main` con revisión de al menos un compañero.
- **Commits:** `tipo(carné): descripción` — como el historial actual del repositorio.
- **Nombres de recursos AWS:** sufijo `-g8` en todo (buckets, SG, usuarios IAM, target groups)
  para no confundirse con recursos de otros grupos si se comparte cuenta.

---

## 8. Riesgos identificados

| Riesgo | Mitigación | Dueño |
|--------|-----------|-------|
| Las dos APIs divergen y el balanceador expone comportamientos distintos | Contrato de la sección 5 + prueba cruzada: R5 apunta a cada IP por separado antes del ALB | R3, R4 |
| Health check mal configurado → el ALB saca instancias sanas | Implementar `/health` desde el primer día y validarlo antes de conectar el frontend | R1 |
| Buckets públicos bloqueados por *Block Public Access* | Desactivarlo explícitamente en el bucket de imágenes y probar una URL desde una ventana privada | R2 |
| CORS entre el sitio S3 y el ALB | Habilitar CORS en ambos backends desde el inicio, no al final | R3, R4 |
| Un integrante no domina su área en las preguntas (10 pts en juego) | Sesión de repaso cruzado del 30/08 | Todos |
| Costo/agotamiento de créditos AWS | Apagar EC2 y RDS fuera de horas de trabajo, salvo del 31/08 en adelante | R1 |
