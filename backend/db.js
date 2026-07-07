const mysql = require('mysql2/promise');
require('dotenv').config();

// ESCRITURA (POST, PUT, DELETE) Apunta siempre al Maestro
const poolMaster = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'inventario_db',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// LECTURA (GET) Apunta al Esclavo asignado por Docker
const poolSlave = mysql.createPool({
    host: process.env.DB_SLAVE_HOST || process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'inventario_db',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = { poolMaster, poolSlave };