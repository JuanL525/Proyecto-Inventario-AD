-- Migración para BD existente. Ejecutar en db-master:
-- Get-Content db/migrate.sql -Raw | docker exec -i db-master mysql -uroot -proot inventario_db

USE inventario_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    rol ENUM('admin', 'final') NOT NULL DEFAULT 'admin'
);

INSERT IGNORE INTO usuarios (username, password, rol) VALUES
    ('admin', 'admin123', 'admin'),
    ('cliente', 'cliente123', 'final');

ALTER TABLE componentes ADD COLUMN descripcion TEXT NULL AFTER nombre;
UPDATE componentes SET descripcion = nombre WHERE descripcion IS NULL;
ALTER TABLE componentes MODIFY descripcion TEXT NOT NULL;

ALTER TABLE componentes ADD COLUMN unidad VARCHAR(30) NOT NULL DEFAULT 'unidad' AFTER descripcion;
