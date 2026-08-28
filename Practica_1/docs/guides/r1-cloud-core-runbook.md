# Procedimiento de configuración — Cloud Core y Seguridad (R1)

Documento de procedimiento correspondiente al área de **Cloud Core / Seguridad** de la práctica
Cloud Cinema. Cubre la configuración de IAM, los grupos de seguridad, el aprovisionamiento de las
dos instancias EC2 y el Application Load Balancer, así como las comprobaciones que verifican cada
paso.

**Alcance de la responsabilidad:** gestión de identidad (IAM), grupos de seguridad y balanceador
de carga, además de la entrega de las dos instancias EC2 a los responsables de los backends.

## Decisiones adoptadas para toda la práctica

| Elemento | Valor | Fundamento |
|---|---|---|
| Región | `us-east-1` (Norte de Virginia) | Cobertura de capa gratuita y disponibilidad de todos los servicios requeridos. Los recursos de AWS son regionales: no se ven entre regiones, por lo que la región no debe cambiarse una vez iniciado el trabajo. |
| VPC | Predeterminada | Provee subredes públicas en varias zonas de disponibilidad, requisito del Application Load Balancer. No es necesario crear red nueva. |
| Puerto de las aplicaciones | 3000 en ambas instancias | Un único puerto permite un único target group y un único grupo de seguridad. |
| Motor de base de datos | PostgreSQL, puerto 5432 | Decisión del equipo. En caso de optarse por MySQL, el puerto de `rds-sg-g8` cambia a 3306. |
| Sufijo de nombres | `-g8` en todos los recursos | Convención del grupo. |
| Etiqueta obligatoria | `Proyecto = practica1-g8` | La política `policy-ec2-g8` condiciona las acciones de inicio y detención a la presencia de esta etiqueta. |

## Orden de ejecución

Las fases tienen dependencias reales entre sí y no deben adelantarse.

```
FASE 0  Preparación de la cuenta (seguridad y control de costos)
FASE 1  Grupos de seguridad        <- primero: la EC2 los solicita al crearse
FASE 2  Usuarios y politicas IAM
FASE 3  Par de claves y las dos instancias EC2  -> entrega a R3 y R4
        ...requiere que ambos backends respondan /health...
FASE 4  Target group y Application Load Balancer
FASE 5  Prueba de alta disponibilidad
FASE 6  Evidencias, control de costos y manual tecnico
```

---

## Fundamentos previos

### IAM y los grupos de seguridad son capas distintas

- **IAM** controla quién puede invocar la API de AWS. Determina, por ejemplo, si el usuario
  `iam-s3-g8` tiene permiso para ejecutar `PutObject` sobre el bucket de imágenes. Actúa sobre el
  plano de control.
- **Un grupo de seguridad** controla qué paquetes de red alcanzan un recurso. Determina, por
  ejemplo, si una instancia EC2 puede abrir una conexión TCP contra el puerto 5432 de la base de
  datos. Es un cortafuegos virtual.

Una petición puede superar la autorización de IAM y ser descartada por el grupo de seguridad, o a
la inversa. Las dos capas se complementan y ninguna sustituye a la otra.

### Los grupos de seguridad son stateful y solo admiten reglas de permiso

No existe la regla de denegación: todo lo que no está explícitamente permitido queda bloqueado.
Restringir el acceso consiste, por tanto, en no escribir la regla, no en escribir una regla de
bloqueo.

Al ser *stateful*, el tráfico de respuesta sale automáticamente cuando la entrada está permitida:
no hacen falta reglas de salida adicionales para que una aplicación conteste. Las Network ACL, en
cambio, sí son *stateless* y se aplican a toda la subred en lugar de a un recurso concreto.

### Un grupo de seguridad puede referenciar a otro como origen

En lugar de autorizar el puerto 3000 desde una dirección IP concreta, se autoriza desde cualquier
recurso que tenga asociado el grupo `alb-sg-g8`. Las ventajas son dos:

- La regla sobrevive a la rotación de direcciones IP del balanceador, que AWS realiza sin aviso.
- El puerto 3000 queda inalcanzable desde internet aunque se conozca la dirección IP de la
  instancia; únicamente el balanceador puede alcanzarlo.

La cadena de confianza resultante:

```
Internet ---80---> alb-sg-g8 ---3000---> ec2-sg-g8 ---5432---> rds-sg-g8
   (0.0.0.0/0)                (origen: alb-sg-g8)   (origen: ec2-sg-g8)

IPs del equipo ---22---> ec2-sg-g8     (SSH, solo direcciones conocidas)
```

Cada eslabón confía únicamente en el anterior. La base de datos no queda expuesta a internet en
ningún punto.

---

## FASE 0 — Preparación de la cuenta

### 0.1 Región de trabajo

El selector de región se sitúa en la esquina superior derecha de la consola y debe fijarse en
**Norte de Virginia (us-east-1)**.

Cuando un recurso parece haber desaparecido, la causa habitual es tener seleccionada otra región.
Los recursos de AWS residen dentro de una región concreta y no son visibles desde las demás.

### 0.2 Identificador de cuenta

El identificador de 12 dígitos aparece al desplegar el menú de usuario en la esquina superior
derecha. Es necesario para redactar los ARN de las políticas de la fase 2.

Cuenta utilizada en esta práctica: `331725318481`.

### 0.3 Protección de la cuenta raíz

La cuenta raíz corresponde al correo con el que se registró la cuenta de AWS. Dispone de control
total y no debe emplearse para el trabajo cotidiano.

