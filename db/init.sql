CREATE DATABASE IF NOT EXISTS inventario_db;
USE inventario_db;

CREATE TABLE componentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_serie VARCHAR(50) UNIQUE NOT NULL, 
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    precio DECIMAL(10,2) NOT NULL
);