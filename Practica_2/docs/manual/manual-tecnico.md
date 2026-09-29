# Manual técnico — Práctica 2 "TaskFlow + CloudDrive"

**Curso:** Seminario de Sistemas 1 · Sección B · **Grupo 8**

| Integrante | Carné | Rol |
|---|---|---|
| Daniel Hernández | 202300512 | R1 — Cloud Core y Redes (AWS + Azure) |
| Valery Alarcón | 202300794 | R2 — Datos y Almacenamiento |
| Isaac Loarca | 202307546 | R3 — Backend Node.js + Serverless AWS |
| Raúl Yat | 202300722 | R4 — Backend Python + Serverless Azure |
| Fátima Cerezo | 202300434 | R5 — Frontend Web multi-nube |

---

## 1. Arquitectura


![Arquitectura](img/architecture.svg)

La única pieza compartida entre nubes es **Amazon RDS**. Las Azure VM llegan a ella por
Internet, y `p2-rds-sg-g8` solo admite sus dos IP públicas **estáticas** (`/32`).

### 1.3 Decisiones de infraestructura que se apartan del plan original

| Plan | Implementado | Motivo |
|---|---|---|
| Azure en `East US 2` | **`canadacentral`** | La suscripción Azure for Students tiene la política *Allowed resource deployment regions*, que solo permite `francecentral`, `westus`, `mexicocentral`, `canadacentral` y `belgiumcentral`. Canada Central es la más cercana a `us-east-1`, donde está RDS |
| Azure VM `B1s` | **`Standard_B2pts_v2`** (ARM64, 2 vCPU, 1 GiB) | `B1s` no está disponible para la suscripción en ninguna región permitida. `B2pts_v2` también entra en las 750 h/mes gratuitas. Node 20 y Python 3.12 funcionan igual en ARM64 |
| EC2 `t3.micro` | `t3.micro` | La cuenta está en el plan Free de AWS (posterior a julio de 2025), donde `t3.micro` es el tipo elegible y `t2.micro` ya no |
| NSG: 3000/tcp "desde el balanceador" | 3000/tcp desde `AzureLoadBalancer` **y** desde `Internet` | El Azure LB Standard **no hace NAT de origen**: el paquete llega a la VM con la IP del cliente, así que la etiqueta `AzureLoadBalancer` solo cubre los sondeos. En AWS sí se puede restringir a "solo desde el SG del balanceador" porque el CLB es un proxy |

---

## 2. Usuarios IAM y políticas (AWS)

La rúbrica pide un usuario por servicio. Cada uno tiene una política administrada por el
cliente, versionada en [`Practica_2/infra/iam/`](../../infra/iam/), con permisos limitados a los
recursos del grupo por nombre o por etiqueta (`Proyecto=practica2-g8`).

| Usuario | Política | Qué permite |
|---|---|---|
| `p2-iam-ec2-g8` | `p2-policy-ec2-g8` | Ver el inventario de EC2 y red; encender, apagar y reiniciar **solo** instancias etiquetadas `Proyecto=practica2-g8` |
| `p2-iam-s3-g8` | `p2-policy-s3-g8` | `s3:ListBucket`, `s3:PutObject` y `s3:GetObject` **solo** sobre `practica2semi1b2s2026paginawebg8` y `practica2semi1b2s2026archivosg8`. La usan los backends para subir la foto de perfil con el SDK |
| `p2-iam-rds-g8` | `p2-policy-rds-g8` | Crear, modificar, arrancar, detener y hacer snapshot **solo** de `p2-rds-g8`, más la lectura de red que exige el asistente de RDS |
| `p2-iam-elb-g8` | `p2-policy-elb-g8` | Configurar listeners, health check y registro de instancias **solo** en `p2-clb-g8` |
| `p2-iam-lambda-g8` | `p2-policy-lambda-g8` | Crear y publicar funciones `p2-lambda-*-g8`, asignarles **solo** el rol `p2-lambda-role-g8` (`iam:PassRole` condicionado) y configurar API Gateway |

Además:

