# Guía rápida — Demo y defensa

Script de un solo comando para levantar **todo** el proyecto (Docker, replicación, catálogo e imágenes).

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **en ejecución**
- Git
- Bash (Git Bash en Windows, terminal en Linux/Mac)

## Primera vez (compañeras / PC de la universidad)

```bash
git clone <URL-DEL-REPO>
cd proyecto-inventario-pc
bash setup-demo.sh
```

Espera 3–5 minutos la primera vez (descarga imágenes y compila).

Abre en el navegador: **http://localhost:5173**

## Credenciales

| Rol     | Usuario  | Contraseña   |
|---------|----------|--------------|
| Admin   | `admin`  | `admin123`   |
| Cliente | `cliente`| `cliente123` |

## Opciones del script

| Comando | Cuándo usarlo |
|---------|----------------|
| `bash setup-demo.sh` | Uso normal: build + up + replicación + datos |
| `bash setup-demo.sh --fresh` | Día de la defensa: borra volúmenes y empieza limpio |
| `bash setup-demo.sh --skip-build` | Solo reinicia contenedores (más rápido) |

## Qué hace `setup-demo.sh`

1. Crea `frontend/.env` si no existe
2. `docker compose up -d --build`
3. Crea usuario `repl_user` en MySQL
4. Carga 14 productos de demo (si el catálogo está vacío)
5. Asigna imágenes al catálogo
6. Sincroniza esclavos (`db/fix-replication.sh`)
7. Verifica API, frontend y replicación

## Demo sugerida para el jurado (5 min)

1. **Login cliente** → catálogo con imágenes, filtros, carrito
2. **Comprar** → modal de confirmación + historial "Mis compras"
3. **Login admin** → panel con métricas, CRUD con modal
4. **Replicación** (terminal):
   ```bash
   docker exec db-master mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
   docker exec db-slave1 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
   ```
5. **Balanceo NGINX**:
   ```bash
   for i in 1 2 3 4 5; do curl -s http://localhost/api/ping; echo; done
   ```
   Deben aparecer distintos nodos (`backend`, `backend-1`, `backend-2`).

## Si algo falla

```bash
docker compose ps
docker compose logs db-master
bash db/fix-replication.sh
bash setup-demo.sh --fresh
```

## Detener el proyecto

```bash
docker compose down
```

Para borrar también los datos:

```bash
docker compose down -v
```
