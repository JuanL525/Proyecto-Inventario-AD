#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/dump-resync.sql"

echo "==> Deteniendo replicación en esclavos..."
docker exec db-slave1 mysql -uroot -proot -e "STOP SLAVE;" 2>/dev/null || true
docker exec db-slave2 mysql -uroot -proot -e "STOP SLAVE;" 2>/dev/null || true
docker exec db-slave1 mysql -uroot -proot -e "RESET SLAVE ALL;" 2>/dev/null || true
docker exec db-slave2 mysql -uroot -proot -e "RESET SLAVE ALL;" 2>/dev/null || true

echo "==> Generando dump del maestro..."
docker exec db-master mysqldump -uroot -proot \
  --databases inventario_db \
  --source-data=2 \
  --single-transaction \
  --routines \
  --triggers > "$DUMP"

CHANGE_LINE=$(grep "CHANGE MASTER TO" "$DUMP" | head -1 | sed 's/^-- //')
if [ -z "$CHANGE_LINE" ]; then
  echo "ERROR: no se encontró CHANGE MASTER en el dump"
  exit 1
fi

echo "==> Posición de replicación: $CHANGE_LINE"

echo "==> Importando dump en esclavos..."
docker exec -i db-slave1 mysql -uroot -proot < "$DUMP"
docker exec -i db-slave2 mysql -uroot -proot < "$DUMP"

echo "==> Configurando replicación..."
for SLAVE in db-slave1 db-slave2; do
  docker exec "$SLAVE" mysql -uroot -proot -e "
    CHANGE MASTER TO
      MASTER_HOST='db-master',
      MASTER_USER='repl_user',
      MASTER_PASSWORD='repl_pass',
      MASTER_LOG_FILE='$(echo "$CHANGE_LINE" | sed -n "s/.*MASTER_LOG_FILE='\([^']*\)'.*/\1/p")',
      MASTER_LOG_POS=$(echo "$CHANGE_LINE" | sed -n 's/.*MASTER_LOG_POS=\([0-9]*\).*/\1/p');
    START SLAVE;"
done

echo "==> Verificando estado..."
for SLAVE in db-slave1 db-slave2; do
  echo "--- $SLAVE ---"
  docker exec "$SLAVE" mysql -uroot -proot -e "SHOW SLAVE STATUS\G" 2>/dev/null \
    | grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master|Last_Error"
  docker exec "$SLAVE" mysql -uroot -proot inventario_db -e "SHOW COLUMNS FROM componentes LIKE 'imagen_url';" 2>/dev/null
done

echo "==> Listo."