- **`p2-lambda-role-g8`**: rol de ejecución de las Lambda. Solo puede `s3:PutObject` en el
  bucket de archivos y escribir sus logs. La confianza exige `aws:SourceAccount` para evitar el
  problema del *confused deputy*.
- **`p2-iam-admin-g8`**: usuario de respaldo con `AdministratorAccess`, para que cualquier
  integrante pueda desbloquearse si alguno de los usuarios anteriores queda corto de permisos.
  No forma parte del diseño de mínimo privilegio y se elimina después de la calificación.

Ninguna credencial está en el repositorio.

---

## 3. Redes

### 3.1 Security Groups (AWS)

| SG | Entrada | Justificación |
|---|---|---|
| `p2-clb-sg-g8` | 80/tcp desde `0.0.0.0/0` | Es la única puerta pública del backend |
| `p2-ec2-sg-g8` | 3000/tcp desde `p2-clb-sg-g8` · 22/tcp desde IP `/32` del equipo | La app no es alcanzable por la IP de la instancia, solo a través del CLB |
| `p2-rds-sg-g8` | 3306/tcp desde `p2-ec2-sg-g8`, `20.63.60.70/32`, `20.220.9.6/32` y la IP de administración | Referencia al SG para las EC2; IP estáticas para las Azure VM (riesgo R-1) |

### 3.2 VNet y NSG (Azure)

- **VNet** `vnet-p2-g8` `10.20.0.0/16`, subred `snet-backend` `10.20.1.0/24`.
- **NSG** `nsg-p2-backend-g8`, asociado a la **subred** (no a cada NIC), así que cualquier VM
  nueva en la subred hereda las reglas:

| Prioridad | Nombre | Origen | Puerto |
|---|---|---|---|
| 100 | `Allow-SSH-Equipo` | IP `/32` del equipo | 22/tcp |
| 110 | `Allow-LB-Probe-3000` | etiqueta `AzureLoadBalancer` | 3000/tcp |
| 120 | `Allow-App-3000` | etiqueta `Internet` | 3000/tcp |

El Load Balancer Standard es *deny* por defecto: sin las reglas 110 y 120 el sondeo marca las VM
como caídas y no pasa tráfico (riesgo R-3).

---

## 4. Cómputo

| | AWS | Azure |
|---|---|---|
| Máquinas | `p2-ec2-node-g8`, `p2-ec2-python-g8` | `vm-p2-node-g8`, `vm-p2-python-g8` |
| Tamaño | `t3.micro` (x86_64) | `Standard_B2pts_v2` (ARM64) |
| Sistema | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Redundancia | Zonas distintas (`us-east-1a`, `us-east-1b`) | *Availability set* `avset-p2-g8` (2 dominios de error) |
| IP pública | Dinámica (se usa el DNS del CLB) | **Estática** Standard (la exige el SG de RDS) |
| Acceso | `ubuntu` + `p2-keypair-g8` | `azureuser` + la misma llave |

Las cuatro se aprovisionaron con el mismo script
([`infra/scripts/bootstrap-backend.sh`](../../infra/scripts/bootstrap-backend.sh)): Node 20,
pm2, Python 3.12, git y cliente MySQL. En EC2 se pasó como *user-data* y en Azure como
*custom-data*; ambas nubes lo ejecutan con cloud-init.

---

## 5. Balanceadores de carga

### 5.1 Classic Load Balancer — `p2-clb-g8`

- DNS: `p2-clb-g8-1996192241.us-east-1.elb.amazonaws.com`
- Listener HTTP 80 → HTTP 3000.
- Health check `HTTP:3000/health`, cada 15 s, 2 éxitos para sano y 2 fallos para caído.
- *Cross-zone load balancing* y *connection draining* (30 s) activos.
- Las instancias se registran **directamente** en el balanceador, sin *target groups*.

### 5.2 Azure Load Balancer — `lb-p2-g8`

- SKU **Standard**, frontend público `fe-p2-g8` = `20.63.100.60` (IP Standard estática).
- Backend pool `bepool-p2-g8` con las NIC de las dos VM.
- Health probe `probe-health-3000`: HTTP, puerto 3000, ruta `/health`, cada 15 s.
- Regla `rule-http-80-3000`: TCP 80 → 3000, con SNAT de salida desactivado porque cada VM
  tiene su propia IP pública.

