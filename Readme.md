# VOLTIO — Inventario de PC Gamer

Aplicación web distribuida para gestión de inventario de componentes hardware. Proyecto final de la asignatura **Aplicaciones Distribuidas** (EPN, 2026-A).

Repositorio: [github.com/JuanL525/Proyecto-Inventario-AD](https://github.com/JuanL525/Proyecto-Inventario-AD)

## Descripción

Sistema full-stack containerizado con Docker Compose que permite administrar un catálogo de componentes PC y realizar compras simuladas. La infraestructura incluye tres réplicas del backend, balanceo de carga con NGINX y replicación MySQL maestro–esclavo.

### Roles de usuario

| Rol | Usuario | Contraseña | Permisos |
|-----|---------|------------|----------|
| Administrador | `admin` | `admin123` | CRUD de productos, consulta de stock |
| Cliente | `cliente` | `cliente123` | Catálogo, carrito, compras, historial |

## Arquitectura

```
Cliente (React/Vite)
        │
        ▼
   NGINX :80  (balanceo por pesos 3:2:1)
        │
   ┌────┼────┐
   ▼    ▼    ▼
backend  backend-1  backend-2  (Express/Node.js)
   │    │    │
   └────┼────┘
        ▼
   db-master (escrituras)
        │
   ┌────┴────┐
   ▼         ▼
db-slave1  db-slave2 (lecturas)
```

- **Escrituras** (INSERT, UPDATE, DELETE, compras): nodo maestro MySQL.
- **Lecturas** (login, listado de componentes): réplicas esclavas.
- **Balanceo**: pesos 3:2:1 sobre `backend`, `backend-1` y `backend-2` (~50 % / 33 % / 17 %).

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Base de datos | MySQL 8.0 |
| Balanceador | NGINX |
| Orquestación | Docker Compose |

## Requisitos

- Docker Desktop en ejecución
- Docker Compose v2
- Git
- Bash (Git Bash en Windows)

## Instalación

```bash
git clone https://github.com/JuanL525/Proyecto-Inventario-AD.git
cd Proyecto-Inventario-AD
bash setup-demo.sh
```

La primera ejecución puede tardar varios minutos (descarga de imágenes y compilación).

### Opciones del script

| Comando | Descripción |
|---------|-------------|
| `bash setup-demo.sh` | Build, despliegue, replicación y datos de demo |
| `bash setup-demo.sh --fresh` | Instalación limpia (elimina volúmenes) |
| `bash setup-demo.sh --skip-build` | Reinicia contenedores sin reconstruir |

El script `setup-demo.sh` realiza: creación de `frontend/.env`, levantamiento de contenedores, configuración de `repl_user`, carga del catálogo de demo, asignación de imágenes, sincronización de esclavos y verificación básica de servicios.

## Acceso

| Servicio | URL |
|----------|-----|
| Aplicación web | http://localhost:5173 |
| API (vía NGINX) | http://localhost/api |
| Healthcheck / balanceo | http://localhost/api/ping |

## Estructura del proyecto

```
proyecto-inventario-pc/
├── backend/           API REST (Express)
├── frontend/          Interfaz React (Vite)
├── nginx/             Configuración del balanceador
├── db/                Scripts SQL, seeds y replicación
├── docker-compose.yml Orquestación de servicios
├── setup-demo.sh      Despliegue automatizado
└── DEMO.md            Guía de demostración para defensa
```

## Servicios Docker

| Contenedor | Función | Puerto expuesto |
|------------|---------|-----------------|
| `app-frontend` | Interfaz React | 5173 |
| `app-nginx` | Balanceador de carga | 80 |
| `app-backend` | Backend principal (peso 3) | — |
| `app-backend-1` | Backend secundario (peso 2) | — |
| `app-backend-2` | Backend de respaldo (peso 1) | — |
| `db-master` | MySQL maestro | 3307 |
| `db-slave1` | MySQL esclavo 1 | 3308 |
| `db-slave2` | MySQL esclavo 2 | 3309 |

Red interna: `db-net`. Volúmenes persistentes: `master_data`, `slave1_data`, `slave2_data`.

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ping` | Identifica el nodo backend que atiende la petición |
| POST | `/api/login` | Autenticación por usuario y contraseña |
| GET | `/api/componentes` | Lista componentes (esclavo; `?fresh=true` lee del maestro) |
| POST | `/api/componentes` | Registra un componente |
| PUT | `/api/componentes/:id` | Actualiza un componente |
| DELETE | `/api/componentes/:id` | Elimina un componente |
| PUT | `/api/componentes/:id/stock` | Actualiza stock |
| POST | `/api/comprar` | Procesa compra con transacción y descuento de stock |

## Verificación

### Balanceo NGINX

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s http://localhost/api/ping
  echo
done
```

Deben responder distintos valores en el campo `nodo`: `backend`, `backend-1`, `backend-2`.

### Replicación MySQL

```bash
docker exec db-master mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave1 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave2 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
```

Estado de replicación:

```bash
docker exec db-slave1 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"
docker exec db-slave2 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"
```

Ambos deben mostrar `Yes` en IO y SQL.

## Mantenimiento

Reparar replicación si los esclavos se desincronizan:

```bash
bash db/fix-replication.sh
```

Detener el proyecto:

```bash
docker compose down
```

Eliminar contenedores y volúmenes:

```bash
docker compose down -v
```

Consultar logs:

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs db-master
```

## Documentación adicional

- `DEMO.md` — guía paso a paso para la demostración oral.
- Informe técnico del proyecto (entrega académica).
