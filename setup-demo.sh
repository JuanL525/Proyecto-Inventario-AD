#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

FRESH=false
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=true ;;
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      echo "Uso: bash setup-demo.sh [--fresh] [--skip-build]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg (usa --help)"
      exit 1
      ;;
  esac
done

log() { echo ""; echo "==> $*"; }
ok()  { echo "    ✓ $*"; }
warn(){ echo "    ! $*"; }

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está instalado o no está en el PATH."
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 no disponible (prueba: docker compose version)"
  exit 1
fi

if [ ! -f frontend/.env ]; then
  log "Creando frontend/.env desde .env.example"
  cp frontend/.env.example frontend/.env
  ok "frontend/.env creado"
fi

if [ "$FRESH" = true ]; then
  log "Instalación limpia: deteniendo y borrando volúmenes..."
  docker compose down -v 2>/dev/null || true
fi

log "Levantando contenedores Docker..."
if [ "$SKIP_BUILD" = true ]; then
  docker compose up -d
else
  docker compose up -d --build
fi

log "Esperando que db-master esté listo (máx. 2 min)..."
for i in $(seq 1 60); do
  if docker exec db-master mysqladmin ping -uroot -proot --silent 2>/dev/null; then
    ok "db-master respondiendo"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: db-master no respondió a tiempo. Revisa: docker compose logs db-master"
    exit 1
  fi
  sleep 2
done

log "Configurando usuario de replicación (repl_user)..."
docker exec db-master mysql -uroot -proot -e "
  CREATE USER IF NOT EXISTS 'repl_user'@'%' IDENTIFIED WITH mysql_native_password BY 'repl_pass';
  GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
  FLUSH PRIVILEGES;
" 2>/dev/null
ok "repl_user listo"

COUNT=$(docker exec db-master mysql -uroot -proot inventario_db -N -e "SELECT COUNT(*) FROM componentes;" 2>/dev/null || echo "0")
if [ "$COUNT" -eq 0 ]; then
  log "Cargando catálogo de demo (14 componentes)..."
  docker exec -i db-master mysql -uroot -proot < db/seed-componentes.sql
  ok "Productos insertados"
else
  ok "Catálogo ya tiene $COUNT productos (no se sobrescribe)"
fi

log "Asignando URLs de imagen al catálogo..."
docker exec -i db-master mysql -uroot -proot < db/seed-imagenes.sql 2>/dev/null || true
ok "Imágenes actualizadas"

log "Sincronizando esclavos y activando replicación..."
bash db/fix-replication.sh

log "Verificando servicios..."

REPL_OK=true
for SLAVE in db-slave1 db-slave2; do
  IO=$(docker exec "$SLAVE" mysql -uroot -proot -N -e "SHOW SLAVE STATUS\G" 2>/dev/null | grep "Slave_IO_Running" | awk '{print $2}' || echo "No")
  SQL=$(docker exec "$SLAVE" mysql -uroot -proot -N -e "SHOW SLAVE STATUS\G" 2>/dev/null | grep "Slave_SQL_Running" | awk '{print $2}' || echo "No")
  if [ "$IO" = "Yes" ] && [ "$SQL" = "Yes" ]; then
    ok "$SLAVE: replicación OK"
  else
    warn "$SLAVE: replicación con problemas (IO=$IO SQL=$SQL)"
    REPL_OK=false
  fi
done

TOTAL=$(docker exec db-master mysql -uroot -proot inventario_db -N -e "SELECT COUNT(*) FROM componentes;" 2>/dev/null || echo "?")
ok "Productos en maestro: $TOTAL"

if curl -sf http://localhost/api/ping >/dev/null 2>&1; then
  ok "API respondiendo en http://localhost/api/ping"
  echo "    Balanceo NGINX (muestra de 5 peticiones):"
  for _ in 1 2 3 4 5; do
    NODO=$(curl -sf http://localhost/api/ping | grep -o '"nodo":"[^"]*"' | cut -d'"' -f4 || echo "?")
    echo "      → nodo: $NODO"
  done
else
  warn "API no respondió aún. Espera 30s y prueba: curl http://localhost/api/ping"
fi

if curl -sf http://localhost:5173 >/dev/null 2>&1; then
  ok "Frontend respondiendo en http://localhost:5173"
else
  warn "Frontend aún iniciando. Prueba en unos segundos: http://localhost:5173"
fi

echo ""
echo "============================================================================="
echo "  VOLTIO — Listo para demo"
echo "============================================================================="
echo ""
echo "  App:      http://localhost:5173"
echo "  API:      http://localhost/api"
echo ""
echo "  Admin:    admin / admin123"
echo "  Cliente:  cliente / cliente123"
echo ""
echo "  Comandos útiles:"
echo "    docker compose ps"
echo "    docker compose logs -f nginx"
echo "    bash db/fix-replication.sh"
echo "    bash setup-demo.sh --fresh"
echo ""
if [ "$REPL_OK" = false ]; then
  warn "Revisar replicación antes de la defensa: bash db/fix-replication.sh"
fi
echo "============================================================================="
echo ""
