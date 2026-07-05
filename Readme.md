# Clúster Maestro-Esclavo MySQL — Proyecto Inventario AD

**Objetivo:** Transformar la base de datos única en un clúster Maestro-Esclavo (1 Maestro + 2 Esclavos) usando Docker Compose, y verificar que los datos escritos en el Maestro se repliquen automáticamente a los Esclavos.

---

## Paso 1: Modificar `docker-compose.yml`

Se agregaron los servicios `db-slave1` y `db-slave2`, cada uno con su propio archivo de configuración y volumen.

```yaml
version: '3.8'

services:
  # 1. Base de datos - Maestro
  db-master:
    image: mysql:8.0
    container_name: db-master
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: inventario_db
      
      #El puerto se cambio al 3307 para evitar conflictos 
    ports:
      - "3307:3306"
    volumes:
      - ./db/master/my-master.cnf:/etc/mysql/conf.d/my-master.cnf
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
      - master_data:/var/lib/mysql
    networks:
      - db-net

  # 1.1 Base de datos - Esclavo 1
  db-slave1:
    image: mysql:8.0
    container_name: db-slave1
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3308:3306"
    volumes:
      - ./db/slave1/my-slave1.cnf:/etc/mysql/conf.d/my-slave1.cnf
      - slave1_data:/var/lib/mysql
    depends_on:
      - db-master
    networks:
      - db-net

  # 1.2 Base de datos - Esclavo 2
  db-slave2:
    image: mysql:8.0
    container_name: db-slave2
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
    ports:
      - "3309:3306"
    volumes:
      - ./db/slave2/my-slave2.cnf:/etc/mysql/conf.d/my-slave2.cnf
      - slave2_data:/var/lib/mysql
    depends_on:
      - db-master
    networks:
      - db-net

  # 2. Backend
  backend:
    build: ./backend
    container_name: app-backend
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db-master
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=inventario_db
    depends_on:
      - db-master
    networks:
      - db-net

  # 3. Frontend
  frontend:
    build: ./frontend
    container_name: app-frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - db-net

volumes:
  master_data:
  slave1_data:
  slave2_data:

networks:
  db-net:
    driver: bridge
```

---

## Paso 2: Archivos de configuración (`.cnf`)

Se crearon las carpetas `db/master`, `db/slave1`, `db/slave2`, cada una con su archivo `.cnf` habilitando `log_bin` (solo en el maestro) y un `server-id` único por nodo.

```bash
mkdir -p db/master db/slave1 db/slave2
```

**`db/master/my-master.cnf`**
```ini
[mysqld]
server-id=1
log_bin=mysql-bin
binlog_do_db=inventario_db
```

**`db/slave1/my-slave1.cnf`**
```ini
[mysqld]
server-id=2
relay-log=relay-bin
read_only=1
```

**`db/slave2/my-slave2.cnf`**
```ini
[mysqld]
server-id=3
relay-log=relay-bin
read_only=1
```

---

## Paso 3: Levantar los contenedores

```bash
docker compose down -v
docker compose up -d --build
docker compose ps
```

---

## Paso 4: Crear usuario de replicación en el Maestro

```bash
docker exec -it db-master mysql -uroot -proot -e "CREATE USER IF NOT EXISTS 'repl_user'@'%' IDENTIFIED WITH mysql_native_password BY 'repl_pass'; GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%'; FLUSH PRIVILEGES;"
```

Confirmar posición del binlog:

```bash
docker exec -it db-master mysql -uroot -proot -e "SHOW MASTER STATUS;"
```

---

## Paso 5: Sincronizar el estado inicial (dump) antes de iniciar la replicación

> **Por qué es necesario:** la replicación solo copia cambios *futuros* al binlog. La base y tabla ya existían antes de conectar los esclavos, así que se necesitó una "foto" inicial (dump) para dejarlos sincronizados con el Maestro antes de arrancar `START SLAVE`.

```bash
docker exec db-master mysqldump -uroot -proot --databases inventario_db --source-data=2 --single-transaction > dump.sql

grep "CHANGE MASTER" dump.sql
```

Cargar el dump en cada esclavo:

```bash
docker exec -i db-slave1 mysql -uroot -proot < dump.sql
docker exec -i db-slave2 mysql -uroot -proot < dump.sql
```

---

## Paso 6: Configurar la replicación en cada esclavo

Usando el `MASTER_LOG_FILE` y `MASTER_LOG_POS` exactos obtenidos del dump:

```bash
docker exec -it db-slave1 mysql -uroot -proot -e "
CHANGE MASTER TO
  MASTER_HOST='db-master',
  MASTER_USER='repl_user',
  MASTER_PASSWORD='repl_pass',
  MASTER_LOG_FILE='mysql-bin.000003',
  MASTER_LOG_POS=1887;
START SLAVE;"

docker exec -it db-slave2 mysql -uroot -proot -e "
CHANGE MASTER TO
  MASTER_HOST='db-master',
  MASTER_USER='repl_user',
  MASTER_PASSWORD='repl_pass',
  MASTER_LOG_FILE='mysql-bin.000003',
  MASTER_LOG_POS=1887;
START SLAVE;"
```