1. IAM → **Panel**. Si la cuenta raíz carece de MFA, aparece la advertencia correspondiente.
2. **Añadir MFA** → *Aplicación de autenticación* → escanear el código QR con Google
   Authenticator o Authy → introducir dos códigos consecutivos.
3. El trabajo se realiza con el usuario administrador `Administrador_202300794`. Debe verificarse
   que tenga la política `AdministratorAccess` adjunta, el acceso a consola habilitado y su propio
   dispositivo MFA configurado. Un administrador sin MFA supone el mismo riesgo que una cuenta
   raíz sin MFA.
4. Se cierra la sesión de la cuenta raíz y se accede con el usuario administrador en
   `https://331725318481.signin.aws.amazon.com/console`.

La cuenta raíz no admite restricción de permisos ni rotación de credenciales, y su compromiso
implica la pérdida de la cuenta completa, incluida la facturación. Este es el motivo por el que la
operación se realiza con un usuario IAM independiente.

*Para crear un administrador desde cero: IAM → Usuarios de IAM → Crear usuario → marcar
«Proporcionar acceso de usuario a la consola» → elegir **«Quiero crear un usuario de IAM»**, no el
Centro de identidades → Adjuntar políticas directamente → `AdministratorAccess`.*

### 0.4 Control de presupuesto

El agotamiento de los créditos figura entre los riesgos identificados por el equipo.

1. **Billing and Cost Management** → **Presupuestos** → **Crear presupuesto**.
2. *Usar una plantilla* → **Presupuesto de costo mensual** → importe de 10 USD → dirección de
   correo → **Crear presupuesto**.

El sistema notifica por correo cuando el gasto se aproxima al límite. Adicionalmente, las
instancias EC2 y RDS se detienen fuera del horario de trabajo, según se describe en la fase 6.

### 0.5 Acceso del auxiliar al repositorio

Requisito de entrega establecido en el enunciado: el repositorio debe ser privado y contar con el
auxiliar de la sección como colaborador.

GitHub → repositorio `SEMINARIO1_B_2S2026_G8` → **Settings** → **Collaborators** →
**Add people** → `marckomatic`.

---

## FASE 1 — Grupos de seguridad

Se crean tres grupos en el orden indicado, dado que cada uno referencia al anterior.

Ruta en la consola: **EC2** → sección *Red y seguridad* → **Grupos de seguridad** →
**Crear grupo de seguridad**.

El campo de descripción de un grupo de seguridad no admite tildes ni la letra eñe, motivo por el
cual las descripciones se redactan sin acentos. Los nombres tampoco pueden comenzar con `sg-`,
prefijo que AWS reserva para los identificadores.

### 1.1 `alb-sg-g8` — punto de entrada público

| Campo | Valor |
|---|---|
| Nombre | `alb-sg-g8` |
| Descripción | `Permite trafico HTTP publico hacia el balanceador` |
| VPC | La predeterminada |

Regla de entrada:

| Tipo | Protocolo | Puerto | Origen | Descripción |
|---|---|---|---|---|
| HTTP | TCP | 80 | `Cualquier lugar-IPv4` (`0.0.0.0/0`) | `Trafico publico desde el navegador` |

Las reglas de salida se dejan con la configuración predeterminada (`Todo el tráfico` hacia
`0.0.0.0/0`), necesaria para que el balanceador alcance las instancias.

Etiqueta: `Proyecto` = `practica1-g8`.

Este es el único grupo de seguridad del proyecto con acceso desde internet.

### 1.2 `ec2-sg-g8` — servidores backend

| Campo | Valor |
|---|---|
| Nombre | `ec2-sg-g8` |
| Descripción | `Backends Node y Python: app solo desde el ALB, SSH solo desde el equipo` |
| VPC | La predeterminada |

Reglas de entrada:

| # | Tipo | Protocolo | Puerto | Origen | Descripción |
|---|---|---|---|---|---|
| 1 | TCP personalizado | TCP | 3000 | **Personalizado** → seleccionar `alb-sg-g8` del desplegable | `App solo desde el balanceador` |
| 2 | SSH | TCP | 22 | **Mi IP** | `Administracion remota` |

En la primera regla, el origen debe ser el identificador del grupo del balanceador y no una
dirección IP. Al escribir el nombre en el campo se despliega la lista de grupos existentes; al
seleccionarlo, la regla almacena el identificador. Dejar `0.0.0.0/0` en ese campo constituye el
error que la rúbrica penaliza de forma explícita.

La segunda regla fija la dirección IP desde la que se administra. Si otros integrantes necesitan
acceso SSH, se añade una regla adicional por cada dirección; el puerto 22 no debe abrirse a
internet. La dirección pública de cada equipo puede consultarse en `https://checkip.amazonaws.com`.

Etiqueta: `Proyecto` = `practica1-g8`.

### 1.3 `rds-sg-g8` — base de datos

| Campo | Valor |
|---|---|
| Nombre | `rds-sg-g8` |
| Descripción | `RDS privada: solo acepta conexiones desde las EC2 del grupo` |
| VPC | La predeterminada |

Regla de entrada:

| Tipo | Protocolo | Puerto | Origen | Descripción |
|---|---|---|---|---|
| PostgreSQL | TCP | 5432 | **Personalizado** → seleccionar `ec2-sg-g8` | `Solo los backends del grupo 8` |

En caso de utilizarse MySQL, el tipo es `MYSQL/Aurora` y el puerto 3306.

