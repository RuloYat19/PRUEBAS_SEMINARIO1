## Instrucciones para probar localmente
```bash
# Crear y activar venv
python3.11 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Probar localmente
python3.11 -m src.server
# Deberías ver: "Python backend starting on 0.0.0.0:3000"

# Probar que el health funcione en otra terminal
curl http://localhost:3000/health

**NOTA:** En el app.py se comentaron varias lineas para probar el health sin el uso de base de datos del RDS, si se quiere probar con el RDS ya se descomentan esas lineas en dicho archivo.
```

## Instrucciones para el despligue
```bash
# Conectarse a la instancia
ssh -i Practica_1/backend-python/g8-key.pem ec2-user@34.196.34.116

# Clonar el repo (si ya está clonado, hacer pull)
cd ~
git clone https://github.com/DAHFGAMES/SEMINARIO1_B_2S2026_G8.git
cd SEMINARIO1_A_2S2026_G8/Practica_1/backend-python

# Crear y activar venv
python3.11 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
nano .env  # Editar con los valores reales

# Probar localmente
python3.11 src/server.py
# Deberías ver: "Python backend starting on 0.0.0.0:3000"

# Detener con Ctrl+C y ejecutar con PM2
# Instalar PM2 si no está
npm install -g pm2

# Crear carpeta de logs
mkdir -p ~/logs

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Ejecutar el comando que PM2 sugiere (con sudo)
```

## Prueba de Endpoints (curl)
```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/register \
  -F "correo=test@example.com" \
  -F "nombre=Test User" \
  -F "password=123456" \
  -F "confirmPassword=123456" \
  -F "foto=@/path/to/photo.jpg"

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"test@example.com","password":"123456"}'
```