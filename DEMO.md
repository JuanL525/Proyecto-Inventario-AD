# Guía de demostración — VOLTIO

Guía para la exposición oral y la defensa del proyecto. Para instalación, arquitectura y referencia técnica, consultar `Readme.md`.

Repositorio: [github.com/JuanL525/Proyecto-Inventario-AD](https://github.com/JuanL525/Proyecto-Inventario-AD)

## Antes del día de la defensa

1. Verificar que Docker Desktop esté en ejecución.
2. Clonar el repositorio o actualizar la rama principal.
3. Ejecutar una instalación limpia y comprobar que todo responde:

```bash
bash setup-demo.sh --fresh
```

4. Abrir http://localhost:5173 y confirmar login con ambos roles.
5. Tener una terminal lista para los comandos de balanceo y replicación.

Tiempo estimado de la primera ejecución: 3 a 5 minutos.

## Credenciales

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador | `admin` | `admin123` |
| Cliente | `cliente` | `cliente123` |

## Guión sugerido (5 a 8 minutos)

### 1. Contexto (30 s)

Presentar VOLTIO como aplicación distribuida de inventario PC: React en el cliente, tres réplicas de backend detrás de NGINX, MySQL maestro con dos esclavos, todo orquestado con Docker Compose.

### 2. Rol cliente (1,5 min)

1. Iniciar sesión como `cliente`.
2. Mostrar el catálogo con imágenes, filtros por categoría y stock en tiempo real.
3. Agregar un producto al carrito y confirmar la compra.
4. Abrir "Mis compras" y mostrar el historial del pedido.

Punto clave: el stock se descuenta en base de datos al confirmar la compra.

### 3. Rol administrador (1,5 min)

1. Cerrar sesión e ingresar como `admin`.
2. Mostrar el panel con métricas del inventario.
3. Crear o editar un componente desde el modal.
4. Intentar registrar un código de serie duplicado para demostrar la validación.

Punto clave: las escrituras van al maestro y el admin puede forzar lectura fresca con `?fresh=true`.

### 4. Replicación MySQL (1 min)

En terminal, comparar el conteo de productos entre maestro y esclavos:

```bash
docker exec db-master mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave1 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave2 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) FROM componentes;"
```

Opcional: insertar un producto desde la interfaz admin y repetir el SELECT en un esclavo para mostrar sincronización en tiempo real.

Verificar estado de replicación:

```bash
docker exec db-slave1 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"
docker exec db-slave2 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"
```

Ambos deben reportar `Yes` en IO y SQL.

### 5. Balanceo NGINX (1 min)

Enviar peticiones al endpoint de identificación de nodo:

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s http://localhost/api/ping
  echo
done
```

Explicar que NGINX distribuye según pesos 3:2:1 (~50 % / 33 % / 17 %) entre `backend`, `backend-1` y `backend-2`.

### 6. Pruebas de carga (30 s)

Mencionar las pruebas con Locust documentadas en el informe: 20 usuarios concurrentes, 6603 peticiones, 0 % de errores, tiempo promedio de 70,75 ms.

### 7. Cierre (30 s)

Resumir conclusiones: requisitos funcionales cumplidos, balanceo proporcional verificado, replicación operativa, sistema estable bajo carga concurrente.

## Distribución sugerida entre integrantes

| Integrante | Tema principal |
|------------|----------------|
| 1 | Arquitectura, Docker Compose, replicación |
| 2 | Aplicación web, roles admin y cliente |
| 3 | NGINX, balanceo por pesos, pruebas Locust |

Cada integrante debe poder responder preguntas sobre su sección y sobre el funcionamiento general del sistema.

## Comandos de respaldo

Si la replicación falla:

```bash
bash db/fix-replication.sh
```

Si un servicio no responde:

```bash
docker compose ps
docker compose logs db-master
docker compose logs nginx
bash setup-demo.sh --fresh
```

## Detener el entorno

```bash
docker compose down
```

Para eliminar también los datos persistidos:

```bash
docker compose down -v
```