Etiqueta: `Proyecto` = `practica1-g8`.

La rúbrica penaliza que las instancias de EC2 o RDS presenten configuraciones abiertas. Una base
de datos con el puerto 5432 accesible desde `0.0.0.0/0` es el error más frecuente en esta
práctica. La configuración descrita no admite ninguna dirección pública, y la instancia RDS debe
crearse además con **Acceso público = No**.

### 1.4 Verificación y entrega

1. Se capturan la lista de los tres grupos y las reglas de entrada de cada uno, y se archivan en
   `Practica_1/infra/evidencias/`.
2. Se registran los identificadores (`sg-...`) en `Practica_1/infra/README.md`.
3. Se comunica a R2 el identificador de `rds-sg-g8` con la indicación de asociar ese grupo
   existente al crear la instancia RDS, en lugar de permitir que la consola genere uno nuevo.

Identificadores resultantes:

| Grupo | ID |
|---|---|
| `alb-sg-g8` | `sg-070d0cc4775f48411` |
| `ec2-sg-g8` | `sg-003ee2b683a0fd572` |
| `rds-sg-g8` | `sg-0c67b0cbd7676b27e` |

---

## FASE 2 — Usuarios y políticas IAM

La rúbrica exige usuarios y roles IAM específicos por servicio, con políticas que garanticen la
separación de responsabilidades: un usuario por servicio, con permisos limitados a ese servicio y
a los recursos del grupo 8.

| Usuario | Política | Uso previsto |
|---|---|---|
| `iam-s3-g8` | `policy-s3-g8` | Carga de fotos de perfil y pósters por parte de los backends; publicación del frontend por parte de R5 |
| `iam-ec2-g8` | `policy-ec2-g8` | Operación de las dos instancias del grupo |
| `iam-rds-g8` | `policy-rds-g8` | Administración de la base de datos del grupo por parte de R2 |
| `iam-elb-g8` | `policy-elb-g8` | Gestión del balanceador y sus target groups |

Las definiciones en JSON están versionadas en `Practica_1/infra/iam/` y contienen ya el
identificador de cuenta en los ARN correspondientes.

### 2.1 Creación de las políticas

Para cada archivo:

1. IAM → **Políticas** → **Crear política**.
2. Pestaña **JSON** → eliminar el contenido predeterminado → pegar el contenido del archivo.
3. **Siguiente** → nombre de la política, coincidente con el nombre del archivo sin extensión.
4. **Crear política**.

Un error de sintaxis en este punto indica que el pegado quedó incompleto; los cuatro archivos del
repositorio están validados.

Para localizar las políticas propias entre las más de 1500 que AWS precarga en toda cuenta, se
filtra la lista por tipo **Administrada por el cliente**.

### 2.2 Contenido de cada política

**`policy-s3-g8`.** Se estructura en tres bloques. El primero concede `s3:ListAllMyBuckets` sobre
`*`, permiso mínimo necesario para que la consola de S3 muestre la lista de buckets; solo expone
nombres, no contenido. El segundo concede `s3:ListBucket` sobre el ARN del bucket, **sin** el
sufijo `/*`. El tercero concede `s3:PutObject`, `s3:GetObject` y `s3:DeleteObject` sobre el ARN
**con** el sufijo `/*`.

La distinción entre ambos ARN es la causa más común de errores `AccessDenied` con S3: los permisos
sobre el bucket usan el ARN del bucket y los permisos sobre objetos usan el ARN con comodín. La
política nombra únicamente los dos buckets del grupo, de modo que el usuario no puede alcanzar
ningún otro bucket de la cuenta.

**`policy-ec2-g8`.** Las acciones `ec2:Describe*` se declaran sobre `*` porque la API de EC2 no
admite restricción por recurso para ellas; se trata de una limitación del servicio. Las acciones
que modifican estado —`StartInstances`, `StopInstances`, `RebootInstances`— están condicionadas a
la etiqueta `Proyecto = practica1-g8`, razón por la cual etiquetar las instancias es obligatorio.

La política omite deliberadamente `ec2:TerminateInstances` y `ec2:RunInstances`: el usuario puede
operar las instancias existentes del grupo, pero no destruirlas ni crear instancias nuevas que
generen costo.

**`policy-rds-g8`.** Controla el ciclo de vida de la instancia de base de datos: creación, inicio,
detención, modificación y copias de seguridad, todo ello acotado al identificador
`practica1-db-g8`. Omite `rds:DeleteDBInstance`.

IAM no interviene en las consultas SQL. La conexión a la base de datos se autentica con usuario y
contraseña de PostgreSQL y se autoriza mediante los `GRANT` del motor. Por ello un backend
necesita dos conjuntos de credenciales independientes: las de IAM para S3 y las de PostgreSQL para
la base de datos.

**`policy-elb-g8`.** Comprende las acciones de `elasticloadbalancing` necesarias para crear y
gestionar el balanceador, los target groups y los listeners; un bloque de `ec2:Describe*`
indispensable para que el asistente de creación pueda leer la VPC, las subredes y los grupos de
seguridad; y un permiso de `iam:CreateServiceLinkedRole` restringido mediante condición
exclusivamente al servicio `elasticloadbalancing.amazonaws.com`, que AWS requiere la primera vez
que se crea un balanceador en la cuenta.

### 2.3 Creación de los usuarios

Para cada uno de los cuatro usuarios:

