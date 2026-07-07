const express = require('express');
const cors = require('cors');
const { poolMaster, poolSlave } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba para que DevOps verifique NGINX
app.get('/api/ping', (req, res) => {
    // Si DevOps configura 3 nodos, podrá ver qué nodo respondió
    res.json({ mensaje: '¡Hola desde el Backend de Inventario!', nodo: process.env.HOSTNAME });
});

// Ruta de prueba para que DevOps verifique NGINX
app.get('/api/ping', (req, res) => {
    res.json({ mensaje: '¡Hola desde el Backend de Inventario!', nodo: process.env.HOSTNAME });
});

// Validación de Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    try {
        const [rows] = await poolSlave.query(
            'SELECT id, username, rol FROM usuarios WHERE username = ? AND password = ?',
            [username, password]
        );

        if (rows.length > 0) {
            res.json({ mensaje: 'Login exitoso', usuario: rows[0] });
        } else {
            res.status(401).json({ error: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta base para que la DBA compruebe la base de datos (consultar disponibilidad)
app.get('/api/componentes', async (req, res) => {
    try {
        const [rows] = await poolSlave.query('SELECT * FROM componentes');
        res.json(rows);
    } catch (error) {
        console.log("--- ERROR DETALLADO ---");
        console.error(error); 
        res.status(500).json({ error: error.message }); // Enviamos el error al front para verlo en consola
    }
});

// Ruta para registrar un nuevo componente (CUMPLIENDO LA RÚBRICA: Validación de duplicados)
app.post('/api/componentes', async (req, res) => {
    // Extraemos los datos que nos enviará el Frontend en React
    const { codigo_serie, nombre, categoria, stock, precio } = req.body;

    // Validación básica para que no envíen campos vacíos
    if (!codigo_serie || !nombre || !categoria || stock === undefined || !precio) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const [result] = await poolMaster.query(
            'INSERT INTO componentes (codigo_serie, nombre, categoria, stock, precio) VALUES (?, ?, ?, ?, ?)',
            [codigo_serie, nombre, categoria, stock, precio]
        );
        res.status(201).json({ id: result.insertId, mensaje: 'Componente registrado exitosamente' });
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El código de serie ya existe. No se permiten componentes duplicados.' });
        }
        
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al registrar el componente' });
    }
});

// Ruta para actualizar el stock
app.put('/api/componentes/:id/stock', async (req, res) => {
    const { id } = req.params;
    const { nuevo_stock } = req.body;

    try {
        const [result] = await poolMaster.query(
            'UPDATE componentes SET stock = ? WHERE id = ?',
            [nuevo_stock, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Componente no encontrado' });
        }

        res.json({ mensaje: 'Stock actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el stock' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de inventario corriendo en el puerto ${PORT}`);
});