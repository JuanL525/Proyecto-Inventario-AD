CREATE DATABASE IF NOT EXISTS inventario_db;
USE inventario_db;

CREATE TABLE componentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_serie VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(30) NOT NULL DEFAULT 'unidad',
    categoria VARCHAR(50) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    precio DECIMAL(10,2) NOT NULL
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    rol ENUM('admin', 'final') NOT NULL DEFAULT 'admin'
);

INSERT INTO usuarios (username, password, rol) VALUES
    ('admin', 'admin123', 'admin'),
    ('cliente', 'cliente123', 'final');