1. IAM → **Usuarios de IAM** → **Crear usuario**.
2. Introducir el nombre del usuario.
3. **No** marcar «Proporcionar acceso de usuario a la consola de administración de AWS». Se trata
   de usuarios de aplicación, no de personas: no requieren acceso a la consola, y prescindir de la
   contraseña reduce la superficie de ataque.
4. **Siguiente** → **Adjuntar políticas directamente** → seleccionar únicamente la política
   correspondiente al usuario.
5. **Siguiente** → etiqueta `Proyecto` = `practica1-g8` → **Crear usuario**.

Adjuntar políticas administradas por AWS de alcance amplio, como `AmazonS3FullAccess` o
`AdministratorAccess`, anula la separación de responsabilidades que evalúa la rúbrica.

Excepciones aplicadas en esta práctica: `iam-rds-g8` e `iam-s3-g8` sí tienen acceso a consola
habilitado, el primero para que R2 administre la base de datos y el segundo para que R5 cargue el
frontend al bucket correspondiente.

### 2.4 Credenciales programáticas

Las claves de acceso son necesarias para `iam-s3-g8`, ya que es el usuario que emplean los
backends a través del SDK.

1. IAM → **Usuarios de IAM** → `iam-s3-g8` → pestaña **Credenciales de seguridad**.
2. **Claves de acceso** → **Crear clave de acceso**.
3. Caso de uso: **Aplicación ejecutada en un servicio de computación de AWS**, que corresponde a
   la situación real. La consola muestra entonces una recomendación sobre el uso de roles y una
   casilla de confirmación.
4. Descargar el archivo `.csv` antes de abandonar la pantalla. La clave de acceso secreta se
   muestra una única vez.

Se generan **dos** claves para este usuario, una por servidor backend, identificadas mediante la
etiqueta de descripción. IAM admite un máximo de dos claves por usuario. Esta separación permite
revocar una de ellas ante un compromiso sin interrumpir el servicio del otro backend.

Sobre la recomendación que muestra AWS: la práctica idónea consistiría en adjuntar un **rol de
IAM** a cada instancia EC2, de modo que reciba credenciales temporales rotadas automáticamente y
no exista ninguna clave de larga duración susceptible de filtrarse. El enunciado de la práctica,
sin embargo, exige explícitamente usuarios IAM con sus políticas por servicio.

Normas de manejo de las claves:

- No se incorporan al repositorio bajo ninguna forma: ni en archivos de configuración, ni en
  comentarios, ni en capturas de pantalla.
- Se entregan por canal privado y se almacenan en un archivo `.env` excluido por `.gitignore`.
  El repositorio incluye únicamente `.env.example`.
- Ante una filtración, la clave se desactiva y se elimina de inmediato en IAM y se genera una
  nueva. AWS analiza los repositorios públicos y suspende las cuentas cuyas claves quedan
  expuestas.
- En las capturas destinadas al manual, el identificador de clave de acceso debe censurarse.

### 2.5 Evidencia

- Lista de los usuarios de IAM.
- Lista de políticas filtrada por tipo «Administrada por el cliente».
- Pestaña *Permisos* de cada usuario, que acredita la correspondencia entre usuario y política.
- Panel de IAM con el indicador «Recomendaciones de seguridad: 0».

Las definiciones JSON están versionadas en el repositorio, por lo que el manual las enlaza en
lugar de reproducirlas.

---

## FASE 3 — Par de claves e instancias EC2

Las dos instancias corresponden a los entregables de R3 y R4, pero su aprovisionamiento es
responsabilidad de R1 y condiciona el avance de todo el equipo.

### 3.1 Par de claves

EC2 → *Red y seguridad* → **Pares de claves** → **Crear par de claves**:

| Campo | Valor |
|---|---|
| Nombre | `g8-key` |
| Tipo | RSA |
| Formato del archivo | `.pem` (el formato `.ppk` solo es necesario para PuTTY) |

El archivo `g8-key.pem` se descarga una única vez; AWS no conserva copia de la clave privada. Su
pérdida obliga a crear un par nuevo y relanzar las instancias. No se incorpora al repositorio y se
comparte por canal privado.

En Windows debe eliminarse la herencia de permisos para que el cliente SSH acepte el archivo:

```powershell
icacls .\g8-key.pem /inheritance:r
icacls .\g8-key.pem /grant:r "$($env:USERNAME):(R)"
```

### 3.2 Instancia EC2 número 1 (Node.js)

EC2 → **Instancias** → **Lanzar instancias**:

| Campo | Valor | Observación |
|---|---|---|
| Nombre | `ec2-node-g8` | |
| AMI | Amazon Linux 2023 | Debe indicar *Apto para la capa gratuita*. Incluye `dnf` y systemd. |
| Tipo de instancia | `t3.micro` | El que figure como apto para la capa gratuita. |
| Par de claves | `g8-key` | |
| VPC | La predeterminada | |
| Subred | Se selecciona explícitamente y se registra | La segunda instancia va en otra zona. |
| Asignar IP pública automáticamente | Habilitar | Sin ella no hay acceso SSH. |
| Cortafuegos | **Seleccionar grupo de seguridad existente** → `ec2-sg-g8` | La consola propone crear uno nuevo de forma predeterminada; esa opción invalidaría la configuración de la fase 1. |
| Almacenamiento | 8 GiB `gp3` | |

En **Detalles avanzados** → **Datos de usuario** se introduce:

```bash
#!/bin/bash
dnf update -y
dnf install -y git
dnf install -y nodejs20 nodejs20-npm
npm install -g pm2
```

