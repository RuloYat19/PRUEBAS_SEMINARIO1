# Inventario de infraestructura — Grupo 8

Registro de los recursos de AWS aprovisionados para la práctica **Cloud Cinema**. Documenta qué
se creó, con qué configuración y con qué identificadores, de modo que cualquier integrante pueda
consultar un endpoint, una dirección o un ID sin entrar a la consola.

Este archivo contiene únicamente identificadores públicos. Las claves de acceso, la contraseña
de la base de datos y el archivo `.pem` del par de claves no se registran aquí ni en ninguna
otra parte del repositorio.

## Datos generales

| Elemento | Valor |
|---|---|
| Cuenta de AWS | `331725318481` |
| Región | `us-east-1` (Norte de Virginia) |
| VPC | Predeterminada — `vpc-021f0a86d2f78cd4a` |
| Zonas de disponibilidad utilizadas | `us-east-1a`, `us-east-1b` |
| URL de inicio de sesión para usuarios IAM | `https://331725318481.signin.aws.amazon.com/console` |

El identificador de cuenta no constituye un secreto: aparece en todos los ARN y en las capturas
del manual técnico.

---

## 1. Grupos de seguridad

Responsable: R1. Estado: **configurados**.

Los tres grupos residen en la VPC predeterminada, condición necesaria para que puedan
referenciarse entre sí como origen de tráfico.

| Nombre | ID | Puerto | Origen | Estado |
|---|---|---|---|---|
| `alb-sg-g8` | `sg-070d0cc4775f48411` | TCP 80 | `0.0.0.0/0` | Configurado |
| `ec2-sg-g8` | `sg-003ee2b683a0fd572` | TCP 3000 | `sg-070d0cc4775f48411` (`alb-sg-g8`) | Configurado |
| `ec2-sg-g8` | (el mismo) | TCP 22 | Direcciones `/32` del equipo | Configurado |
| `rds-sg-g8` | `sg-0c67b0cbd7676b27e` | TCP 5432 | `sg-003ee2b683a0fd572` (`ec2-sg-g8`) | Configurado |

En las reglas de `ec2-sg-g8` y `rds-sg-g8` el origen es otro grupo de seguridad y no un rango de
direcciones. Esto mantiene la regla válida ante la rotación de direcciones IP del balanceador e
impide el acceso directo a las instancias desde internet.

La VPC predeterminada incluye además el grupo `default` (`sg-05f0c9508234e2a9d`), que no se
utiliza en esta práctica. Ningún recurso del grupo 8 debe quedar asociado a él.

La instancia RDS debe asociarse al grupo existente `rds-sg-g8`; la consola de AWS ofrece crear
uno nuevo de forma predeterminada y esa opción no debe aceptarse.

---

## 2. Usuarios y políticas IAM

Responsable: R1. Estado: **configurados**.

| Usuario | Política | Tipo de acceso | Entregado a |
|---|---|---|---|
| `iam-s3-g8` | `policy-s3-g8` | Dos claves de acceso y acceso a consola | R3, R4 y R5 |
| `iam-ec2-g8` | `policy-ec2-g8` | Sin acceso a consola | — |
| `iam-rds-g8` | `policy-rds-g8` (v2) e `IAMUserChangePassword` | Acceso a consola con contraseña temporal | R2 |
| `iam-elb-g8` | `policy-elb-g8` | Sin acceso a consola | — |

Las definiciones en JSON de las cuatro políticas están versionadas en [`iam/`](iam/).

**Sobre las dos claves de `iam-s3-g8`.** Se generaron dos claves de acceso para el mismo usuario,
identificadas como `Backend Node - Isaac` y `Backend Python - Raul`. De este modo, si una de las
dos resulta comprometida puede revocarse de forma independiente sin interrumpir el servicio del
otro backend. IAM admite un máximo de dos claves por usuario.

**Sobre `IAMUserChangePassword`.** AWS adjunta esta política de forma automática cuando se exige
el cambio de contraseña en el primer inicio de sesión. Permite únicamente que el usuario cambie
su propia contraseña y no concede acceso a ningún servicio.

**Sobre la versión 2 de `policy-rds-g8`.** La versión inicial no incluía `rds:CreateDBInstance`,
por lo que el usuario podía administrar una base de datos pero no crearla. La versión 2 añade
las acciones de creación acotadas al identificador `practica1-db-g8`, junto con las lecturas de
red que exige el asistente de creación de RDS.

---

## 3. Instancias EC2

Aprovisionadas por R1 el 23/08/2026. El despliegue de las aplicaciones corresponde a R3 y R4.

| Nombre | ID | Zona | IP elástica | Puerto | Despliegue | Estado |
|---|---|---|---|---|---|---|
| `ec2-node-g8` | `i-070ae7b45d2cefee9` | `us-east-1a` | `32.193.208.20` | 3000 | R3 | Entregada |
| `ec2-python-g8` | `i-0750b6254c0dce3d4` | `us-east-1b` | `34.196.34.116` | 3000 | R4 | Entregada |

Configuración común:

| Parámetro | Valor |
|---|---|
| AMI | Amazon Linux 2023 |
| Tipo de instancia | `t3.micro` (capa gratuita) |
| Grupo de seguridad | `ec2-sg-g8` |
| Par de claves | `g8-key` |
| Usuario SSH | `ec2-user` |
| Etiqueta obligatoria | `Proyecto = practica1-g8` |

Las instancias se ubicaron en zonas de disponibilidad distintas de forma deliberada: una zona es
un centro de datos físicamente separado, de modo que alojar ambos servidores en la misma zona
habría producido una redundancia solo aparente. El Application Load Balancer exige además un
mínimo de dos zonas habilitadas.

