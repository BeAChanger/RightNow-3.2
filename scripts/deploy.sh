#!/bin/bash
# RightNow Fitness — Production Deployment Script
# Usage: bash scripts/deploy.sh
# Run as root on the target server (CentOS 8+ or Ubuntu 22+)

set -e

APP_DIR=/root/rightnow
FRONTEND_DIST=/var/www/rightnow
REPO=https://github.com/BeAChanger/RightNow-3.2.git
SERVICE=rightnow-backend

log() { echo -e "\n\033[1;34m>>>\033[0m $1"; }

# ── 1. System packages ────────────────────────────────────────────────────────
log "Installing system packages..."
if command -v yum &>/dev/null; then
  yum install -y git curl
  # Node.js 18 via NodeSource
  if ! command -v node &>/dev/null || [[ $(node -v | cut -dv -f2 | cut -d. -f1) -lt 18 ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
  fi
  # Docker via Aliyun mirror
  if ! command -v docker &>/dev/null; then
    yum install -y yum-utils
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    yum install -y docker-ce docker-ce-cli containerd.io
    systemctl enable --now docker
  fi
  if ! command -v nginx &>/dev/null; then
    yum install -y nginx && systemctl enable nginx
  fi
elif command -v apt-get &>/dev/null; then
  apt-get update -y && apt-get install -y git curl
  if ! command -v node &>/dev/null || [[ $(node -v | cut -dv -f2 | cut -d. -f1) -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
  fi
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
  fi
  if ! command -v nginx &>/dev/null; then
    apt-get install -y nginx && systemctl enable nginx
  fi
fi

# ── 2. Clone / pull repo ──────────────────────────────────────────────────────
log "Syncing repository..."
npm config set registry https://registry.npmmirror.com
if [ -d "$APP_DIR/.git" ]; then
  git -C $APP_DIR pull origin main
elif [ -f "$APP_DIR/package.json" ]; then
  echo "Code already present (tarball deploy), skipping git sync"
else
  git clone $REPO $APP_DIR
fi

# ── 3. Dependencies ───────────────────────────────────────────────────────────
log "Installing npm dependencies..."
cd $APP_DIR
# Prisma engine binaries are blocked on Chinese VPS — use mirror
export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
export PRISMA_QUERY_ENGINE_BINARY=${PRISMA_ENGINES_MIRROR}
npm run install:all

# ── 4. PostgreSQL ─────────────────────────────────────────────────────────────
log "Starting PostgreSQL..."
# Use docker-compose if available, else run container directly
if command -v docker &>/dev/null; then
  if ! docker ps --format '{{.Names}}' | grep -q rn-postgres; then
    docker run -d --name rn-postgres --restart always \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=rightnow_fitness \
      -p 5432:5432 postgres:16-alpine
    sleep 6
  fi
fi

# ── 5. Backend .env ───────────────────────────────────────────────────────────
ENV_FILE=$APP_DIR/backend/.env
if [ ! -f "$ENV_FILE" ]; then
  log "Creating .env from example..."
  cp $APP_DIR/backend/.env.example $ENV_FILE
  # Production uses port 5432 (docker maps to host 5432)
  sed -i 's|localhost:15433|localhost:5432|g' $ENV_FILE
  echo ""
  echo "============================================================"
  echo "  .env created: $ENV_FILE"
  echo "  Fill in these values, then re-run: bash $0"
  echo "    IMAGE_GEN_API_KEY=<your key>"
  echo "    JWT_SECRET=<any random string>"
  echo "    DEEPSEEK_API_KEY=<if using AI chat>"
  echo "============================================================"
  exit 0
fi

# ── 6. Database setup ─────────────────────────────────────────────────────────
log "Running database migrations and seed..."
cd $APP_DIR
npm run db:init

# ── 7. Build + start backend ──────────────────────────────────────────────────
log "Building backend..."
npm run build:backend

log "Configuring systemd service..."
cat > /etc/systemd/system/${SERVICE}.service << EOF
[Unit]
Description=RightNow Fitness Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR/backend
ExecStart=$(which node) dist/main.js
Restart=always
RestartSec=5
EnvironmentFile=$APP_DIR/backend/.env

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable $SERVICE
systemctl restart $SERVICE

# ── 8. Build frontend + admin ─────────────────────────────────────────────────
log "Building frontend and admin..."
cd $APP_DIR
npm run build:frontend
npm run build:admin

mkdir -p $FRONTEND_DIST
cp -r $APP_DIR/frontend/dist/. $FRONTEND_DIST/

# ── 9. Nginx ──────────────────────────────────────────────────────────────────
log "Configuring Nginx..."
# Remove conflicting default configs
rm -f /etc/nginx/conf.d/default.conf

cat > /etc/nginx/conf.d/rightnow.conf << 'NGINXEOF'
server {
    listen 80 default_server;
    root /var/www/rightnow;
    index index.html;
    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

nginx -t && systemctl reload nginx

# ── Done ──────────────────────────────────────────────────────────────────────
log "=== Deployment complete ==="
echo "  Backend service : $(systemctl is-active $SERVICE)"
echo "  Access          : http://$(hostname -I | awk '{print $1}')"
echo ""
echo "  If image generation is blocked, set IMAGE_GEN_PROXY_URL in $ENV_FILE"