Verificar estado (debe mostrar `Yes` / `Yes`):

```bash
docker exec -it db-slave1 mysql -uroot -proot -e "SHOW SLAVE STATUS\G"
docker exec -it db-slave2 mysql -uroot -proot -e "SHOW SLAVE STATUS\G"
```

---

## Paso 7: Verificación del Paso 3 de la tarea (replicación en tiempo real)

Insertar un componente en el Maestro:

```bash
docker exec -it db-master mysql -uroot -proot -e "USE inventario_db; INSERT INTO componentes (codigo_serie, nombre, categoria, stock, precio) VALUES ('GPU-RX-002', 'RX 7800 XT', 'Tarjeta Gráfica', 3, 549.99);"
```

Consultar en ambos esclavos:

```bash
docker exec -it db-slave1 mysql -uroot -proot -e "SELECT * FROM inventario_db.componentes;"
docker exec -it db-slave2 mysql -uroot -proot -e "SELECT * FROM inventario_db.componentes;"
```

**Resultado:** ambos esclavos mostraron los mismos registros que el Maestro — replicación confirmada. ✅

---

## Paso 8 (bug adicional resuelto): corrección de codificación UTF-8

Se detectó que los tildes se guardaban mal (`GrÃ¡fica` en vez de `Gráfica`) por falta de charset explícito en la conexión del backend.

**Fix en `backend/db.js`:**

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'inventario_db',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
```

Reconstruir el backend:

```bash
docker compose stop backend
docker compose rm -f backend
docker compose build --no-cache backend
docker compose up -d backend
```

Corregir los datos ya existentes (con el charset correcto en el cliente):

```bash
docker exec -it db-master mysql --default-character-set=utf8mb4 -uroot -proot -e "USE inventario_db; UPDATE componentes SET categoria='Tarjeta Gráfica' WHERE id IN (1,2);"
```

Verificar bytes correctos (UTF-8 real de "á" = `C3A1`):

```bash
docker exec -it db-master mysql --default-character-set=utf8mb4 -uroot -proot -e "USE inventario_db; SELECT id, categoria, HEX(categoria) FROM componentes;"
```

Confirmar que se replicó a los esclavos:

```bash
docker exec -it db-slave1 mysql --default-character-set=utf8mb4 -uroot -proot -e "SELECT * FROM inventario_db.componentes;"
docker exec -it db-slave2 mysql --default-character-set=utf8mb4 -uroot -proot -e "SELECT * FROM inventario_db.componentes;"
```

Confirmar desde la API:

```bash
curl http://localhost:3000/api/componentes
```

---

## Resumen del clúster final

```
db-master (escritura, puerto 3307)
   ├── db-slave1 (solo lectura, puerto 3308) ✅ replicando
   └── db-slave2 (solo lectura, puerto 3309) ✅ replicando
```

# Balanceo de Carga NGINX por pesos.

Modificar el docker-compose.yml  para la integración de los 3 servicios backend y la integración de NGINX

# 2. Backend (3 replicas)
  backend:
    build: ./backend
    container_name: app-backend
    environment:
      - DB_HOST=db-master
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=inventario_db
      # Host del esclavo
      - DB_SLAVE_HOST=db-slave1
      - HOSTNAME=backend
    depends_on:
      - db-master
    networks:
      - db-net

  backend-1:
    build: ./backend
    container_name: app-backend-1
    environment:
      - DB_HOST=db-master
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=inventario_db
      # Host del esclavo
      - DB_SLAVE_HOST=db-slave2
      - HOSTNAME=backend-1
    depends_on:
      - db-master
    networks:
      - db-net

  backend-2:
    build: ./backend
    container_name: app-backend-2
    environment:
      - DB_HOST=db-master
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=inventario_db
      # Host del esclavo
      - DB_SLAVE_HOST=db-slave1
      - HOSTNAME=backend-2
    depends_on:
      - db-master
    networks:
      - db-net

  # 2.1 Balanceador NGINX (balanceo)
  nginx:
    image: nginx:alpine
    container_name: app-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - backend-1
      - backend-2
    networks:
      - db-net 

# Creación del archivo NGINX.conf

Se configura el archivo con la directiva weight (balanceo por pesos) pra la justificación de porque un nodo recibe mas tráfico que el otro

events {
    worker_connections 1024;
}

http {
    #Definicion de balanceo por pesos
    upstream backend_pool {
        server backend:3000 weight=3; # nodo principal, mas recursos asignados (CPU/RAM)
        server backend-1:3000 weight=2; # nodo secundario capicidad media
        server backend-2:3000 weight=1; # nodo de respaldo tiene menor capacidad, trafico minimo
    }

    server {
        listen 80;

        location /api/ {
            proxy_pass http://backend_pool/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}

# Prueba de redirección del tráfico por parte de  NGINX

for ($i=1; $i -le 10; $i++) { Invoke-RestMethod http://localhost/api/ping | ConvertTo-Json -Compress }

{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend-1"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend-2"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend-1"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend-1"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend"}
{"mensaje":"¡Hola desde el Backend de Inventario!","nodo":"backend-2"}
