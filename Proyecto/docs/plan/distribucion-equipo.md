# Distribución de trabajo — Proyecto "Semi-Social"

**Curso:** Seminario de Sistemas 1 · Sección B · **Grupo 8**
**Inicio:** 19/10/2026 · **Congelamiento:** 26/10/2026, 22:00 · **Calificación:** 27/10/2026
**Carpeta:** `Proyecto/` · **Enunciado:** [`797_Proyecto_1_2S2026.md`](../statement/markdown/797_Proyecto_1_2S2026.md)
**Cuenta AWS:** `237145860265`, región `us-east-1` (la misma de la Práctica 2)

---

## Índice

1. [Cómo está organizado el proyecto](#1-cómo-está-organizado-el-proyecto)
2. [Criterio del reparto](#2-criterio-del-reparto)
3. [Tabla de asignación](#3-tabla-de-asignación)
4. [Fases por costo](#4-fases-por-costo)
5. [Cronograma](#5-cronograma)
6. [Decisiones confirmadas](#6-decisiones-confirmadas)
7. [Cómo documentar](#7-cómo-documentar)
8. [Definición de terminado](#8-definición-de-terminado)
9. [Convenciones](#9-convenciones)
10. [Riesgos](#10-riesgos)

---

## 1. Cómo está organizado el proyecto

Usamos **arquitectura *screaming***: al abrir cualquier carpeta se ve **de qué trata la aplicación**
(identidad, publicaciones, chat…), no con qué está hecha (controllers, services…). Los mismos
nombres de dominio se repiten en todas las apps:

```
Proyecto/
├── README.md                ← manual técnico: índice que enlaza a cada dominio
├── dominios/                ← UNA carpeta de documentación por dominio
│   ├── plataforma/          ← IAM, security groups, EC2, ALB, hosting
│   ├── datos/               ← RDS y esquema
│   ├── identidad/           ← registro, verificación, login y login facial
│   ├── perfil/
│   ├── imagenes/            ← API Gateway + Lambda + S3
│   ├── publicaciones/       ← feed, Rekognition, filtros
│   ├── comentarios/
│   ├── traduccion/
│   ├── amistades/
│   ├── chat/
│   └── chatbot/             ← Lex
│       ├── README.md        ← plantilla de 9 secciones, la llena el responsable
│       └── img/             ← capturas del dominio
├── backend-node/src/<dominio>/     ← EC2 No.1
├── backend-python/src/<dominio>/   ← EC2 No.2
├── frontend/src/<dominio>/         ← React
├── serverless/<dominio>/           ← imagenes, identidad (triggers Cognito), chatbot
├── database/                ← schema.sql y seed.sql
├── infra/                   ← iam/ (JSON de políticas) y scripts/ (arranque de las EC2)
└── docs/                    ← enunciado y este plan
```

Lo que no es de un dominio vive aparte, y siempre con el mismo nombre en cada app:

| Carpeta | Contenido |
|---|---|
| `backend-*/src/config/` | Variables de entorno (solo Node; en Python va en `config.py`) |
| `backend-*/src/shared/` | Errores, middleware, validación del token de Cognito |
| `backend-*/src/infrastructure/database/` | Conexión a MySQL |
| `backend-*/src/infrastructure/aws/` | Clientes de Cognito, Rekognition, Translate, Lex y S3 compartidos |
| `frontend/src/app/` | Arranque, rutas y *providers* |
| `frontend/src/shared/ui/` | Componentes atómicos reutilizables (se trae el diseño de la Práctica 2) |
| `frontend/src/shared/api/` | Cliente HTTP hacia el ALB y manejo del token |

Dentro de cada carpeta de dominio en los backends se usa la convención de archivos de la Práctica 1:
`<dominio>.routes`, `.controller`, `.service`, `.repository` y `.schemas`. Las carpetas vacías tienen
`.gitkeep` (en Python, `__init__.py`) para que la estructura exista desde el primer commit.

## 2. Criterio del reparto

- **Se reparte por funcionalidad, no por tecnología.** El dueño de un dominio lo hace completo:
  contrato, Node.js, Python, frontend, configuración en AWS, capturas y su README. Así cada
  quien documenta una sola cosa y la puede explicar de punta a punta.
- **Cada app tiene un dueño de su base**, que la arma el primer día y revisa los PR de ese lenguaje:
  R3 la de Node.js, R4 la de Python y R5 la del frontend. Ellos fijan la estructura y los demás
  siguen el mismo patrón en su dominio.
- **Lo que cobra por hora va al final** (ver [§4](#4-fases-por-costo)). Mientras tanto, cada
  quien desarrolla en local contra MySQL en Docker y los servicios de AWS que se pagan por uso.

## 3. Tabla de asignación

| # | Integrante | Carné | Base que arma | Dominios | Pts de rúbrica que defiende |
|---|---|---|---|---|---|
| R1 | Daniel Hernández | 202300512 | Infraestructura y despliegue | [plataforma](../../dominios/plataforma/README.md), [imágenes](../../dominios/imagenes/README.md) | IAM 5 + SG 5 + ALB 5 + Hosting 5 + S3 5 + Lambda 4 + API Gateway 4 = **33** |
| R2 | Valery Alarcón | 202300794 | Esquema de base de datos | [datos](../../dominios/datos/README.md), [publicaciones](../../dominios/publicaciones/README.md) | RDS 5 + Rekognition etiquetas 3 + Publicación 3 + Filtro 3 = **14** |
| R3 | Isaac Loarca | 202307546 | `backend-node` | [identidad](../../dominios/identidad/README.md) | EC2 No.1 5 + Cognito 7 + Rekognition facial 3 + Registro/login 3 = **18** |
| R4 | Raúl Yat | 202300722 | `backend-python` | [amistades](../../dominios/amistades/README.md), [chat](../../dominios/chat/README.md), [chatbot](../../dominios/chatbot/README.md) | EC2 No.2 5 + Chat 3 + Lex 5 = **13** |
| R5 | Fátima Cerezo | 202300434 | `frontend` | [perfil](../../dominios/perfil/README.md), [comentarios](../../dominios/comentarios/README.md), [traducción](../../dominios/traduccion/README.md) | Comentarios 3 + Translate 4 = **7** |
| — | Todos | — | — | Manual técnico y ensayo | Documentación 5 + Preguntas 10 = **15** |

> 33 + 14 + 18 + 13 + 7 + 15 = **100**. Cada criterio de la rúbrica tiene un solo dueño.

**Compensación de carga:**

- R1 suma muchos puntos, pero son configuraciones que ya hizo en las dos prácticas, y la mayoría
  ocurre en la Fase 3. Además apoya a R3 con los triggers Lambda del login facial.
- R3 tiene la pieza técnica más difícil (login facial con `CUSTOM_AUTH`), por eso solo lleva un dominio.
- R5 defiende pocos puntos directos, pero arma el *shell* del frontend, del que depende que
  cualquier otra funcionalidad se vea en la calificación.
- R4 lleva tres dominios, pero amistades es CRUD simple y es la base para que R2 arme el feed y R4 el chat.

## 4. Fases por costo

| Fase | Fechas | Qué se levanta en AWS | Cómo cobra | Regla |
|---|---|---|---|---|
| **0** | lun 19 – mar 20 | Nada | $0 | Contratos, esquema y bases de las apps. MySQL en Docker para desarrollar |
| **1** | mar 20 – vie 23 | IAM, los 2 buckets S3, Cognito, API Gateway + Lambda, Rekognition, Translate, Lex | Solo por uso, centavos | Probar Rekognition con imágenes pequeñas y no dejar bucles llamando servicios |
| **2** | vie 23 | RDS `db.t4g.micro` | Por hora + almacenamiento | Detenerla cuando nadie la use (`aws rds stop-db-instance`); se puede detener hasta 7 días |
| **3** | sáb 24 – dom 25 | 2 EC2 `t3.micro` (sábado), ALB y hosting conectado (domingo) | Por hora; **el ALB no se puede pausar** | Apagar las EC2 cuando nadie pruebe. El ALB se crea el domingo y se borra el 28 |
| **4** | lun 26 | Nada nuevo | — | Capturas, ensayo de preguntas y congelamiento a las 22:00 |
| — | mar 27 | — | — | **Calificación** |
| — | mié 28 | Se da de baja todo | — | Mismo procedimiento que en la Práctica 2 |

> El enunciado prohíbe que el proyecto **se califique** con algo local. Desarrollar en local
> durante las fases 0 a 2 no lo contradice: el 27 todo corre en AWS.

## 5. Cronograma

| Día | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| **lun 19** | Estructura, plan y plantillas de docs ✅ | — | — | — | — |
| **mar 20** | Usuarios IAM por servicio, buckets S3, bucket policy | `schema.sql`, `seed.sql`, MySQL en Docker | Base de `backend-node` (config, shared, db, `/health`, middleware del token) | Base de `backend-python` con la misma estructura | Base del `frontend` (shell de la P2, rutas, `shared/ui`, cliente API) |
| | **Todos, en la mañana:** sección 3 (contrato) del README de su dominio. R1 revisa que sea coherente entre dominios | | | | |
| **mié 21** | API Gateway + Lambda de imágenes | Crear publicación + `DetectLabels` | User pool, registro, verificación por correo, login con contraseña | Amistades (usuarios, solicitudes, aceptar y rechazar) | Perfil (con sincronización a Cognito) |
| **jue 22** | Apoyo a R3 con los triggers Lambda · políticas IAM finales · script de arranque | Feed y filtros por etiquetas | Login facial (`CompareFaces` + `CUSTOM_AUTH`) | Chat (WebSocket + relevo por RDS) | Comentarios y traducción |
| **vie 23** | Diseño de los security groups | **Levanta RDS** y carga el esquema | Integración con RDS | Bot de Lex + Lambda de *fulfillment* | Integración de todas las pantallas |
| **sáb 24** | **Levanta las 2 EC2** y despliega ambos backends | Pruebas contra EC2 | Apoya el despliegue de Node | Apoya el despliegue de Python | Pruebas contra EC2 |
| **dom 25** | **Levanta el ALB**, conecta el hosting y hace la prueba de caída | Pruebas | Pruebas | Prueba del chat entre las dos EC2 | Sube el build a `proyecto-web-g8` |
| **lun 26** | Consolida el README principal | Capturas | Capturas | Capturas | Capturas |
| | **Todos:** ensayo de preguntas (cada quien explica su dominio a los demás) y congelamiento a las 22:00 | | | | |

## 6. Decisiones confirmadas

1. **Cognito se usa desde el backend, nunca desde el frontend.** Así ambos backends escriben en
   Cognito y RDS en la misma operación (registro y edición de perfil), y el login facial entra por
   el mismo camino que el normal.
2. **Chat:** cada mensaje se guarda en RDS y cada instancia reenvía a sus propios sockets los
   mensajes nuevos de sus usuarios conectados. Así funciona aunque emisor y receptor estén en EC2
   distintas y en lenguajes distintos.
3. **Contrato primero:** nadie programa un endpoint que no esté en la sección 3 del README de su
   dominio. Node.js y Python responden con las mismas rutas, códigos y JSON.
4. **Cuenta `237145860265`, región `us-east-1`.** Solo `t3.micro` es elegible en el plan Free.
5. **Nombres:** sufijo `-g8` y prefijo `proyecto-` en todos los recursos. Los buckets son
   `semi1proyecto-g8-2s2026` (imágenes; `semi1proyecto-g8` ya lo tiene otra cuenta de AWS) y
   `proyecto-web-g8` (sitio; S3 no admite mayúsculas, así que no puede llamarse `Proyecto-Web-G8`).
6. **Credenciales** en `Proyecto/secrets/` (ignorada por git). Se comparten solo por canal privado.
7. **Repositorio:** se mantiene el del semestre en curso, `8SEMINARIO1_A_2S2026_G8`. El
   `1S2026` del enunciado es un error de redacción, porque el curso es del segundo semestre de 2026.
8. **Colaboradores:** R1 agrega a `elder1095`, `CarlosJezeh777` y `marckomatic`.
9. **Idiomas de traducción:** inglés (`en`), francés (`fr`) y portugués (`pt`), además del español.

## 7. Cómo documentar

1. Cada responsable llena el `README.md` de **su** dominio en `dominios/<dominio>/`, que ya trae
   9 secciones: qué resuelve, servicios, contrato, datos, flujo, código, configuración en AWS,
   evidencias y preguntas.
2. Las capturas van en `dominios/<dominio>/img/` con el nombre exacto de la tabla de evidencias.
3. El [README principal](../../README.md) **no repite contenido**: solo enlaza a cada dominio.
   Si algo hace falta en el manual, se agrega en el dominio que corresponde.
4. Se documenta **mientras se configura**, no al final: la sección 7 se llena el mismo día que se
   crea el recurso.

## 8. Definición de terminado

Un dominio está terminado cuando:

- [ ] Su contrato está en la sección 3 y ambos backends lo cumplen (misma petición, misma respuesta).
- [ ] El frontend lo consume a través del ALB.
- [ ] La sección 7 permite reproducir la configuración de AWS.
- [ ] Las capturas de la sección 8 están en `img/` y enlazadas.
- [ ] El responsable explicó el dominio al resto del grupo en el ensayo del 26.

## 9. Convenciones

Son las mismas de las prácticas anteriores:

- **Ramas:** `feature/<carné>/<tema>`, con *pull request* a `develop` y revisión del dueño de la
  base de ese lenguaje (R3 Node, R4 Python, R5 frontend).
- **Commits:** `tipo(carné): descripción`.
- **Etiqueta** `Proyecto=proyecto-g8` en todos los recursos de AWS, para encontrarlos y darlos de baja.

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El login facial con `CUSTOM_AUTH` tarda más de lo previsto | Se pierden 3 pts de Rekognition | R1 apoya desde el jueves con los triggers. Primero se hace funcionar el login con contraseña (miércoles), para no arriesgar los 10 pts de 2.1 y 2.7 |
| WebSocket en Flask | El chat no funciona en la EC2 de Python | Usar `flask-sock` con gunicorn en modo *threads* y probarlo en local el miércoles |
| El chat se pierde al pasar entre las dos EC2 | Se pierden 3 pts | El relevo por RDS se prueba el domingo con dos navegadores en EC2 distintas |
| API Gateway y archivos binarios | Las imágenes llegan corruptas | Enviar en base64 o configurar *binary media types*; comprimir en el frontend para no pasar de 10 MB |
| Los dos backends responden distinto | El frontend falla según a qué EC2 caiga | Contrato primero y la misma colección de peticiones contra ambos |
| Se acaban los créditos | Servicios suspendidos antes del 27 | Fases por costo, apagar EC2 y RDS cuando nadie pruebe, ALB solo desde el domingo |
