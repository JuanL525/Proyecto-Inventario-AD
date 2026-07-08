-- Fase 1: campo imagen. Ejecutar SOLO en db-master (la replicación propaga el cambio):
-- Get-Content db/migrate-imagen.sql -Raw | docker exec -i db-master mysql -uroot -proot inventario_db

USE inventario_db;

ALTER TABLE componentes ADD COLUMN imagen_url VARCHAR(500) DEFAULT NULL AFTER precio;
