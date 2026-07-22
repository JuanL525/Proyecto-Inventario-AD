# Guión definitivo de defensa — VOLTIO

Documento de exposición oral para el proyecto final de **Aplicaciones Distribuidas** (EPN, 2026-A).

Repositorio: [github.com/JuanL525/Proyecto-Inventario-AD](https://github.com/JuanL525/Proyecto-Inventario-AD)

Duración total estimada: **10 a 12 minutos** + preguntas del jurado.

---

## Roles (según asignación del proyecto)

| Integrante | Rol en el proyecto | Responsabilidad en la defensa |
|------------|-------------------|-------------------------------|
| **Juan Lucero** | Full-Stack (Desarrollo Web) | Aplicación web, login, CRUD, carrito, compras, orquestación general |
| **Damaris López** | DBA (Base de Datos) | Replicación MySQL maestro–esclavo, verificación en tiempo real |
| **Katherine Sailema** | DevOps (NGINX) | Balanceo por pesos, pruebas de carga con Locust |

Cada integrante debe hablar en voz alta su bloque y poder responder preguntas de su área y del flujo general.

---

## Preparación el día de la defensa

### Antes de entrar al aula (15 min antes)

1. Abrir **Docker Desktop** y esperar a que esté completamente iniciado.
2. Abrir **Git Bash** en la raíz del proyecto.
3. Ejecutar:

```bash
bash setup-demo.sh
```

4. Verificar respuesta rápida:

```bash
curl -s http://localhost/api/ping
docker compose ps
```

5. Abrir en el navegador: http://localhost:5173
6. Tener abiertos en el IDE (pestañas listas, sin buscar en vivo):
   - `docker-compose.yml`
   - `nginx/nginx.conf`
   - `backend/db.js`
   - `backend/index.js`
   - `db/init.sql`
   - `db/master/my-master.cnf`
   - `db/slave1/my-slave1.cnf`
7. Tener **Canva en pantalla completa** con las 6 slides listas para cambiar manualmente.
8. Tener **esta terminal** con los comandos copiados en un bloc de notas por si falla el scroll.

### Credenciales

| Rol en la app | Usuario | Contraseña |
|---------------|---------|------------|
| Administrador | `admin` | `admin123` |
| Cliente | `cliente` | `cliente123` |

### Slides de Canva (orden de uso)

| # | Slide | Quién la usa |
|---|-------|--------------|
| 1 | Portada — VOLTIO | Juan (apertura) |
| 2 | Arquitectura | Juan (contexto) |
| 3 | Replicación MySQL maestro–esclavo | Damaris |
| 4 | Balanceo NGINX | Katherine |
| 5 | Pruebas de carga (Locust) | Katherine |
| 6 | Conclusiones | Juan (cierre, los 3 al final) |

---

## BLOQUE 0 — Apertura (Juan Lucero) · ~1 min

**Slide de fondo:** 1 — Portada

### Qué hacer

1. Los tres de pie o sentados frente al jurado.
2. Juan presenta al equipo y el proyecto.

### Qué decir (texto sugerido)

> "Buenos días/tardes. Somos Damaris López, Katherine Sailema y Juan Lucero. Presentamos **VOLTIO**, una aplicación web distribuida para gestión de inventario de componentes PC Gamer, desarrollada con Docker Compose, NGINX como balanceador de carga y MySQL con arquitectura maestro–esclavo. El repositorio está en GitHub y el informe técnico documenta arquitectura, configuración, pruebas de carga y conclusiones."

**Slide de fondo:** 2 — Arquitectura

### Qué decir (continúa Juan)

> "La arquitectura tiene cuatro capas: el frontend en React consume la API a través de NGINX en el puerto 80; NGINX distribuye el tráfico entre tres réplicas del backend Node.js con balanceo por pesos 3, 2 y 1; las escrituras van al MySQL maestro y las lecturas se distribuyen en dos esclavos. Todo corre containerizado en la red Docker `db-net`."

### Qué mostrar (opcional, 15 s)

Abrir `docker-compose.yml` y señalar sin leer todo:

- Líneas 4–58: servicios `db-master`, `db-slave1`, `db-slave2`
- Líneas 60–104: tres backends
- Líneas 106–118: `nginx`
- Líneas 135–137: red `db-net`

---

## BLOQUE 1 — Aplicación web (Juan Lucero) · ~3 min

**Slide de fondo:** mantener Arquitectura, o pantalla completa del navegador

### 1.1 Login y rol cliente (~1 min 15 s)

#### Qué hacer

1. Ir a http://localhost:5173
2. Login: `cliente` / `cliente123`
3. Mostrar el catálogo: imágenes, filtros por categoría, stock visible en cada tarjeta
4. Clic en un producto → **Agregar** al carrito
5. Abrir el carrito, confirmar compra
6. Mostrar modal de confirmación y luego **Mis compras**

#### Qué decir

> "Como cliente final, el usuario inicia sesión y consulta el catálogo con disponibilidad en tiempo real. Las lecturas del inventario se obtienen desde los nodos esclavos de MySQL, lo que reduce carga sobre el maestro. El cliente agrega productos al carrito, confirma la compra y el stock se descuenta en base de datos mediante una transacción en el endpoint `/api/comprar`."

#### Código a mostrar si preguntan (pestaña ya abierta)

**`backend/index.js`** — lecturas desde esclavo y compra con transacción:

```49:58:backend/index.js
app.get('/api/componentes', async (req, res) => {
    const pool = req.query.fresh === 'true' ? poolMaster : poolSlave;
    // ...
});
```

```154:197:backend/index.js
app.post('/api/comprar', async (req, res) => {
    // beginTransaction → FOR UPDATE → descuento stock → commit
});
```

**`backend/db.js`** — dos pools de conexión:

```4:24:backend/db.js
const poolMaster = mysql.createPool({ host: process.env.DB_HOST, ... });
const poolSlave = mysql.createPool({ host: process.env.DB_SLAVE_HOST, ... });
```

---

### 1.2 Rol administrador (~1 min 15 s)

#### Qué hacer

1. Clic en **Salir**
2. Login: `admin` / `admin123`
3. Mostrar panel con métricas (referencias, unidades, valor inventario)
4. Clic en **+ Nuevo componente**
5. Llenar formulario con código **nuevo** (ej. `DEMO-DEFENSA-001`) y publicar
6. Intentar crear otro producto con el **mismo código** → debe aparecer toast de error de duplicado

#### Qué decir

> "El administrador gestiona el CRUD completo. Al registrar un producto, la escritura va directamente al maestro MySQL. Si el código de serie ya existe, MySQL devuelve el error `ER_DUP_ENTRY` y el backend responde con un mensaje controlado al frontend, cumpliendo el requisito de validación de duplicados del enunciado."

#### Código a mostrar si preguntan

**`backend/index.js`** — validación de duplicados:

```68:77:backend/index.js
const [result] = await poolMaster.query('INSERT INTO componentes ...');
// ...
if (error.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ error: 'El código de serie ya existe...' });
}
```

**`db/init.sql`** — constraint UNIQUE en código de serie:

```4:14:db/init.sql
CREATE TABLE componentes (
    codigo_serie VARCHAR(50) UNIQUE NOT NULL,
    ...
);
```

**`frontend/.env.example`** — frontend apunta al balanceador, no a un solo nodo:

```
VITE_API_URL=http://localhost/api
```

> "El frontend no habla con un backend directo; todas las peticiones pasan por NGINX en el puerto 80."

---

### 1.3 Login (si preguntan)

**`backend/index.js`** líneas 25–46: login consulta usuarios desde `poolSlave` (lectura en esclavo).

**`db/init.sql`** líneas 16–25: tabla `usuarios` con roles `admin` y `final`.

---

## BLOQUE 2 — Replicación MySQL (Damaris López) · ~3 min

**Slide de fondo:** 3 — Replicación MySQL maestro–esclavo

### Qué decir (introducción)

> "Mi responsabilidad fue transformar la base de datos única en un clúster maestro–esclavo. El maestro recibe todas las escrituras con `log-bin` habilitado; los dos esclavos replican mediante `relay-log` en modo `read-only`. Si insertamos un producto desde la interfaz web, ese cambio debe aparecer automáticamente en ambos esclavos."

---

### 2.1 Mostrar configuración (~45 s)

#### Qué hacer

Abrir estos archivos en el IDE y señalar las líneas indicadas.

**`docker-compose.yml`** — maestro:

- Línea 8: `--server-id=1 --log-bin=mysql-bin --binlog-do-db=inventario_db`
- Líneas 26–41: `db-slave1` con `--server-id=2 --relay-log=relay-bin --read-only=1`
- Líneas 43–58: `db-slave2` con `--server-id=3`

**`db/master/my-master.cnf`:**

```1:4:db/master/my-master.cnf
[mysqld]
server-id=1
log_bin=mysql-bin
binlog_do_db=inventario_db
```

**`db/slave1/my-slave1.cnf`:**

```1:4:db/slave1/my-slave1.cnf
[mysqld]
server-id=2
relay-log=relay-bin
read_only=1
```

#### Qué decir

> "Cada nodo tiene un `server-id` único. El maestro activa el binary log para registrar cambios; los esclavos usan relay log y operan en solo lectura para evitar escrituras inconsistentes."

---

### 2.2 Verificar conteo igual en maestro y esclavos (~30 s)

#### Comando (Git Bash)

```bash
docker exec db-master mysql -uroot -proot inventario_db -e "SELECT COUNT(*) AS total FROM componentes;"
docker exec db-slave1 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) AS total FROM componentes;"
docker exec db-slave2 mysql -uroot -proot inventario_db -e "SELECT COUNT(*) AS total FROM componentes;"
```

#### Resultado esperado

Los tres números deben ser **iguales**.

#### Qué decir

> "Los tres nodos reportan el mismo conteo de productos, lo que confirma que los esclavos están sincronizados con el maestro."

---

### 2.3 Demostración en tiempo real (~1 min)

#### Qué hacer

1. Pedir a Juan (o hacerlo Damaris) que desde el admin cree un producto con código `REP-DEMO-001` (si ya existe, usar otro único).
2. Inmediatamente en terminal:

```bash
docker exec db-master mysql -uroot -proot inventario_db -e "SELECT codigo_serie, nombre, stock FROM componentes WHERE codigo_serie='REP-DEMO-001';"
docker exec db-slave1 mysql -uroot -proot inventario_db -e "SELECT codigo_serie, nombre, stock FROM componentes WHERE codigo_serie='REP-DEMO-001';"
docker exec db-slave2 mysql -uroot -proot inventario_db -e "SELECT codigo_serie, nombre, stock FROM componentes WHERE codigo_serie='REP-DEMO-001';"
```

#### Resultado esperado

La misma fila visible en maestro, slave1 y slave2.

#### Qué decir

> "Registramos el producto desde la interfaz, que escribe en el maestro. Al consultar los esclavos desde terminal, el registro ya está replicado. Esto cumple el requisito de verificación de replicación en tiempo real."

---

### 2.4 Estado de replicación (~45 s)

#### Comando

```bash
docker exec db-slave1 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master"
docker exec db-slave2 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master"
```

#### Resultado esperado

```
Slave_IO_Running: Yes
Slave_SQL_Running: Yes
Seconds_Behind_Master: 0
```

(en ambos esclavos)

#### Qué decir

> "Con `SHOW SLAVE STATUS` verificamos que el hilo IO y el hilo SQL están activos en ambos esclavos. Esta es la herramienta estándar de monitoreo de replicación MySQL."

#### Script de respaldo (mencionar, no ejecutar salvo emergencia)

> "Si los esclavos se desincronizan, tenemos el script `db/fix-replication.sh` que genera un dump del maestro, lo importa en los esclavos y reconfigura `CHANGE MASTER TO`."

---

## BLOQUE 3 — Balanceo NGINX (Katherine Sailema) · ~2 min 30 s

**Slide de fondo:** 4 — Balanceo

### Qué decir (introducción)

> "Mi responsabilidad fue multiplicar el backend en tres réplicas y configurar NGINX como balanceador de carga por pesos. El nodo principal recibe peso 3, el secundario peso 2 y el de respaldo peso 1, equivalente aproximado a 50, 33 y 17 por ciento del tráfico."

---

### 3.1 Mostrar configuración (~45 s)

#### Qué hacer

Abrir **`nginx/nginx.conf`** y señalar:

```6:10:nginx/nginx.conf
upstream backend_pool {
    server backend:3000 weight=3;
    server backend-1:3000 weight=2;
    server backend-2:3000 weight=1;
}
```

Abrir **`docker-compose.yml`** y señalar los tres servicios backend (líneas 60–104) y nginx (106–118).

Abrir **`backend/index.js`** líneas 21–23 — endpoint `/api/ping`:

```21:23:backend/index.js
app.get('/api/ping', (req, res) => {
    res.json({ mensaje: '...', nodo: process.env.HOSTNAME });
});
```

#### Qué decir

> "NGINX expone el puerto 80 y reenvía `/api/` al pool `backend_pool`. Cada backend tiene la variable `HOSTNAME` distinta, y `/api/ping` devuelve desde qué nodo responde. Esto nos permite verificar el balanceo sin adivinar."

---

### 3.2 Probar balanceo solo desde terminal (~1 min)

#### Opción A — Git Bash (recomendada)

10 peticiones:

```bash
for i in $(seq 1 10); do curl -s http://localhost/api/ping; echo; done
```

30 peticiones con conteo por nodo:

```bash
for i in $(seq 1 30); do curl -s http://localhost/api/ping | grep -o '"nodo":"[^"]*"' | cut -d'"' -f4; done | sort | uniq -c
```

#### Resultado esperado (aproximado)

```
 15 backend
 10 backend-1
  5 backend-2
```

(proporción ~50 % / 33 % / 17 %)

#### Opción B — PowerShell (Windows)

```powershell
for ($i=1; $i -le 10; $i++) { Invoke-RestMethod http://localhost/api/ping | ConvertTo-Json -Compress }
```

#### Qué decir mientras corre el comando

> "Enviamos múltiples peticiones al balanceador, no a un backend directo. NGINX distribuye según los pesos configurados. En 10 peticiones típicamente vemos 5 al nodo principal, 3 al secundario y 2 al de respaldo, respetando la proporción 3:2:1."

---

### 3.3 Tolerancia a fallos (opcional, 30 s — solo si hay tiempo)

#### Qué hacer

```bash
docker stop app-backend-2
for i in $(seq 1 6); do curl -s http://localhost/api/ping; echo; done
docker start app-backend-2
```

#### Qué decir

> "Si un nodo cae, NGINX deja de enviarle tráfico y las peticiones las atienden los nodos restantes. Esto aporta tolerancia a fallos."

---

## BLOQUE 4 — Pruebas de carga (Katherine Sailema) · ~1 min 30 s

**Slide de fondo:** 5 — Pruebas de carga (Locust)

### Qué decir

> "Para evaluar el desempeño bajo concurrencia usamos Locust, una herramienta de pruebas de carga en Python. Simulamos 20 usuarios virtuales durante aproximadamente 200 segundos, apuntando a `http://localhost`, es decir, al balanceador NGINX."

### Métricas a mencionar (del informe)

| Métrica | Valor |
|---------|-------|
| Total peticiones | 6 603 |
| Tasa de error | 0 % |
| Tiempo promedio de respuesta | 70,75 ms |
| Endpoints probados | `GET /api/ping`, `GET /api/componentes` |
| Usuarios concurrentes | 20 |

### Qué decir (análisis)

> "El sistema procesó más de seis mil peticiones sin errores. Hubo un pico de latencia al inicio por el arranque en frío de contenedores y conexiones a base de datos; después los tiempos se estabilizaron con mediana de 3 ms. Esto confirma que la arquitectura distribuida soporta carga concurrente de forma estable."

### Si preguntan cómo se ejecutó Locust

> "Locust se ejecutó en local apuntando al host `http://localhost`. Las peticiones pasaron por NGINX y se distribuyeron entre los tres backends. Los resultados y capturas están en el informe técnico."

(No es necesario ejecutar Locust en vivo durante la defensa.)

---

## BLOQUE 5 — Cierre (Juan Lucero, con apoyo de las 3) · ~1 min

**Slide de fondo:** 6 — Conclusiones

### Qué decir (Juan)

> "En conclusión: la aplicación cumple los requisitos funcionales — login con roles, CRUD, validación de duplicados, stock en tiempo real y compras con carrito."

### Qué decir (Katherine)

> "NGINX distribuyó el tráfico según pesos 3, 2 y 1, verificado con `/api/ping`, y las pruebas Locust confirmaron estabilidad bajo carga concurrente."

### Qué decir (Damaris)

> "La replicación MySQL sincronizó correctamente las escrituras del maestro hacia dos esclavos, verificado con consultas en terminal y `SHOW SLAVE STATUS`."

### Qué decir (Juan, cierre final)

> "El proyecto demuestra una arquitectura distribuida containerizada, escalable y confiable. Quedamos atentos a sus preguntas. Gracias."

---

## Plan B — Si algo falla en vivo

| Problema | Acción inmediata | Qué decir al jurado |
|----------|------------------|---------------------|
| Replicación con `No` | `bash db/fix-replication.sh` | "Tenemos un script de resincronización; lo ejecutamos ahora." |
| API no responde | `docker compose ps` + esperar 30 s | "Los contenedores están iniciando; el healthcheck del maestro retrasa el backend." |
| Frontend en blanco | Verificar `frontend/.env` existe | "El frontend apunta a `http://localhost/api` vía NGINX." |
| Balanceo muestra un solo nodo | Repetir curl 10 veces | "NGINX usa pesos, no round-robin estricto; en pocas peticiones puede repetir nodo." |
| Docker caído | Mostrar capturas del informe + Canva | "En condiciones normales la demo en vivo muestra lo siguiente..." |

Comando de emergencia completo:

```bash
bash setup-demo.sh --fresh
```

(Usar solo si hay tiempo; tarda 3–5 min.)

---

## Preguntas frecuentes del jurado — Respuestas por rol

### Para Juan (Full-Stack)

**¿Por qué el admin a veces ve datos más recientes que el cliente?**
> El admin puede pedir `?fresh=true` y leer del maestro; el cliente lee del esclavo. Tras una escritura, la replicación es casi inmediata pero conceptualmente son rutas distintas.

**¿Dónde se valida el duplicado?**
> En MySQL con `UNIQUE` en `codigo_serie` y en el backend capturando `ER_DUP_ENTRY`.

**¿El frontend a dónde apunta?**
> A `http://localhost/api`, que es NGINX, no a un puerto 3000 directo.

### Para Damaris (DBA)

**¿Por qué dos esclavos y no uno?**
> El mínimo del enunciado es uno; implementamos dos para mayor redundancia en lecturas y para distribuir carga entre `db-slave1` y `db-slave2` según el backend que atienda.

**¿Qué es `repl_user`?**
> Usuario MySQL con permiso `REPLICATION SLAVE`, creado por `setup-demo.sh`, usado por los esclavos para conectarse al maestro.

**¿Qué pasa si escribo directo en un esclavo?**
> Está en `read-only`; rechaza escrituras. Todo INSERT/UPDATE va al maestro.

### Para Katherine (DevOps)

**¿Por qué pesos 3:2:1 y no round-robin?**
> El enunciado exige balanceo por pesos. Simula nodos con distinta capacidad: el principal recibe más tráfico porque está acoplado al esclavo con mayor concurrencia de lecturas.

**¿Cómo saben qué nodo respondió?**
> `/api/ping` devuelve `process.env.HOSTNAME`, configurado en `docker-compose.yml` como `backend`, `backend-1` o `backend-2`.

**¿Qué herramienta usaron para pruebas de carga?**
> Locust: 20 usuarios, 6603 peticiones, 0 % errores, documentado en el informe.

---

## Checklist final (5 min antes de presentar)

- [ ] Docker Desktop corriendo
- [ ] `bash setup-demo.sh` terminó sin errores
- [ ] http://localhost:5173 carga
- [ ] `curl http://localhost/api/ping` responde JSON
- [ ] Conteos iguales en maestro y esclavos
- [ ] Canva en slide 1, listo para avanzar
- [ ] IDE con pestañas abiertas (compose, nginx, db.js, index.js)
- [ ] Terminal Git Bash lista con comandos
- [ ] Los 3 integrantes saben cuándo habla cada uno

---

## Referencia rápida de comandos (copiar/pegar)

```bash
# Estado de contenedores
docker compose ps

# Balanceo — 10 peticiones
for i in $(seq 1 10); do curl -s http://localhost/api/ping; echo; done

# Balanceo — conteo por nodo (30 peticiones)
for i in $(seq 1 30); do curl -s http://localhost/api/ping | grep -o '"nodo":"[^"]*"' | cut -d'"' -f4; done | sort | uniq -c

# Replicación — conteos
docker exec db-master mysql -uroot -proot inventario_db -N -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave1 mysql -uroot -proot inventario_db -N -e "SELECT COUNT(*) FROM componentes;"
docker exec db-slave2 mysql -uroot -proot inventario_db -N -e "SELECT COUNT(*) FROM componentes;"

# Replicación — estado
docker exec db-slave1 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"
docker exec db-slave2 mysql -uroot -proot -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running"

# Reparar replicación
bash db/fix-replication.sh
```