El paquete `npm` sin sufijo no debe incluirse en esa instrucción: en Amazon Linux 2023 depende de
Node 18, de modo que dnf instala ambas versiones y `/usr/bin/node` queda asociado a la 18. El
paquete correcto es `nodejs20-npm`.

Etiquetas de la instancia:

- `Name` = `ec2-node-g8`
- `Proyecto` = `practica1-g8` (obligatoria; de ella depende `policy-ec2-g8`)

### 3.3 Instancia EC2 número 2 (Python)

Configuración idéntica a la anterior, con tres diferencias:

- Nombre y etiqueta `Name`: `ec2-python-g8`.
- Subred correspondiente a una **zona de disponibilidad distinta** de la primera instancia.
- Datos de usuario:

```bash
#!/bin/bash
dnf update -y
dnf install -y git python3.11 python3.11-pip
```

La instrucción `pip3 install --upgrade pip` no debe incluirse: el pip del sistema se instala
mediante RPM y carece de archivo `RECORD`, por lo que no puede desinstalarse a sí mismo; la orden
falla siempre y deja `cloud-init` en estado de error.

Amazon Linux 2023 incorpora Python 3.9 de forma predeterminada. Se instala 3.11 de manera
adicional porque FastAPI y las anotaciones de tipo modernas lo requieren. El trabajo se realiza
sobre un entorno virtual: `python3.11 -m venv .venv`.

Una zona de disponibilidad es un centro de datos físicamente separado. Situar ambos servidores en
la misma zona produciría una redundancia solo aparente, y el Application Load Balancer exige
además un mínimo de dos zonas habilitadas.

### 3.4 Direcciones IP elásticas

La dirección IP pública que AWS asigna de forma automática cambia cada vez que una instancia se
detiene y se vuelve a iniciar. Dado que las instancias se apagan fuera del horario de trabajo para
reducir consumo, esto invalidaría el acceso SSH y las pruebas por dirección directa.

Para cada instancia: EC2 → *Red y seguridad* → **Direcciones IP elásticas** →
**Asignar dirección IP elástica** → **Asignar**. A continuación se selecciona la dirección y se
elige **Acciones** → **Dirección IP elástica asociada** → tipo de recurso **Instancia** →
**Asociar**.

Al finalizar la práctica ambas direcciones deben liberarse: una dirección IP elástica sin asociar
genera cargos.

### 3.5 Comprobación y entrega

Acceso por SSH, desde la carpeta que contiene el archivo `.pem`:

```powershell
ssh -i .\g8-key.pem ec2-user@DIRECCION_IP
```

El usuario del sistema en Amazon Linux es `ec2-user`.

Comprobación del software instalado por los datos de usuario:

```bash
node -v && npm -v && pm2 -v     # en ec2-node-g8
python3.11 -V && git --version  # en ec2-python-g8
```

Los datos de usuario se ejecutan en el primer arranque y tardan unos minutos. Su avance puede
seguirse con `sudo tail -f /var/log/cloud-init-output.log` y su resultado consultarse con
`sudo cloud-init status`.

Estado verificado el 23/08/2026:

| Componente | `ec2-node-g8` | `ec2-python-g8` |
|---|---|---|
| Node.js | 20.20.2 | — |
| npm | 10.8.2 | — |
| pm2 | 7.0.3 | — |
| Python | 3.9.25 | 3.9.25 y 3.11.15 |
| pip | — | 22.3.1 |
| git | 2.50.1 | 2.50.1 |

### 3.6 Indicaciones entregadas a R3 y R4

- Acceso por SSH con el usuario `ec2-user` y el par de claves `g8-key`, que no debe versionarse.
- La aplicación debe escuchar en `0.0.0.0:3000`, no en `127.0.0.1`. Un servicio enlazado a
  localhost resulta invisible para el balanceador.
- `GET /health` debe responder código 200 con `{"status":"ok","server":"node"}` o
  `{"status":"ok","server":"python"}` desde el primer día, ya que de ello depende toda la
  configuración del balanceador.
- El servicio debe quedar habilitado para arrancar automáticamente tras un reinicio: `pm2 save`
  junto con `pm2 startup` en el caso de Node, y `systemctl enable` en el de Python.
- CORS debe habilitarse desde el inicio del desarrollo.
- Las credenciales IAM se entregan por canal privado y se almacenan en un archivo `.env` excluido
  por `.gitignore`.
- El acceso SSH desde otras redes requiere añadir una regla por cada dirección al grupo
  `ec2-sg-g8`.

---

## FASE 4 — Application Load Balancer

Requisito previo: ambas API deben estar en ejecución y responder `GET /health` con código 200 en
el puerto 3000. Se comprueba antes de comenzar:

```powershell
curl http://DIRECCION_NODE:3000/health
curl http://DIRECCION_PYTHON:3000/health
```

Si estas comprobaciones no responden, la creación del balanceador mostraría ambos targets en
estado `unhealthy` y el diagnóstico se dirigiría al componente equivocado.

### 4.1 Componentes

Un Application Load Balancer recibe las peticiones en un único DNS público y las distribuye entre
varios servidores. Consta de tres elementos:

- **Listener**: el puerto en el que escucha y la acción que aplica al tráfico entrante.
- **Target group**: la relación de servidores destino y las reglas del *health check*.
- **Load balancer**: el recurso público, con su nombre DNS.

