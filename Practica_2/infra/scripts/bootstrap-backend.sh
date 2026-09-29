#!/bin/bash
# Preparacion base de las maquinas backend (EC2 y Azure VM). La app la despliega R3/R4.
set -eux
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git unzip mysql-client python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
