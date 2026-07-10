-- Catálogo de demo (ejecutar en db-master). Usa INSERT IGNORE para no duplicar SKUs.
USE inventario_db;

INSERT IGNORE INTO componentes (codigo_serie, nombre, descripcion, unidad, categoria, stock, precio) VALUES
('CPU-I7-001', 'Intel Core i7-13700K', '16 nucleos, 24 hilos, hasta 5.4 GHz. Ideal para gaming y productividad.', 'unidad', 'Procesador', 12, 389.99),
('CPU-R5-002', 'AMD Ryzen 5 7600X', '6 nucleos Zen 4, excelente rendimiento precio en builds AM5.', 'unidad', 'Procesador', 18, 229.99),
('GPU-4080', 'NVIDIA RTX 4080 Super', '16 GB GDDR6X, ray tracing de ultima generacion.', 'unidad', 'Tarjeta Grafica', 8, 999.99),
('GPU-7800', 'AMD RX 7800 XT', '16 GB GDDR6, gran opcion 1440p/4K con FSR.', 'unidad', 'Tarjeta Grafica', 10, 499.99),
('RAM-32G', 'Corsair Vengeance 32GB DDR5', 'Kit 2x16 GB DDR5-5600 CL36, perfil XMP incluido.', 'kit', 'Memoria RAM', 25, 129.99),
('RAM-16G', 'Kingston Fury 16GB DDR4', 'Kit 2x8 GB DDR4-3200, compatible con la mayoria de placas.', 'kit', 'Memoria RAM', 30, 54.99),
('SSD-1TB', 'Samsung 990 Pro 1TB NVMe', 'PCIe 4.0, hasta 7450 MB/s lectura. Ideal sistema y juegos.', 'unidad', 'Almacenamiento', 22, 119.99),
('SSD-500', 'WD Blue SN580 500GB', 'NVMe PCIe 4.0 entry-level, buen almacenamiento secundario.', 'unidad', 'Almacenamiento', 35, 54.99),
('MB-B650', 'ASUS TUF Gaming B650-Plus', 'Placa AM5, PCIe 4.0, WiFi 6, VRM robusto para Ryzen.', 'unidad', 'Placa Base', 15, 189.99),
('MB-Z790', 'MSI MAG Z790 Tomahawk', 'Placa Intel LGA1700, DDR5, ideal para Core 13th/14th gen.', 'unidad', 'Placa Base', 11, 259.99),
('PSU-850', 'EVGA SuperNOVA 850W Gold', 'Fuente modular 80 Plus Gold, silenciosa y eficiente.', 'unidad', 'Fuente de Poder', 14, 129.99),
('PSU-650', 'Thermaltake Smart 650W', 'Fuente 80 Plus, suficiente para builds intermedias.', 'unidad', 'Fuente de Poder', 20, 69.99),
('CASE-M1', 'NZXT H5 Flow', 'Gabinete ATX mid-tower con flujo de aire optimizado.', 'unidad', 'Gabinete', 14, 94.99),
('COOL-AIO', 'Cooler Master ML240L', 'Refrigeracion liquida 240mm ARGB, soporte Intel/AMD.', 'unidad', 'Refrigeracion', 20, 89.99);
