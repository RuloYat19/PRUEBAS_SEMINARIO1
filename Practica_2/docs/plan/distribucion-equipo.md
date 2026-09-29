# Distribución de trabajo — Práctica 2 "TaskFlow + CloudDrive"

**Curso:** Seminario de Sistemas 1 · Sección B
**Grupo:** G8
**Asignación:** 22/09/2026 · **Entrega:** 06/10/2026 · **Calificación:** 10/10/2026
**Repositorio:** `SEMINARIO1_A_2S2026_G8` → carpeta `Practica_2/`
**Enunciado:** [`Practica_2_2S2026.md`](Practica_2_2S2026.md)

---

## Índice

1. [Qué cambia respecto a la Práctica 1](#1-qué-cambia-respecto-a-la-práctica-1)
2. [Criterio de la división](#2-criterio-de-la-división)
3. [Tabla de asignación](#3-tabla-de-asignación)
4. [Detalle por integrante](#4-detalle-por-integrante)
5. [Trabajo compartido](#5-trabajo-compartido)
6. [Contrato de API de los backends](#6-contrato-de-api-de-los-backends)
7. [Contrato de los servicios serverless](#7-contrato-de-los-servicios-serverless)
8. [Modelo de datos](#8-modelo-de-datos)
9. [Nombres de recursos](#9-nombres-de-recursos)
10. [Cronograma](#10-cronograma)
11. [Definición de terminado y capturas exigidas](#11-definición-de-terminado-y-capturas-exigidas)
12. [Riesgos identificados](#12-riesgos-identificados)
13. [Estructura del entregable](#13-estructura-del-entregable)
14. [Decisiones confirmadas y puntos abiertos](#14-decisiones-confirmadas-y-puntos-abiertos)

---

## 1. Qué cambia respecto a la Práctica 1

La aplicación es nueva (tareas + archivos en vez de películas), pero **la mitad del trabajo de
infraestructura ya lo hicimos**. Lo que cambia de verdad es que ahora hay **dos nubes** y
**servicios serverless**.

| Aspecto | Práctica 1 | Práctica 2 |
|---|---|---|
| Proveedores | AWS | **AWS + Microsoft Azure** |
| Servidores backend | 2 (EC2 Node + EC2 Python) | **4** (EC2 Node, EC2 Python, Azure VM Node, Azure VM Python) |
| Balanceadores | 1 (ALB) | **2** (Classic ELB + Azure Load Balancer) |
| Hosting estático | S3 | S3 + **Blob Storage (`$web`)** |
| Almacenamiento de archivos | S3 vía SDK del backend | S3 y Blob vía **Lambda / Azure Functions** |
| Puertas de API | — | **API Gateway + API Management** |
| Base de datos | RDS | RDS (una sola, compartida por las dos nubes) |
| Peso de la rúbrica | Infra AWS 60 | **Azure 40 · AWS 20 · funcionalidad 26 · doc+preguntas 14** |

**Lo que se reutiliza de la Práctica 1** (no se reescribe, se adapta):

- Registro, inicio de sesión y validaciones de ambos backends (`Practica_1/backend-node/`,
  `Practica_1/backend-python/`) → solo cambia el hash y el campo `username`.
- El SPA de React + Vite con diseño atómico (`Practica_1/frontend/`): layouts, rutas protegidas,
  formularios de auth, sistema de *toasts* y tema.
- Las políticas IAM de `Practica_1/infra/iam/` y la *bucket policy* pública de S3.
- El runbook de despliegue en EC2 (`Practica_1/docs/guides/r1-cloud-core-runbook.md`): pm2 para
  Node, systemd+gunicorn para Python. **Sirve igual para las Azure VM** (ambas son Linux).

> **Consecuencia práctica:** el cuello de botella de esta práctica no es programar, es
> **aprovisionar Azure y las dos puertas de API**. Por eso el reparto carga a Azure con dos
> personas dedicadas y el frontend arranca contra datos simulados desde el día 1.

---

## 2. Criterio de la división

La práctica se parte en **5 verticales que avanzan en paralelo** una vez cerrados los dos
contratos (secciones 6 y 7). El reparto obedece a tres reglas:

1. **Cada integrante es dueño de recursos cerrados**, en las dos nubes cuando el servicio tiene
   equivalente. Quien monta S3 monta Blob; quien monta el ELB monta el Azure Load Balancer. Así
   la *conclusión sobre las diferencias entre AWS y Azure* que pide el entregable la escribe
   quien realmente comparó ambos, y cada quien puede defender su área en las **preguntas
   (9 pts)**.
2. **El serverless lo escribe quien domina el lenguaje del runtime.** Las Lambda van en Node
   (R3, que ya usa `@aws-sdk/client-s3`) y las Azure Functions en Python (R4, que ya usa
   `boto3`/SDK). Nadie aprende un lenguaje nuevo a mitad de la práctica.
3. **El backend viaja con su dueño a las dos nubes.** Desplegar la misma app en una Azure VM
   cuesta una fracción de lo que costó la primera vez; repartir "EC2 a uno y VM a otro" habría
   duplicado la depuración de la misma aplicación.

La carga está desbalanceada en el tiempo a propósito: **R1 y R2 son intensivos del 23/09 al
29/09** (sin red, credenciales ni base de datos nadie despliega) y a partir del 30/09 se
reincorporan como apoyo de Azure, pruebas y documentación, que es donde se concentra la
semana 2.

---

## 3. Tabla de asignación

| # | Integrante | Carné | Rol | Alcance principal | Pts de rúbrica que defiende |
|---|---|---|---|---|---|
| R1 | Daniel Hernández | 202300512 | **Cloud Core y Redes (AWS + Azure)** | IAM, Security Groups, NSG, VNet, 2 EC2, 2 Azure VM, Classic ELB, Azure Load Balancer, pruebas de alta disponibilidad | IAM 2 + ELB 3 + Azure LB 8 = **13** (+ aprovisionamiento de los 20 de cómputo) |
| R2 | Valery Alarcón | 202300794 | **Datos y Almacenamiento (AWS + Azure)** | RDS, esquema y semilla, buckets S3 (web y archivos), Storage Account, `$web` y contenedor de archivos | RDS 3 + S3 3 + Blob 6 = **12** |
| R3 | Isaac Loarca | 202307546 | **Backend Node.js + Serverless AWS** | API Express en EC2 #1 y Azure VM #1, 2 funciones Lambda, API Gateway | Lambda/API GW 3 + mitad de EC2 (3) y VM (7) = **13** |
| R4 | Raúl Yat | 202300722 | **Backend Python + Serverless Azure** | API Flask en EC2 #2 y Azure VM #2, 2 Azure Functions, API Management | Functions/APIM 12 + mitad de EC2 (3) y VM (7) = **22** |
| R5 | Fátima Cerezo | 202300434 | **Frontend Web multi-nube** | SPA React, dos despliegues (S3 y Blob), consumo de los 2 balanceadores y las 2 puertas de API | Registro/login 6 + tareas 10 + archivos 10 = **26** |
| — | Todos | — | Documentación y preguntas | Manual técnico, capturas, conclusión AWS vs Azure | 5 + 9 = **14** |

> 13 + 12 + 13 + 22 + 26 + 14 = **100**. Ninguna casilla de la rúbrica queda sin dueño y ninguna
> tiene dos.

**Compensación de carga:** R4 es el vertical más cargado (Azure Functions + APIM valen 12 pts y
APIM es el servicio más lento de aprovisionar). Se compensa así:

- R2 termina su vertical el 29/09 y entra como **apoyo de R4** desde el 30/09 con el SDK de Blob
  dentro de las Functions (es el dueño del contenedor, conoce sus llaves y permisos).
- R3 revisa con R4 la configuración de rutas y CORS de APIM el 02/10: es el mismo problema que
  él resolvió en API Gateway dos días antes.
- El backend de Python parte del código de la Práctica 1, ya funcional.

---

## 4. Detalle por integrante

### R1 — Cloud Core y Redes *(también coordinador de integración)*

**Responsable de que las dos cuentas estén ordenadas y de que el tráfico llegue a donde debe.**
Es quien entrega máquinas y credenciales al resto: **bloquea a todos**, así que sus puntos 1–4
tienen fecha tope 25/09 (AWS) y 28/09 (Azure).

Entregables AWS:

1. **Usuarios IAM, uno por servicio** (la rúbrica lo exige explícitamente, 2 pts):
   - `p2-iam-ec2-g8` → administración de instancias del grupo.
   - `p2-iam-s3-g8` → `PutObject`, `GetObject`, `ListBucket` **solo** sobre los dos buckets.
   - `p2-iam-rds-g8` → conexión y administración de la base de datos.
   - `p2-iam-elb-g8` → balanceador clásico.
   - `p2-iam-lambda-g8` → creación y publicación de funciones.
   - Los JSON de cada política se versionan en `Practica_2/infra/iam/`. Las credenciales se
     entregan por canal privado a R2, R3 y R4 y **nunca** se commitean.
2. **Security Groups** con el mínimo necesario:
   - `p2-clb-sg-g8` → 80/tcp desde `0.0.0.0/0`.
   - `p2-ec2-sg-g8` → puerto de la app (3000) **solo** desde `p2-clb-sg-g8`; 22/tcp solo desde
     las IP `/32` del equipo.
   - `p2-rds-sg-g8` → 3306/tcp desde `p2-ec2-sg-g8` **y desde las IP públicas estáticas de las
     dos Azure VM** (ver riesgo R-1).
3. **Dos instancias EC2** (Amazon Linux o Ubuntu, t3.micro, par de llaves, AZ distintas),
   entregadas listas a R3 y R4.
4. **Classic Load Balancer** `p2-clb-g8` — **confirmado con los auxiliares: Classic, no ALB**,
   como lo dibuja el enunciado: *listener* 80 → 3000, *health check* `HTTP:3000/health`, las dos
   EC2 registradas. Ojo: el Classic LB no usa *target groups* como el ALB de la Práctica 1; las
   instancias se registran directamente en el balanceador.

Entregables Azure:

5. **Base de Azure:** Resource Group `rg-p2-g8`, VNet `vnet-p2-g8` con subred `snet-backend`,
   NSG `nsg-p2-backend-g8` (22/tcp desde las IP del equipo, 3000/tcp desde el balanceador).
6. **Dos Azure VM** Linux B1s en la misma VNet y *availability set*, con **IP pública estática**
   cada una (la necesita el SG de RDS), entregadas a R3 y R4.
7. **Azure Load Balancer** `lb-p2-g8` **SKU Standard** (el Basic está retirado): *frontend IP*
   pública, *backend pool* con las dos VM, *health probe* HTTP `/health:3000` y regla de
   balanceo 80 → 3000. Recordar que el Standard LB es **deny por defecto**: sin regla explícita
   en el NSG no pasa tráfico.
8. **Prueba de alta disponibilidad, una por nube:** apagar la instancia de Node y comprobar que
   la aplicación sigue operando contra la de Python, y al revés. Con captura del *target
   group* / *backend pool* mostrando un miembro caído y la app funcionando. Es el criterio
   directo de los 3 pts de ELB y los 8 de Azure LB.
9. Secciones de IAM, redes, balanceadores y el **diagrama de arquitectura de cada nube** en el
   manual, más el inventario en `Practica_2/infra/README.md`.

Depende de: nadie. **Bloquea a: todos.**

---

### R2 — Datos y Almacenamiento

**Responsable de dónde vive la información: RDS para datos, S3 y Blob para binarios.**

Entregables:

1. **Instancia RDS MySQL** `p2-rds-g8`, **una sola para las dos nubes** — confirmado con los
   auxiliares: Azure también consume Amazon RDS, no se crea base de datos en Azure. Accesible
   únicamente desde `p2-ec2-sg-g8` y las dos IP públicas de Azure. Es el único recurso
   compartido entre proveedores, así que su disponibilidad afecta a las dos nubes: se coordina
   con R1 antes de cualquier reinicio o cambio de parámetros.
2. **Esquema relacional** versionado en `Practica_2/database/schema.sql` (sección 8) y script de
   datos de prueba en `seed.sql`: 2 usuarios con tareas y archivos de ejemplo, para que R5 tenga
   con qué pintar pantallas.
3. **Buckets S3** (*Block Public Access* desactivado en el de archivos, con *bucket policy* de
   `s3:GetObject` público):
   - `practica2semi1b2s2026paginawebg8` → hosting estático, entregado a R5.
   - `practica2semi1b2s2026archivosg8` → carpetas `imagenes/`, `documentos/` y
     `fotos_perfil/`.
4. **Azure Storage Account** `p2g8semi1b2s2026`:
   - **Static website habilitado** → contenedor `$web`, entregado a R5 con su *primary
     endpoint*.
   - Contenedor `practica2semi1b2s2026archivosg8` con **nivel de acceso público de
     blob**, mismas tres carpetas.
   - Llaves de acceso entregadas a R3 y R4 por canal privado.
5. **Diagrama entidad-relación** y secciones de RDS, S3 y Blob Storage del manual, incluyendo la
   comparación S3 vs Blob (bucket policy vs *access level*, endpoint de sitio estático, etc.).

**Regla dura:** en la base de datos se guarda **la URL del objeto**, nunca el binario ni la
imagen en base64.

Depende de: R1 (usuarios IAM y `p2-rds-sg-g8`). Bloquea a: R3, R4 y R5.
Desde el 30/09 pasa a apoyar a R4 con el SDK de Blob dentro de las Azure Functions.

---

### R3 — Backend Node.js + Serverless AWS

**Una API en Express desplegada en dos nubes, más la puerta de entrada serverless de AWS.**

Entregables:

1. Código en `Practica_2/backend-node/`, partiendo del backend de la Práctica 1. Implementa el
   **100 %** del contrato de la sección 6: auth, CRUD de tareas y metadatos de archivos.
2. Contraseñas con **bcrypt** (`bcryptjs`), `username` **único**, validación de confirmación de
   contraseña y de formato de correo.
3. Subida de la **foto de perfil** del registro con el **SDK de AWS** (`@aws-sdk/client-s3`) al
   bucket de archivos — el enunciado exige explícitamente que el backend use el SDK — y con
   `@azure/storage-blob` cuando corre en Azure. El proveedor se decide por variable de entorno
   `CLOUD_PROVIDER=aws|azure`; **el mismo código sirve para las cuatro máquinas.**
4. `GET /health` devolviendo `{"status":"ok","server":"node","cloud":"aws|azure"}`, para que en
   la prueba de alta disponibilidad se vea a qué máquina llegó la petición.
5. CORS habilitado para **los dos** orígenes estáticos (endpoint de sitio web de S3 y endpoint
   `*.web.core.windows.net`) desde el primer día.
6. **Despliegue en EC2 #1 y en Azure VM #1** con pm2 (`pm2 startup` + `pm2 save`) para sobrevivir
   a reinicios.
7. **Dos funciones Lambda** en Node, en `Practica_2/serverless/aws-lambda/`:
   `p2-lambda-imagenes-g8` y `p2-lambda-documentos-g8`, que validan el tipo de archivo, lo suben
   al bucket y devuelven la URL pública (sección 7).
8. **API Gateway** `p2-apigw-g8` con las rutas `POST /upload/imagen` y `POST /upload/documento`,
   integración con cada Lambda y **CORS resuelto en el gateway** (no solo en la función).
9. Secciones de "Instancia EC2 Node.js", "Azure VM Node.js" y "Lambda + API Gateway" del manual,
   con capturas.

Depende de: R1 (máquinas y credenciales), R2 (esquema y buckets).
**Debe sincronizar a diario con R4:** cualquier cambio al contrato se acuerda entre ambos antes
de implementarlo.

---

### R4 — Backend Python + Serverless Azure

**La misma API en otro lenguaje, en dos nubes, más la puerta de entrada serverless de Azure.**
El balanceador debe poder mandar cualquier petición a cualquiera de las dos máquinas sin que el
frontend note la diferencia.

Entregables:

1. Código en `Practica_2/backend-python/` con Flask (el de la Práctica 1), **mismos endpoints,
   mismos nombres de campos JSON y mismos códigos de estado** que R3.
2. `boto3` para S3, `azure-storage-blob` para Blob, `mysql-connector-python` para RDS, bcrypt
   para contraseñas. Misma variable `CLOUD_PROVIDER`.
3. `GET /health` → `{"status":"ok","server":"python","cloud":"aws|azure"}`, CORS idéntico.
4. **Despliegue en EC2 #2 y en Azure VM #2** con gunicorn + systemd.
5. **Dos Azure Functions** en Python (plan de **Consumo**, Linux), en
   `Practica_2/serverless/azure-functions/`: `cargar_imagen` y `cargar_documento`, disparadas por
   HTTP, que suben al contenedor de Blob y devuelven la URL (sección 7).
6. **API Management** `apim-p2-g8` en **nivel Consumo** (el Developer tarda ~40 min y consume
   crédito), con las rutas `POST /upload/imagen` y `POST /upload/documento` apuntando a las
   Functions, política de CORS y clave de suscripción **desactivada** para poder llamarlas desde
   la web estática. **Se crea el 28/09**, antes de tener las funciones listas, por el tiempo de
   aprovisionamiento.
7. Secciones de "Instancia EC2 Python", "Azure VM Python" y "Azure Functions + API Management"
   del manual, con capturas.

Depende de: R1 y R2. Apoyo de R2 desde el 30/09 y revisión cruzada de APIM con R3 el 02/10.

---

### R5 — Frontend Web multi-nube

**Un solo SPA en React + Vite, dos despliegues.** Es el vertical que concentra los 26 pts de
funcionamiento, así que arranca el 24/09 contra datos simulados y no espera a nadie.

Entregables:

1. Código en `Practica_2/frontend/`, reutilizando el proyecto de la Práctica 1 (rutas, layouts,
   componentes atómicos, *toasts*, tema). Toda URL sale de variables de entorno:
   - `VITE_API_URL` → DNS del balanceador (**nunca** la IP de una instancia).
   - `VITE_UPLOAD_URL` → URL base de API Gateway o de APIM.
   - `VITE_CLOUD` → `aws | azure`, únicamente para mostrar un distintivo visible de en qué nube
     se está corriendo. Facilita la calificación y la demostración.
   Se compila **dos veces**, con `.env.aws` y `.env.azure`.
2. Pantallas:
   - **Registro:** nombre de usuario (único), correo, contraseña + confirmación e **imagen de
     perfil**. Validación de coincidencia de contraseñas antes de enviar.
   - **Inicio de sesión:** nombre de usuario y contraseña.
   - **Tareas:** listado, crear (título, descripción, fecha), editar (título y descripción),
     **marcar como completada** con estado visualmente distinguible, y eliminar con confirmación
     en la propia UI (sin `window.confirm`). Son 10 pts: el CRUD debe estar completo.
   - **Archivos:** subir imágenes y archivos de texto **contra la puerta de API serverless**,
     listado mostrando al menos nombre y tipo, y **visualización del contenido** (vista previa
     para imágenes, render del texto para `.txt`/`.md`). Otros 10 pts.
   - Límite de tamaño de 4 MB en el selector de archivos, con mensaje claro (ver riesgo R-4).
3. **Dos despliegues:** `dist/` de la variante AWS al bucket `...paginawebg8` con *Static
   website hosting*, y `dist/` de la variante Azure al contenedor `$web`. Verificar ambos
   endpoints públicos en ventana privada.
4. Capturas de la aplicación funcionando **en los dos endpoints** para el manual.

Depende de: los contratos de las secciones 6 y 7 (cerrados el 24/09), no de que los backends
estén listos. Trabaja contra *mocks* hasta el 30/09 (ya existe `Practica_1/frontend/src/mocks/`).

---

## 5. Trabajo compartido (todos)

- **Manual técnico** en `Practica_2/README.md`: cada quien redacta su sección y adjunta sus
  capturas en `Practica_2/infra/evidencias/`. **R1 consolida** y verifica que estén los cinco
  bloques exigidos: datos de los estudiantes, arquitectura, usuarios IAM y sus políticas,
  capturas de **todos** los recursos de AWS y Azure, y la **conclusión sobre las diferencias
  percibidas entre Azure y AWS**.
- **Conclusión AWS vs Azure:** cada dueño de vertical aporta dos párrafos de su comparación
  (ELB vs Azure LB, S3 vs Blob, Lambda vs Functions, API Gateway vs APIM, EC2 vs VM). R1 los
  hilvana. Es parte de los 5 pts de documentación y alimenta las preguntas.
- **Preguntas de conocimiento (9 pts):** se califica que *todos* respondan. En la sesión del
  05/10 cada integrante explica su área al resto y responde preguntas cruzadas de las otras
  cuatro.
- **Colaboradores:** agregar al repositorio privado a los dos auxiliares el primer día (tarea de
  R1, en cuanto se confirmen sus usuarios de GitHub).
- **Ningún secreto en el repositorio:** llaves IAM, llaves de Storage Account, contraseña de
  RDS, cadenas de conexión, `.pem` ni claves de suscripción de APIM. Solo `.env.example`.
- **Nada local:** el enunciado no califica nada que no esté desplegado en la nube. El día de la
  calificación **no se modifica código ni configuración**.

---

## 6. Contrato de API de los backends

R3 y R4 implementan **exactamente** esto; R5 programa contra ello. Se cierra el **24/09** y
cualquier cambio posterior requiere aviso a los tres. Base: el DNS del balanceador de la nube
correspondiente.

| Método | Ruta | Cuerpo / parámetros | Respuesta |
|---|---|---|---|
| `GET` | `/health` | — | `200 {"status":"ok","server":"node\|python","cloud":"aws\|azure"}` |
| `POST` | `/auth/register` | `multipart`: `username`, `correo`, `password`, `confirmPassword`, `fotoPerfil` | `201 {usuario}` · `409` usuario duplicado · `400` contraseñas distintas |
| `POST` | `/auth/login` | `{username, password}` | `200 {usuario, token}` · `401` credenciales inválidas |
| `GET` | `/tasks` | header `Authorization: Bearer <token>` | `200 [{id,titulo,descripcion,completada,fechaCreacion}]`, más reciente primero |
| `POST` | `/tasks` | `{titulo, descripcion, fechaCreacion?}` | `201 {tarea}` · `400` título vacío |
| `PUT` | `/tasks/:id` | `{titulo, descripcion}` | `200 {tarea}` · `404` · `403` si no es del usuario |
| `PATCH` | `/tasks/:id/estado` | `{completada: boolean}` | `200 {tarea}` |
| `DELETE` | `/tasks/:id` | — | `204` |
| `GET` | `/files` | header `Authorization` | `200 [{id,nombre,tipo,url,proveedor,fechaCarga}]` |
| `POST` | `/files` | `{nombre, tipo, url, tamanoBytes, proveedor}` | `201 {archivo}` — registra los metadatos del archivo que ya subió el serverless |
| `GET` | `/files/:id` | — | `200 {archivo}` · `404` |

**Reglas duras del contrato:**

1. `tipo` solo admite `IMAGEN` o `TEXTO`; `proveedor` solo `AWS` o `AZURE`.
2. La **foto de perfil** del registro la sube **el backend con el SDK** (lo exige el enunciado).
   Los **archivos del usuario** los sube **el serverless**. No se mezclan los dos caminos.
3. Las respuestas de error siempre son `{"error":"mensaje legible"}`, mismo formato en ambos
   lenguajes.
4. Antes de conectar el frontend, R5 prueba **cada máquina por su IP directa** (cuatro
   pruebas) para detectar divergencias entre Node y Python antes de que las tape el balanceador.

---

## 7. Contrato de los servicios serverless

Dos rutas por nube, mismo cuerpo y misma respuesta, para que el frontend solo cambie la URL
base. Se cierra también el **24/09**.

| Nube | Base | Rutas |
|---|---|---|
| AWS | `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod` | `POST /upload/imagen` → `p2-lambda-imagenes-g8` · `POST /upload/documento` → `p2-lambda-documentos-g8` |
| Azure | `https://apim-p2-g8.azure-api.net/p2` | `POST /upload/imagen` → `cargar_imagen` · `POST /upload/documento` → `cargar_documento` |

**Petición** (JSON, no `multipart`: el manejo de binarios en API Gateway es frágil y base64 se
comporta igual en las dos nubes):

```json
{
  "usuarioId": 3,
  "nombreArchivo": "notas.txt",
  "tipoMime": "text/plain",
  "contenidoBase64": "SG9sYSBtdW5kbw=="
}
```

**Respuesta** `201`:

```json
{
  "url": "https://.../documentos/3/1696012345-notas.txt",
  "nombre": "notas.txt",
  "tipo": "TEXTO",
  "tamanoBytes": 11,
  "proveedor": "AWS"
}
```

**Reglas duras:**

1. **Las funciones no tocan la base de datos.** Suben el objeto y devuelven la URL; el registro
   en RDS lo hace el frontend con `POST /files` contra el balanceador. Es lo que dibuja el
   enunciado (Lambda → S3) y evita meter credenciales de RDS en el serverless o asociar la
   Lambda a la VPC.
2. `/upload/imagen` acepta solo `image/*` y `/upload/documento` solo `text/*` (o `application/
   pdf` si se decide ampliar). Cualquier otro tipo → `415`.
3. La función escribe en la carpeta `imagenes/<usuarioId>/` o `documentos/<usuarioId>/` con el
   nombre prefijado por *timestamp* para no sobrescribir.
4. El objeto queda **público de lectura**, para poder visualizarlo por URL desde la app.
5. `OPTIONS` de ambas rutas debe responder en **el gateway** (API Gateway y APIM), no en la
   función.

---

## 8. Modelo de datos

`Practica_2/database/schema.sql`, propiedad de R2. Una sola base MySQL en RDS para las dos nubes.

| Tabla | Campos |
|---|---|
| `usuarios` | `id` PK · `username` **UNIQUE** · `correo` · `password_hash` (bcrypt) · `foto_perfil_url` · `fecha_registro` |
| `tareas` | `id` PK · `usuario_id` FK → `usuarios` · `titulo` · `descripcion` · `completada` BOOL default `false` · `fecha_creacion` · `fecha_actualizacion` |
| `archivos` | `id` PK · `usuario_id` FK → `usuarios` · `nombre` · `tipo` ENUM(`IMAGEN`,`TEXTO`) · `url` · `proveedor` ENUM(`AWS`,`AZURE`) · `tamano_bytes` · `fecha_carga` |

Notas de diseño:

- `archivos.proveedor` existe porque la misma base atiende las dos nubes: un archivo subido por
  la Lambda vive en S3 y uno subido por la Function vive en Blob. Sin esa columna no se puede
  explicar de dónde sale cada URL, y es justo el tipo de detalle que preguntan en la
  calificación.
- `ON DELETE CASCADE` en las dos FK, para que borrar un usuario no deje huérfanos.
- Se guarda **URL completa**, no ruta relativa: en la Práctica 1 se guardaba la ruta porque solo
  había un bucket; aquí los objetos pueden estar en dos proveedores distintos.

---

## 9. Nombres de recursos

**AWS** (región `us-east-1`, cuenta de la Práctica 1):

| Recurso | Nombre |
|---|---|
| Usuarios IAM | `p2-iam-ec2-g8`, `p2-iam-s3-g8`, `p2-iam-rds-g8`, `p2-iam-elb-g8`, `p2-iam-lambda-g8` |
| Security Groups | `p2-clb-sg-g8`, `p2-ec2-sg-g8`, `p2-rds-sg-g8` |
| EC2 | `p2-ec2-node-g8`, `p2-ec2-python-g8` |
| Classic LB | `p2-clb-g8` |
| RDS | `p2-rds-g8` |
| Buckets | `practica2semi1b2s2026paginawebg8`, `practica2semi1b2s2026archivosg8` |
| Lambda | `p2-lambda-imagenes-g8`, `p2-lambda-documentos-g8` |
| API Gateway | `p2-apigw-g8` |

**Azure** (región `East US 2`):

| Recurso | Nombre |
|---|---|
| Resource Group | `rg-p2-g8` |
| VNet / subred / NSG | `vnet-p2-g8` / `snet-backend` / `nsg-p2-backend-g8` |
| VM | `vm-p2-node-g8`, `vm-p2-python-g8` |
| Load Balancer | `lb-p2-g8` (SKU **Standard**) |
| Storage Account | `p2g8semi1b2s2026` |
| Contenedores | `$web` (sitio estático) y `practica2semi1b2s2026archivosg8` |
| Function App | `func-p2-g8` (plan de Consumo, Linux, Python) |
| API Management | `apim-p2-g8` (nivel Consumo) |

**Nombres de bucket y contenedor — confirmado con los auxiliares:** el enunciado los escribe
como `practica2Semi1<<Sección>>1s2026paginawebg#`, con mayúsculas y con "1s2026"; se crean **todo
en minúsculas y con `2s2026`**, que además es lo único que admiten S3 y los contenedores de
Azure. Quedan entonces, de forma definitiva:

- `practica2semi1b2s2026paginawebg8` — web estática.
- `practica2semi1b2s2026archivosg8` — archivos de los usuarios.

Se deja constancia de la confirmación en el manual para que no se interprete como "nombre
distinto al pedido". El nombre del Storage Account va abreviado (`p2g8semi1b2s2026`) porque Azure
lo limita a 24 caracteres alfanuméricos en minúscula; el **contenedor** que vive dentro sí lleva
el nombre completo exigido.

---

## 10. Cronograma

15 días de calendario, 2 fines de semana. Los hitos de infraestructura van al inicio porque
todo lo demás depende de ellos.

| Fecha | Hito | Responsable |
|---|---|---|
| mié 23/09 | Estructura de `Practica_2/` creada, auxiliares agregados como colaboradores, suscripciones de Azure verificadas (Azure for Students), **decisiones del enunciado confirmadas** (sección 14.1), este plan revisado por los 5 | R1 + todos |
| jue 24/09 | **Contratos de API y de serverless cerrados** (secciones 6 y 7) · esquema de BD acordado · frontend arranca contra *mocks* | Todos |
| vie 25/09 | **AWS base entregada:** 5 usuarios IAM + políticas, 3 Security Groups, 2 EC2 encendidas con llave entregada · RDS creada | R1, R2 |
| sáb 26/09 | Esquema + semilla cargados en RDS · buckets S3 creados con política pública | R2 |
| dom 27/09 | Auth + CRUD de tareas funcionando en local contra RDS, en los dos lenguajes · pantallas de tareas del frontend contra *mocks* | R3, R4, R5 |
| lun 28/09 | **Azure base entregada:** RG, VNet, NSG, 2 VM con IP pública estática · **APIM creado en nivel Consumo** (tarda) · Storage Account con `$web` y contenedor de archivos | R1, R2, R4 |
| mar 29/09 | Ambos backends desplegados en **EC2 #1 y #2**, probados por IP directa · `p2-rds-sg-g8` abierto a las IP de Azure | R3, R4, R1 |
| mié 30/09 | **Classic ELB en línea** repartiendo entre las 2 EC2 · 2 Lambda publicadas · ambos backends desplegados en **las 2 Azure VM** | R1, R3, R4 |
| jue 01/10 | **Azure Load Balancer en línea** con *health probe* · **API Gateway** con las 2 rutas y CORS · frontend variante AWS desplegado en S3 consumiendo el ELB | R1, R3, R5 |
| vie 02/10 | **2 Azure Functions publicadas** · **APIM con las 2 rutas y CORS** (revisión cruzada R3) · frontend variante Azure desplegado en `$web` | R4, R5 |
| sáb 03/10 | **Pruebas de extremo a extremo en las dos nubes:** registro, login, CRUD completo de tareas, subida y visualización de imagen y de texto. Checklist de la sección 11 | Todos |
| dom 04/10 | **Pruebas de alta disponibilidad** (apagar una instancia en cada nube) · ronda de capturas de todos los recursos | R1 + todos |
| lun 05/10 | Manual técnico consolidado, conclusión AWS vs Azure, inventario de infraestructura · **repaso cruzado de preguntas** · **congelamiento de código a las 23:00** | Todos |
| mar 06/10 | **Entrega** · a partir de aquí no se toca nada salvo fallo crítico | — |
| sáb 10/10 | Calificación · las 4 máquinas y la BD encendidas desde temprano | Todos |

**Puntos de control diarios:** 15 minutos a las 21:00 en el canal del grupo; cada quien dice qué
cerró, qué le bloquea y a quién bloquea. Quien esté bloqueado más de 24 h lo escala a R1.

---

## 11. Definición de terminado y capturas exigidas

Un vertical está terminado cuando **funciona en la nube, está documentado y tiene capturas**. El
entregable pide capturas de *todos* los recursos; esta es la lista de verificación.

| Área | Capturas mínimas | Dueño |
|---|---|---|
| IAM | Lista de los 5 usuarios · política JSON de cada uno · el JSON versionado en el repo | R1 |
| Security Groups / NSG | Reglas de entrada de los 3 SG · reglas del NSG | R1 |
| EC2 | Las 2 instancias corriendo (tipo, AZ, IP) · `pm2 list` / `systemctl status` en cada una | R1, R3, R4 |
| Classic ELB | Instancias registradas `InService` · health check · **una instancia apagada y la app respondiendo** | R1 |
| RDS | Instancia disponible (motor, clase, no público) · conexión desde una EC2 · tablas creadas | R2 |
| S3 | Los 2 buckets · *Static website hosting* activo con su endpoint · *bucket policy* pública · objetos subidos por la Lambda | R2, R5 |
| Lambda + API Gateway | Las 2 funciones · una prueba con respuesta `201` · rutas del gateway · CORS · llamada desde la web | R3 |
| Azure VM | Las 2 máquinas corriendo · servicio activo en cada una · IP pública estática | R1, R3, R4 |
| Azure Load Balancer | *Backend pool* con las 2 VM · *health probe* · regla de balanceo · **una VM apagada y la app respondiendo** | R1 |
| Azure Blob | Storage Account · sitio estático habilitado con su endpoint · contenedor de archivos con acceso público · objetos subidos por la Function | R2, R5 |
| Azure Functions + APIM | Las 2 funciones publicadas · prueba desde el portal · operaciones de APIM · política de CORS · llamada desde la web | R4 |
| Aplicación web | Registro, login, tareas (crear/editar/completar/eliminar), archivos (subir/listar/visualizar) **en los dos endpoints** | R5 |

---

## 12. Riesgos identificados

| ID | Riesgo | Mitigación | Dueño |
|---|---|---|---|
| R-1 | **Las Azure VM no pueden alcanzar RDS.** Confirmado que la única base es Amazon RDS, así que las 4 máquinas dependen de ella y el SG solo admite orígenes de la VPC. **Es el riesgo más probable de toda la práctica** | Hacer RDS accesible públicamente pero con reglas `/32` para las **IP públicas estáticas** de las 2 VM (por eso son estáticas, no dinámicas). Probar con `mysql -h` desde cada VM el 29/09, antes de desplegar. Sin plan B: si RDS cae, caen las dos nubes | R1, R2 |
| R-2 | **APIM tarde o caro.** El nivel Developer tarda ~40 min en aprovisionar y consume crédito de estudiante | Nivel **Consumo**, creado el 28/09, antes de tener las funciones | R4 |
| R-3 | **Azure Load Balancer Standard no pasa tráfico.** Es *deny* por defecto y exige IP pública Standard; el Basic ya está retirado | Crear la regla de entrada explícita en el NSG y verificar el *health probe* antes de conectar el frontend | R1 |
| R-4 | **Límite de tamaño del serverless.** API Gateway corta a 10 MB y base64 infla ~33 % | Límite de 4 MB en el selector de archivos del frontend, con mensaje explícito | R5, R3 |
| R-5 | **CORS entre la web estática y los gateways.** Un `OPTIONS` sin respuesta rompe la subida | Configurar CORS en API Gateway y en APIM el mismo día que se crean las rutas, y probar desde el endpoint público, no desde `localhost` | R3, R4 |
| R-6 | **Contenido mixto.** Las webs estáticas de S3 y Blob se sirven por HTTP; si se llama a un gateway HTTPS desde HTTP no hay problema, pero al revés sí | Mantener los balanceadores en HTTP y los gateways en HTTPS (ambos funcionan desde una página HTTP). Si se decide poner HTTPS a la página, hay que poner HTTPS también al balanceador | R5 |
| R-7 | **Las dos APIs divergen** y el balanceador expone comportamientos distintos según a qué máquina caiga | Contrato de la sección 6 + prueba de las 4 máquinas por IP directa antes de conectar los balanceadores + `cloud`/`server` en `/health` | R3, R4 |
| R-8 | **Se agota el crédito de Azure for Students ($100).** 2 VM encendidas 24/7 lo consumen | VM B1s, `az vm deallocate` fuera de horas de trabajo, APIM en Consumo, Functions en Consumo. A partir del 05/10 todo queda encendido | R1 |
| R-9 | **RDS detenida se reinicia sola a los 7 días** y una EC2 apagada cambia de IP pública | Usar el DNS del balanceador siempre, nunca IP; revisar el inventario cada mañana | R1 |
| R-10 | **Un integrante no domina su área** y se pierden puntos en las preguntas (9 pts) | Sesión de repaso cruzado del 05/10: cada quien explica su vertical y responde preguntas de las otras cuatro | Todos |
| R-11 | **Sobrecarga de R4** (Azure Functions + APIM + backend en 2 nubes) | R2 entra como apoyo el 30/09; R3 revisa APIM el 02/10; el backend de Python parte del código de la Práctica 1 | R1 |
| R-12 | **Se rompe algo el día de la calificación** y está prohibido modificar configuración | Congelamiento el 05/10 a las 23:00 · checklist de humo de 10 minutos la mañana del 10/10 · capturas ya tomadas como respaldo de la evidencia | Todos |

---

## 13. Estructura del entregable

```
Practica_2/
├── README.md                     ← manual técnico (consolida R1)
├── backend-node/                 ← R3
├── backend-python/               ← R4
├── frontend/                     ← R5 (.env.aws y .env.azure)
├── serverless/
│   ├── aws-lambda/
│   │   ├── cargar-imagen/        ← R3
│   │   └── cargar-documento/     ← R3
│   └── azure-functions/
│       ├── cargar_imagen/        ← R4
│       └── cargar_documento/     ← R4
├── database/
│   ├── schema.sql                ← R2
│   └── seed.sql                  ← R2
├── infra/
│   ├── README.md                 ← inventario de recursos de AWS y Azure
│   ├── iam/                      ← los JSON de las 5 políticas
│   └── evidencias/               ← capturas por área
└── docs/
    ├── management/               ← este plan
    ├── statement/                ← enunciado
    ├── guides/                   ← runbooks por rol
    └── assets/                   ← diagramas
```

**Convenciones** (las mismas de la Práctica 1):

- **Ramas:** `feature/<carné>/<tema>` (p. ej. `feature/202307546/lambda-imagenes`), *pull
  request* a `main` con revisión de al menos un compañero.
- **Commits:** `tipo(carné): descripción`.
- **Sufijo `-g8`** en todo recurso de AWS y Azure, para no confundirlos con los de otros grupos.

---

## 14. Decisiones confirmadas y puntos abiertos

### 14.1 Confirmado con los auxiliares (23/09)

| Duda del enunciado | Resolución | Efecto en el plan |
|---|---|---|
| Nombres de bucket y contenedor: el enunciado los escribe con mayúsculas y con "1s2026" | **Todo en minúsculas y con `2s2026`**: `practica2semi1b2s2026paginawebg8` y `practica2semi1b2s2026archivosg8` | Ninguno. Era lo ya previsto en la sección 9; se documenta la confirmación en el manual |
| ¿La aplicación en Azure lleva su propia base de datos? | **No. Amazon RDS se usa en las dos nubes**, como lo dibuja el enunciado | Se descarta el plan B de Azure Database for MySQL. El cronograma no se mueve, pero RDS queda como **único punto compartido** entre proveedores: ver riesgo R-1, que pasa a ser el crítico |
| ¿Classic Load Balancer o Application Load Balancer? | **Classic Load Balancer** | R1 no reutiliza la configuración de ALB de la Práctica 1: el Classic registra instancias directamente, sin *target groups*, y el *health check* se define en el propio balanceador |

Las tres decisiones quedan reflejadas en las secciones 4 (entregables de R1 y R2), 9 (nombres) y
12 (riesgo R-1). **No hay ninguna dependencia bloqueada por falta de respuesta.**

### 14.2 Pendientes menores

1. **Usuarios de GitHub de los dos auxiliares**, para agregarlos como colaboradores del
   repositorio privado. Tarea de R1 en cuanto los tenga; no bloquea trabajo técnico, pero es
   requisito para optar a la calificación.
2. **Nombre del repositorio.** El entregable pide `SEMINARIO1_A_2S2026_G#` y el grupo es de la
   **sección B**; se continúa en el repositorio actual (`SEMINARIO1_A_2S2026_G8`) salvo
   indicación contraria.
3. **Erratas del enunciado que no afectan al trabajo**, se dejan anotadas por si se preguntan en
   la calificación: el objetivo SMART menciona "CloudCinema" y la lista de servicios de Azure no
   incluye base de datos, coherente con la decisión de usar RDS en ambas nubes.
