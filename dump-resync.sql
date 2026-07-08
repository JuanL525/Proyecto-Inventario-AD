-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: inventario_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Position to start replication or point-in-time recovery from
--

-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000004', MASTER_LOG_POS=761;

--
-- Current Database: `inventario_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `inventario_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `inventario_db`;

--
-- Table structure for table `componentes`
--

DROP TABLE IF EXISTS `componentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `componentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo_serie` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text NOT NULL,
  `unidad` varchar(30) NOT NULL DEFAULT 'unidad',
  `categoria` varchar(50) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `precio` decimal(10,2) NOT NULL,
  `imagen_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_serie` (`codigo_serie`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `componentes`
--

LOCK TABLES `componentes` WRITE;
/*!40000 ALTER TABLE `componentes` DISABLE KEYS */;
INSERT INTO `componentes` VALUES (1,'CPU-I7-001','Intel Core i7-13700K','Procesador 16 nucleos, 24 hilos, ideal para gaming y edicion','unidad','Procesador',12,389.99,NULL),(2,'CPU-R5-002','AMD Ryzen 5 7600X','Procesador 6 nucleos AM5, excelente rendimiento precio','unidad','Procesador',18,229.99,NULL),(3,'GPU-4080','NVIDIA RTX 4080 Super','Tarjeta grafica 16GB GDDR6X, ray tracing de alta gama','unidad','Tarjeta Grafica',5,1099.99,NULL),(4,'GPU-7800','AMD RX 7800 XT','Tarjeta grafica 16GB, gran rendimiento en 1440p','unidad','Tarjeta Grafica',8,499.99,NULL),(5,'RAM-32G','Corsair Vengeance 32GB DDR5','Kit 2x16GB DDR5 6000MHz CL36','kit','Memoria RAM',25,129.99,NULL),(6,'RAM-16G','Kingston Fury 16GB DDR4','Modulo 16GB DDR4 3200MHz para equipos de entrada','modulo','Memoria RAM',40,49.99,NULL),(7,'SSD-1TB','Samsung 990 Pro 1TB NVMe','SSD M.2 PCIe 4.0, lectura hasta 7450 MB/s','unidad','Almacenamiento',30,109.99,NULL),(8,'SSD-500','WD Blue SN580 500GB','SSD NVMe de entrada, ideal para sistema operativo','unidad','Almacenamiento',35,54.99,NULL),(9,'MB-B650','ASUS TUF Gaming B650-Plus','Placa base AM5, PCIe 4.0, WiFi 6 integrado','unidad','Placa Base',10,189.99,NULL),(10,'MB-Z790','MSI MAG Z790 Tomahawk','Placa base Intel LGA1700, DDR5, USB 3.2','unidad','Placa Base',7,279.99,NULL),(11,'PSU-850','EVGA SuperNOVA 850W Gold','Fuente modular 80 Plus Gold, ATX 3.0','unidad','Fuente de Poder',15,129.99,NULL),(12,'PSU-650','Thermaltake Smart 650W','Fuente 80 Plus, suficiente para equipos medios','unidad','Fuente de Poder',22,69.99,NULL),(13,'CASE-M1','NZXT H5 Flow','Gabinete ATX mid-tower con flujo de aire optimizado','unidad','Gabinete',14,94.99,NULL),(14,'COOL-AIO','Cooler Master ML240L','Refrigeracion liquida 240mm ARGB','unidad','Refrigeracion',20,89.99,'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400');
/*!40000 ALTER TABLE `componentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `rol` varchar(20) NOT NULL DEFAULT 'admin',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin','admin123','admin'),(3,'cliente','cliente123','final');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'inventario_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-08 15:53:37