### 5.3 Pruebas de alta disponibilidad

Se detiene la máquina de un lenguaje y se comprueba que el balanceador saca a ese miembro y la
aplicación sigue respondiendo con el otro. Luego se repite al revés.

*Prueba preliminar (24/09, con un `/health` temporal):* con python detenido, el CLB marcó
`i-0574a9f87a218e4be` como `OutOfService` y el 100 % de 20 peticiones en paralelo a cada
balanceador llegó a node, sin errores.

*Prueba final con la aplicación real:* ver capturas `aws-clb-05`, `aws-clb-06`, `az-lb-07` y
`az-lb-08`.

---

## 6. Capturas de pantalla

### 6.1 AWS — IAM

Usuarios:
![Usuarios IAM](img/aws-iam-01-usuarios.png)

Políticas:
![Política EC2](img/aws-iam-02-policy-ec2.png)
![Política S3](img/aws-iam-03-policy-s3.png)
![Política RDS](img/aws-iam-04-policy-rds.png)
![Política ELB](img/aws-iam-05-policy-elb.png)
![Política Lambda](img/aws-iam-06-policy-lambda.png)

Rol: 
![Rol de Lambda](img/aws-iam-07-rol-lambda.png)

Jsons:
![JSON en el repositorio](img/aws-iam-08-json-repo.png)

### 6.2 AWS — Security Groups, EC2 y Classic LB

Security Groups:
![SG del CLB](img/aws-sg-01-clb.png)
![SG de EC2](img/aws-sg-02-ec2.png)
![SG de RDS](img/aws-sg-03-rds.png)

Instancias EC2:
![Instancias EC2](img/aws-ec2-01-instancias.png)
![Detalle EC2 node](img/aws-ec2-02-node.png)
![Detalle EC2 python](img/aws-ec2-03-python.png)

Classic Load Balancer:
![CLB detalle](img/aws-clb-01-detalle.png)

### 6.3 Azure — Red, VM y Load Balancer

Recursos:

![Resource group](img/az-rg-01-recursos.png)
![VNet y subred](img/az-vnet-01-subred.png)
![Reglas del NSG](img/az-nsg-01-reglas.png)

Máquinas virtuales:

![Máquinas virtuales](img/az-vm-01-lista.png)

IP pública y privada de cada VM:
![IP estática](img/az-vm-04-ip-estatica.png)

![LB overview](img/az-lb-01-overview.png)

---

## 7. Diferencias percibidas entre AWS y Azure

**Classic Load Balancer vs Azure Load Balancer.** El Classic LB es un *proxy* de capa 7: termina
la conexión HTTP del cliente y abre otra hacia la instancia. Por eso el SG de las EC2 puede
decir "solo acepto el puerto 3000 desde el SG del balanceador", y cada instancia se registra
directamente en él, sin *target groups*. El Azure Load Balancer Standard trabaja en capa 4: reenvía
el paquete conservando la IP del cliente, así que el NSG no puede filtrar "solo desde el
balanceador" y hay que abrir el puerto a `Internet` y dejar la etiqueta `AzureLoadBalancer`
solo para el sondeo. Además, el Azure LB se arma por piezas separadas (frontend, pool, probe y
regla), mientras que el CLB concentra listener y health check en un solo recurso.

**Seguridad de red y organización.** En AWS los Security Groups se asocian a cada interfaz y
pueden referenciarse entre sí, lo que permite reglas por rol ("de las EC2 a RDS") sin conocer
IP. En Azure el NSG se asoció a la **subred**, así que cualquier VM nueva hereda las reglas,
pero los orígenes se expresan como IP, rangos o etiquetas de servicio. Azure obliga a agrupar
todo en un *Resource Group*, lo que facilita inventariar y borrar la práctica completa. En AWS
esa agrupación se consiguió con la etiqueta `Proyecto=practica2-g8`, que además se usa en las
políticas IAM para limitar permisos. Finalmente, la cuenta de estudiante de Azure impone
políticas de región y de tamaños de VM que AWS no impone; eso obligó a cambiar la región y el
tamaño previstos en el plan.