Se denomina *Application* porque opera en la capa 7 del modelo OSI y comprende HTTP: rutas,
cabeceras y métodos. El Network Load Balancer opera en capa 4 y únicamente verificaría que el
puerto TCP acepta conexiones, sin poder comprobar si la aplicación responde correctamente. Esta
práctica requiere capa 7 porque el health check se realiza sobre una ruta HTTP.

### 4.2 Target group

EC2 → *Equilibrio de carga* → **Grupos de destino** → **Crear grupo de destino**:

| Campo | Valor |
|---|---|
| Tipo de destino | Instancias |
| Nombre | `tg-cloudcinema-g8` |
| Protocolo y puerto | HTTP / 3000 |
| VPC | La predeterminada |
| Versión de protocolo | HTTP1 |
| Protocolo del health check | HTTP |
| Ruta del health check | `/health` |

En **Configuración avanzada del health check** se ajustan los valores predeterminados:

| Campo | Predeterminado | Valor aplicado | Motivo |
|---|---|---|---|
| Umbral de estado correcto | 5 | 2 | Reincorporación rápida de una instancia recuperada |
| Umbral de estado incorrecto | 2 | 2 | Sin cambio |
| Tiempo de espera | 5 s | 5 s | Sin cambio |
| Intervalo | 30 s | 10 s | Reduce la detección de una caída de un minuto a unos 20 segundos |
| Códigos de éxito | 200 | 200 | Sin cambio |

Con estos valores, la retirada de una instancia detenida se produce tras dos comprobaciones
fallidas separadas por 10 segundos.

A continuación se registran ambas instancias, verificando que el puerto asociado sea el 3000, y se
crea el grupo. Una vez creado, en la pestaña **Atributos** se reduce el *retraso de anulación del
registro* de 300 a 30 segundos.

### 4.3 Balanceador

EC2 → *Equilibrio de carga* → **Balanceadores de carga** → **Crear balanceador de carga** →
**Application Load Balancer**:

| Campo | Valor |
|---|---|
| Nombre | `alb-cloudcinema-g8` |
| Esquema | Orientado a internet |
| Tipo de dirección IP | IPv4 |
| VPC | La predeterminada |
| Asignaciones | Un mínimo de dos zonas de disponibilidad, incluidas aquellas donde residen las instancias |
| Grupos de seguridad | `alb-sg-g8`, retirando el grupo `default` si aparece marcado |
| Listener | HTTP:80 con acción de reenvío a `tg-cloudcinema-g8` |

Etiqueta: `Proyecto` = `practica1-g8`. La transición del estado *aprovisionando* a *activo*
requiere entre dos y cuatro minutos.

### 4.4 Verificación

1. Se copia el nombre DNS del balanceador.
2. En el target group, ambas instancias deben figurar en estado `healthy`.
3. Comprobación de respuesta:

```powershell
curl http://DNS_DEL_BALANCEADOR/health
```

### 4.5 Verificación del reparto equitativo

La rúbrica exige que el tráfico se distribuya equitativamente. Dado que el campo `server` de la
respuesta de `/health` identifica al servidor que atendió la petición, el reparto puede medirse:

```powershell
$dns = "DNS_DEL_BALANCEADOR"
1..20 | ForEach-Object { (Invoke-RestMethod "http://$dns/health").server } |
  Group-Object | Select-Object Name, Count
```

El resultado esperado es un reparto próximo a 10 y 10, dado que el algoritmo predeterminado del
balanceador es round robin.

Un resultado de 20 y 0 indica que la sesión persistente está activada. Se desactiva en
Target Group → *Atributos* → *Stickiness*, que por omisión viene deshabilitada.

La salida de este comando constituye la evidencia directa del criterio de distribución del
tráfico.

### 4.6 Comunicación a R5

El nombre DNS del balanceador es el valor que debe recibir la variable `VITE_API_URL` del
frontend. No debe emplearse la dirección IP de ninguna instancia: si esa instancia se detiene, la
aplicación dejaría de funcionar y se perdería el objetivo de alta disponibilidad.

---

## FASE 5 — Prueba de alta disponibilidad

Esta prueba se realiza en directo durante la calificación y conviene ensayarla previamente.

### 5.1 Procedimiento

En una primera ventana se ejecuta un ciclo que consulta el balanceador cada segundo:

```powershell
$dns = "DNS_DEL_BALANCEADOR"
while ($true) {
  try   { $r = (Invoke-RestMethod "http://$dns/health" -TimeoutSec 3).server }
  catch { $r = "ERROR" }
  "$(Get-Date -Format HH:mm:ss)  ->  $r"
  Start-Sleep -Seconds 1
}
```

En una segunda ventana se mantiene abierta la consola de AWS en la pestaña *Destinos* del target
group.

Pasos:

1. Se ejecuta el ciclo durante unos quince segundos y se observa la alternancia entre `node` y
   `python`, que evidencia el reparto equitativo.
2. EC2 → **Instancias** → `ec2-node-g8` → **Estado de la instancia** → **Detener instancia**.
3. Durante unos veinte segundos pueden producirse respuestas anómalas; a partir de ese momento
   todas las respuestas proceden de `python`. El servicio no llega a interrumpirse.
4. En la consola, el destino `ec2-node-g8` pasa a `unhealthy` y posteriormente a `unused`.
5. Se navega por la aplicación web con normalidad: la galería carga y la lista de reproducción
   funciona con una sola instancia activa. Esta comprobación es la que acredita el criterio de la
   rúbrica.
6. Se reinicia la instancia. En uno o dos minutos vuelve a `healthy` y el reparto se restablece.

