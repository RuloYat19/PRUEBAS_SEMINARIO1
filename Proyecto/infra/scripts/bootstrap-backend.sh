#!/bin/bash
# User data de las dos EC2 (Ubuntu 24.04). Deja la máquina lista; la app la despliega R3 (Node) o R4 (Python).
# Ambas apps escuchan en el puerto 3000 (target group del ALB) y responden GET /health.
# Las credenciales de AWS vienen del perfil de instancia proyecto-ec2-role-g8: no se copian llaves.
set -eux
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git unzip mysql-client python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2
