const express = require('express');
const cors = require('cors');
const pool = require('./db');

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

// Ruta base para que la DBA compruebe la base de datos (consultar disponibilidad)
app.get('/api/componentes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM componentes');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error conectando a la base de datos' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de inventario corriendo en el puerto ${PORT}`);
});