La etiqueta `Proyecto = practica1-g8` no es opcional: `policy-ec2-g8` condiciona las acciones de
inicio, detención y reinicio a la presencia de esa etiqueta.

### 3.1 Software verificado

Comprobado por SSH el 23/08/2026.

| Componente | `ec2-node-g8` | `ec2-python-g8` |
|---|---|---|
| Node.js | 20.20.2 | — |
| npm | 10.8.2 | — |
| pm2 | 7.0.3 | — |
| Python (sistema) | 3.9.25 | 3.9.25 |
| Python (adicional) | — | 3.11.15 |
| pip | — | 22.3.1 |
| git | 2.50.1 | 2.50.1 |
| Puerto 3000 | Libre | Libre |

### 3.2 Notas de aprovisionamiento

Observaciones registradas durante la instalación, aplicables si alguna máquina debe rehacerse:

- En Amazon Linux 2023, el paquete de npm correspondiente a Node 20 es `nodejs20-npm`. Instalar
  el paquete `npm` sin sufijo arrastra Node 18 como dependencia y este toma `/usr/bin/node`, con
  lo que la máquina queda con una versión distinta a la solicitada.
- La instrucción `pip3 install --upgrade pip` no debe incluirse en los datos de usuario. El pip
  del sistema se instala mediante RPM y carece de archivo `RECORD`, por lo que no puede
  desinstalarse a sí mismo; la orden falla siempre y deja `cloud-init` en estado de error.
- El trabajo en Python se realiza sobre un entorno virtual creado con `python3.11 -m venv .venv`.
  Dentro del entorno virtual sí es posible actualizar pip.

---

## 4. Direcciones IP elásticas

Responsable: R1. Estado: **asociadas**.

| Etiqueta | Dirección | ID de asignación | Instancia asociada |
|---|---|---|---|
| `eip-node-g8` | `32.193.208.20` | `eipalloc-07a29a4eb3197b2cb` | `ec2-node-g8` |
| `eip-python-g8` | `34.196.34.116` | `eipalloc-04305510a40cbf805` | `ec2-python-g8` |

Se asignaron direcciones fijas porque la IP pública que AWS otorga por defecto cambia cada vez
que una instancia se detiene y se vuelve a iniciar, lo que habría invalidado el acceso SSH y las
pruebas por dirección directa cada vez que las máquinas se apagaran para reducir consumo.

Al concluir la práctica ambas direcciones deben liberarse. Una dirección IP elástica sin asociar
genera cargos; asociada a una instancia en ejecución, no.

---

## 5. Balanceador de carga

Responsable: R1. Estado: **pendiente**. Requiere que ambos backends respondan `GET /health` con
código 200 en el puerto 3000.

| Recurso | Nombre | Configuración prevista |
|---|---|---|
| Target group | `tg-cloudcinema-g8` | HTTP:3000, health check `GET /health`, intervalo 10 s, umbrales 2/2 |
| Load balancer | `alb-cloudcinema-g8` | Internet-facing, grupo `alb-sg-g8`, listener HTTP:80 |
| DNS público | | Pendiente |

El DNS del balanceador es el valor que debe recibir la variable `VITE_API_URL` del frontend. No
debe utilizarse la dirección IP de ninguna instancia EC2: si esa instancia se detiene, la
aplicación dejaría de funcionar y se perdería el objetivo de alta disponibilidad.

---

## 6. Base de datos RDS

Responsable: R2. Estado: **pendiente**.

| Campo | Valor |
|---|---|
| Identificador | `practica1-db-g8` |
| Motor y puerto | PostgreSQL / 5432 (pendiente de confirmación por R2) |
| Endpoint | Pendiente |
| Acceso público | No |
| Grupo de seguridad | `rds-sg-g8` |

---

## 7. Buckets S3

Responsable: R2. Estado: **pendiente**.

| Bucket | Uso | Endpoint público |
|---|---|---|
| `practica1-web-g8` | Hosting estático del frontend | `http://practica1-web-g8.s3-website-us-east-1.amazonaws.com` |
| `practica1-images-g8` | Carpetas `Fotos_Perfil/` y `Fotos_Peliculas/` | `https://practica1-images-g8.s3.amazonaws.com/` |

Los nombres de bucket de AWS no admiten mayúsculas. El enunciado los escribe como
`Practica1-Web-G8` y `Practica1-Images-G8`; se crean en minúsculas, que es el único formato
aceptado, y así queda constancia en el manual técnico.

---

## 8. Convenciones

- Todo recurso lleva el sufijo `-g8` y la etiqueta `Proyecto = practica1-g8`.
- Ambos backends escuchan en `0.0.0.0:3000` y exponen `GET /health`, que responde
  `200 {"status":"ok","server":"node|python"}`.
- Los nombres de grupo de seguridad no pueden comenzar con `sg-`, prefijo que AWS reserva para
  los identificadores. Por eso los grupos se denominan `alb-sg-g8`, `ec2-sg-g8` y `rds-sg-g8`.
- El campo de descripción de un grupo de seguridad no admite tildes ni la letra eñe.
- Las credenciales residen en archivos `.env` locales, excluidos por `.gitignore`. En el
  repositorio se incluye únicamente `.env.example`.

## 9. Consideraciones de costo

Las instancias EC2 y la instancia RDS se detienen fuera de las horas de trabajo. Detener una
instancia conserva el disco y, gracias a las direcciones IP elásticas, también la dirección
pública. Las direcciones IP elásticas se liberan al finalizar la práctica.
