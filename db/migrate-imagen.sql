USE inventario_db;

ALTER TABLE componentes ADD COLUMN imagen_url VARCHAR(500) DEFAULT NULL AFTER precio;