### 5.2 Arranque automático de los servicios

Si una aplicación se ha iniciado manualmente, no se reinicia por sí sola tras un reinicio de la
instancia y el destino permanece indefinidamente en estado `unhealthy`. Este es el motivo por el
que se exige pm2 en el backend de Node y systemd en el de Python.

La comprobación consiste en detener e iniciar cada instancia y confirmar que el destino regresa a
`healthy` sin intervención manual. Si no ocurre, falta ejecutar:

```bash
# En ec2-node-g8, tras iniciar la aplicación con pm2:
pm2 startup      # imprime un comando que debe ejecutarse con sudo
pm2 save
```

```bash
# En ec2-python-g8:
sudo systemctl enable NOMBRE_DEL_SERVICIO
```

### 5.3 Evidencia

- Ciclo alternando entre `node` y `python` antes de la detención.
- Ciclo respondiendo únicamente `python` con la instancia de Node detenida.
- Destinos del target group con uno en `healthy` y otro en `unhealthy`.
- Aplicación web operativa con una instancia detenida.
- Destinos nuevamente en `healthy` tras reiniciar la instancia.

Se recomienda además grabar la secuencia en vídeo como respaldo.

---

## FASE 6 — Cierre

### 6.1 Detención de recursos

Al finalizar cada jornada de trabajo:

| Recurso | Acción | Consecuencia |
|---|---|---|
| EC2 | Detener, nunca terminar | Ninguna. El disco se conserva y la dirección pública se mantiene gracias a la IP elástica. |
| RDS | Detener temporalmente | Ninguna. RDS reinicia la instancia automáticamente transcurridos siete días. |
| Balanceador | Mantener activo | Eliminarlo obligaría a rehacer el DNS y el target group. |
| IP elástica | Mantener asociada | Una dirección sin asociar genera cargos. |

### 6.2 Lista de verificación previa a la entrega

**IAM**
- [ ] MFA activo en la cuenta raíz, que no se emplea para operar
- [ ] Existen los cuatro usuarios de servicio
- [ ] Cada usuario tiene únicamente su política; ninguna es de alcance total
- [ ] La política de S3 nombra solo los dos buckets del grupo
- [ ] Las cuatro definiciones JSON están versionadas
- [ ] No hay ninguna clave de acceso en el repositorio

**Grupos de seguridad**
- [ ] `alb-sg-g8` permite únicamente el puerto 80 desde `0.0.0.0/0`
- [ ] `ec2-sg-g8` permite el puerto 3000 con origen `alb-sg-g8` y el 22 solo desde direcciones conocidas
- [ ] `rds-sg-g8` permite el puerto 5432 con origen `ec2-sg-g8` y ningún origen público
- [ ] La instancia RDS tiene el acceso público deshabilitado
- [ ] Ninguna instancia quedó asociada al grupo `default`

**Balanceador**
- [ ] Balanceador activo, orientado a internet, con `alb-sg-g8`
- [ ] Al menos dos zonas de disponibilidad, con las instancias en zonas distintas
- [ ] Ambos destinos en `healthy` sobre el puerto 3000
- [ ] Health check en `/health`, intervalo de 10 segundos y umbrales de 2
- [ ] Sesión persistente desactivada
- [ ] Reparto equitativo comprobado y documentado
- [ ] Prueba de detención ensayada y documentada
- [ ] Las aplicaciones arrancan automáticamente tras un reinicio
- [ ] El frontend apunta al DNS del balanceador

**Coordinación**
- [ ] Auxiliar añadido como colaborador del repositorio privado
- [ ] Todas las secciones del manual redactadas por sus responsables
- [ ] `.gitignore` cubre `*.pem`, `.env` y los archivos `.csv` de credenciales

### 6.3 Secciones del manual técnico

Corresponden a esta área tres secciones del manual, además de su consolidación:

1. Descripción de la arquitectura y diagrama, incorporando la capa de grupos de seguridad.
2. Usuarios de IAM y sus políticas, indicando tanto lo que cada una permite como lo que omite de
   forma deliberada.
3. Grupos de seguridad y balanceador, con las evidencias de las fases 1, 4 y 5.

---

## Preguntas de conocimiento

La rúbrica asigna 10 puntos a la defensa oral del trabajo realizado. Estas son las preguntas
previsibles del área.

**¿Por qué se creó un usuario IAM por servicio en lugar de uno solo?**
Por el principio de mínimo privilegio y la separación de responsabilidades. Si la clave de
`iam-s3-g8` se filtrara, el acceso obtenido se limitaría a los objetos de dos buckets: no
permitiría detener instancias, eliminar la base de datos ni crear recursos que generen costo.
Además, permite auditar en CloudTrail qué componente ejecutó cada acción.

**¿Cuál es la diferencia entre IAM y un grupo de seguridad?**
IAM autoriza llamadas a la API de AWS, es decir, actúa sobre el plano de control. El grupo de
seguridad filtra paquetes de red dirigidos a un recurso, sobre el plano de datos. Un backend puede
disponer del permiso `s3:PutObject` y aun así no alcanzar la base de datos si el grupo de
seguridad no lo permite. Son capas independientes y complementarias.

**¿Pueden los grupos de seguridad denegar tráfico?**
No. Solo admiten reglas de permiso, y todo lo no permitido queda bloqueado de forma implícita.
Las reglas de denegación explícita corresponden a las Network ACL, que además son *stateless* y se
aplican a la subred completa en lugar de a un recurso.

