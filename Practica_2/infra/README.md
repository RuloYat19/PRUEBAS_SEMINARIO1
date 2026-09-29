# Inventario de infraestructura — Práctica 2 (G8)

Recursos creados por R1 (Cloud Core y Redes) el 24/09/2026. Todos llevan la etiqueta
`Proyecto=practica2-g8`. Las credenciales **no** están aquí: viven en `Practica_2/secrets/`
(ignorada por git) y se entregan por canal privado.

## AWS — cuenta `237145860265`, región `us-east-1`

### IAM

| Usuario | Política | Uso |
|---|---|---|
| `p2-iam-ec2-g8` | `p2-policy-ec2-g8` ([JSON](iam/policy-ec2-g8.json)) | Ver EC2 y encender/apagar/reiniciar solo instancias con `Proyecto=practica2-g8` |
| `p2-iam-s3-g8` | `p2-policy-s3-g8` ([JSON](iam/policy-s3-g8.json)) | `ListBucket`, `PutObject`, `GetObject` solo sobre los dos buckets del grupo (SDK de los backends) |
| `p2-iam-rds-g8` | `p2-policy-rds-g8` ([JSON](iam/policy-rds-g8.json)) | Crear y administrar solo `p2-rds-g8` |
| `p2-iam-elb-g8` | `p2-policy-elb-g8` ([JSON](iam/policy-elb-g8.json)) | Administrar solo el Classic LB `p2-clb-g8` |
| `p2-iam-lambda-g8` | `p2-policy-lambda-g8` ([JSON](iam/policy-lambda-g8.json)) | Crear/publicar `p2-lambda-*-g8`, asignarles `p2-lambda-role-g8` y configurar API Gateway |
| `p2-iam-admin-g8` | `AdministratorAccess` (administrada por AWS) | **Usuario de respaldo del grupo**, con consola y llaves. Solo para desbloquear; se elimina después de la calificación |

| Rol | Confianza | Permisos |
|---|---|---|
| `p2-lambda-role-g8` | `lambda.amazonaws.com` ([JSON](iam/trust-lambda-role-g8.json)) | `s3:PutObject` en el bucket de archivos + logs de CloudWatch ([JSON](iam/policy-lambda-role-g8.json)) |

### Red (VPC por defecto `vpc-0334ee6d4cba6194c`)

| Security Group | ID | Entrada |
|---|---|---|
| `p2-clb-sg-g8` | `sg-0430de2c523f4bfb6` | 80/tcp desde `0.0.0.0/0` |
| `p2-ec2-sg-g8` | `sg-0883886939bc48e11` | 3000/tcp desde `p2-clb-sg-g8` · 22/tcp desde la IP `/32` de R1–R5 |
| `p2-rds-sg-g8` | `sg-00134ceaa5f708b7b` | 3306/tcp desde `p2-ec2-sg-g8`, `20.63.60.70/32`, `20.220.9.6/32` (Azure VMs) y la IP `/32` de R1–R4 (administración y desarrollo local) |

IP de cada integrante: tabla al inicio de [`docs/plan/r1-pendientes.md`](../docs/plan/r1-pendientes.md).

### Cómputo y balanceo

| Recurso | ID / DNS | Detalle |
|---|---|---|
| `p2-ec2-node-g8` | `i-0e0499dbcac37a927` | t3.micro · us-east-1a · Ubuntu 24.04 x86_64 · IP privada `172.31.6.89` |
| `p2-ec2-python-g8` | `i-0574a9f87a218e4be` | t3.micro · us-east-1b · Ubuntu 24.04 x86_64 · IP privada `172.31.80.101` |
| Par de llaves | `p2-keypair-g8` | RSA; `.pem` en `secrets/aws/`. Usuario SSH: `ubuntu` |
| `p2-clb-g8` | `p2-clb-g8-1996192241.us-east-1.elb.amazonaws.com` | Classic · HTTP 80 → 3000 · health check `HTTP:3000/health` (15 s, umbral 2/2) · cross-zone y connection draining (30 s) activos |

> Las EC2 **no tienen IP elástica**: su IP pública cambia si se apagan. Consultarla con
> `aws ec2 describe-instances` o en la consola. El frontend usa **siempre** el DNS del CLB.

## Azure — suscripción *Azure for Students*, región `canadacentral`

| Recurso | Nombre | Detalle |
|---|---|---|
| Resource Group | `rg-p2-g8` | Canada Central |
| VNet / subred | `vnet-p2-g8` (`10.20.0.0/16`) / `snet-backend` (`10.20.1.0/24`) | NSG asociado a la subred |
| NSG | `nsg-p2-backend-g8` | 100: 22/tcp desde la IP `/32` de R1–R5 · 110: 3000/tcp desde `AzureLoadBalancer` (sondeo) · 120: 3000/tcp desde `Internet` (tráfico balanceado) |
| Availability set | `avset-p2-g8` | 2 dominios de error, 2 de actualización |
| VM | `vm-p2-node-g8` | Standard_B2pts_v2 (ARM64) · Ubuntu 24.04 · IP pública estática `20.63.60.70` · privada `10.20.1.4` |
| VM | `vm-p2-python-g8` | Standard_B2pts_v2 (ARM64) · Ubuntu 24.04 · IP pública estática `20.220.9.6` · privada `10.20.1.5` |
| Load Balancer | `lb-p2-g8` | SKU **Standard** · frontend `fe-p2-g8` = `20.63.100.60` · pool `bepool-p2-g8` (2 VM) · probe `probe-health-3000` HTTP `/health:3000` · regla `rule-http-80-3000` |

Usuario SSH de las VM: `azureuser`, con la **misma llave** `p2-keypair-g8.pem` que las EC2.

## Software base en las 4 máquinas

Instalado con [`scripts/bootstrap-backend.sh`](scripts/bootstrap-backend.sh) (user-data /
custom-data): Node.js 20, pm2, Python 3.12 + venv/pip, git, cliente MySQL 8. La aplicación la
despliegan R3 (Node, pm2) y R4 (Python, gunicorn + systemd) escuchando en el **puerto 3000**
con `GET /health`.

```bash
ssh -i Practica_2/secrets/aws/p2-keypair-g8.pem ubuntu@<ip-ec2>
ssh -i Practica_2/secrets/aws/p2-keypair-g8.pem azureuser@20.63.60.70   # vm-p2-node-g8
ssh -i Practica_2/secrets/aws/p2-keypair-g8.pem azureuser@20.220.9.6    # vm-p2-python-g8
```

## Verificación hecha el 24/09

Con un `/health` temporal en el puerto 3000 de cada máquina (ya retirado):

- CLB: 40 peticiones en paralelo → 20 node / 20 python. Ambas instancias `InService`.
- Azure LB: alterna node/python.
- Alta disponibilidad: con el proceso de python detenido, el 100 % de las peticiones de ambos
  balanceadores llegó a node, sin errores.
- SSH, cloud-init terminado y software base confirmados en las 4 máquinas.