**¿Por qué el puerto 3000 tiene como origen un grupo de seguridad y no una dirección IP?**
Porque el balanceador no dispone de una dirección IP fija: AWS las rota. Referenciar `alb-sg-g8`
mantiene la regla válida y garantiza que solo el balanceador alcance el puerto de la aplicación.
Ningún origen externo puede acceder directamente a la instancia aunque conozca su dirección.

**¿Cómo detecta el balanceador que una instancia ha dejado de funcionar?**
Mediante el health check: cada 10 segundos realiza una petición `GET /health` a cada destino y
espera un código 200. Tras dos fallos consecutivos lo marca como `unhealthy` y deja de enviarle
tráfico; tras dos respuestas correctas consecutivas lo reincorpora. La detección se produce en
unos 20 segundos.

**¿Por qué un Application Load Balancer y no un Network Load Balancer?**
El primero opera en capa 7 y comprende HTTP, lo que permite realizar el health check sobre la ruta
`/health` y enrutar por path si fuera necesario. El segundo opera en capa 4 y únicamente
verificaría que el puerto TCP acepta conexiones, sin poder determinar si la aplicación responde
correctamente.

**¿Por qué las instancias están en zonas de disponibilidad distintas?**
Una zona de disponibilidad es un centro de datos físicamente separado. Situar ambas instancias en
la misma zona expondría el sistema a un único punto de fallo y la redundancia sería solo aparente.
El balanceador exige además un mínimo de dos zonas habilitadas.

**¿Con qué permiso IAM ejecuta el backend una consulta SQL?**
Con ninguno. IAM controla el ciclo de vida de la instancia RDS. La conexión y las consultas se
autentican con usuario y contraseña de PostgreSQL y se autorizan mediante los `GRANT` del motor.
Son dos sistemas de permisos distintos.

**¿Cómo se protegió la base de datos?**
Mediante tres capas: la instancia tiene el acceso público deshabilitado, por lo que carece de
dirección IP pública; su grupo de seguridad solo acepta el puerto 5432 con origen `ec2-sg-g8`; y
ese grupo, a su vez, solo acepta el puerto de la aplicación con origen `alb-sg-g8`. Alcanzar la
base de datos exige haber atravesado el balanceador y una de las instancias.

**¿Por qué la política de S3 emplea dos ARN distintos?**
Porque los permisos sobre el bucket, como `ListBucket`, utilizan el ARN del bucket, mientras que
los permisos sobre objetos, como `GetObject` y `PutObject`, utilizan el ARN con el sufijo `/*`.
Emplear el ARN incorrecto produce un error `AccessDenied` pese a que el permiso figure en la
política.

**¿Qué procede ante la filtración de una clave de acceso?**
Desactivarla y eliminarla de inmediato en IAM, y generar una nueva. Por ello las claves residen en
archivos `.env` fuera del repositorio, que incluye únicamente `.env.example`. AWS analiza los
repositorios públicos y suspende las cuentas cuyas claves quedan expuestas.

---

## Diagnóstico de incidencias

| Síntoma | Causa probable | Resolución |
|---|---|---|
| Los destinos figuran como `unhealthy` | La aplicación escucha en `127.0.0.1` | Enlazar el servicio a `0.0.0.0:3000` |
| Los destinos figuran como `unhealthy` | La aplicación no está en ejecución o `/health` no devuelve 200 | Comprobar por SSH con `curl localhost:3000/health` |
| Los destinos figuran como `unhealthy` | `ec2-sg-g8` no permite el puerto 3000 desde `alb-sg-g8` | Revisar que el origen de la regla sea el grupo y no una dirección |
| Los destinos figuran como `unhealthy` | El target group apunta al puerto 80 | Corregir el puerto a 3000 |
| El DNS del balanceador no responde | La instancia quedó asociada al grupo `default` | Instancia → *Acciones* → *Seguridad* → *Cambiar grupos de seguridad* |
| El DNS del balanceador devuelve 503 | Ningún destino está en `healthy` | Aplicar los diagnósticos anteriores |
| El backend no puede escribir en S3 | Clave de acceso incorrecta o ARN de la política sin `/*` | Revisar el archivo `.env` y el bloque de objetos de `policy-s3-g8` |
| El backend no conecta con la base de datos | `rds-sg-g8` no permite el puerto 5432 desde `ec2-sg-g8` | Corregir la regla de entrada |
| El backend no conecta con la base de datos | La instancia RDS quedó con un grupo de seguridad generado automáticamente | RDS → *Modificar* → asignar `rds-sg-g8` |
| El frontend reporta errores de CORS | Los backends no tienen CORS habilitado | Corresponde a R3 y R4; no se resuelve en el balanceador |
| Un recurso no aparece en la consola | Región distinta seleccionada | Cambiar a `us-east-1` |

---

## Documentación relacionada

El entregable completo reside en `Practica_1/`. Rutas relativas desde este documento:

- [`../../infra/iam/`](../../infra/iam/) — definiciones JSON de las cuatro políticas
- [`../../infra/README.md`](../../infra/README.md) — inventario de recursos: identificadores, endpoints y direcciones
- [`../../README.md`](../../README.md) — manual técnico del proyecto
- [`../management/distribucion-equipo.md`](../management/distribucion-equipo.md) — reparto de trabajo, contrato de API y cronograma
- [`../statement/797_Practica_1_2S2026.docx.md`](../statement/797_Practica_1_2S2026.docx.md) — enunciado y rúbrica de la práctica
