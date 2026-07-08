const express = require('express');
const cors = require('cors');
const { poolMaster, poolSlave } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function validarComponente(body) {
    const { codigo_serie, nombre, descripcion, unidad, categoria, stock, precio } = body;
    if (!codigo_serie || !nombre || !descripcion || !unidad || !categoria || stock === undefined || precio === undefined) {
        return 'Todos los campos son obligatorios';
    }
    if (Number(stock) < 0) return 'El stock no puede ser negativo';
    if (Number(precio) < 0) return 'El precio no puede ser negativo';
    return null;
}

app.get('/api/ping', (req, res) => {
    res.json({ mensaje: '¡Hola desde el Backend de Inventario!', nodo: process.env.HOSTNAME });
});

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
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/componentes', async (req, res) => {
    const pool = req.query.fresh === 'true' ? poolMaster : poolSlave;
    try {
        const [rows] = await pool.query('SELECT * FROM componentes ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/componentes', async (req, res) => {
    const errorValidacion = validarComponente(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    const { codigo_serie, nombre, descripcion, unidad, categoria, stock, precio } = req.body;

    try {
        const [result] = await poolMaster.query(
            'INSERT INTO componentes (codigo_serie, nombre, descripcion, unidad, categoria, stock, precio) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [codigo_serie, nombre, descripcion, unidad, categoria, stock, precio]
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

app.put('/api/componentes/:id', async (req, res) => {
    const errorValidacion = validarComponente(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    const { id } = req.params;
    const { codigo_serie, nombre, descripcion, unidad, categoria, stock, precio } = req.body;

    try {
        const [result] = await poolMaster.query(
            'UPDATE componentes SET codigo_serie = ?, nombre = ?, descripcion = ?, unidad = ?, categoria = ?, stock = ?, precio = ? WHERE id = ?',
            [codigo_serie, nombre, descripcion, unidad, categoria, stock, precio, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Componente no encontrado' });
        }

        res.json({ mensaje: 'Componente actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El código de serie ya existe en otro componente.' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el componente' });
    }
});

app.delete('/api/componentes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await poolMaster.query('DELETE FROM componentes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Componente no encontrado' });
        }

        res.json({ mensaje: 'Componente eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el componente' });
    }
});

app.put('/api/componentes/:id/stock', async (req, res) => {
    const { id } = req.params;
    const { nuevo_stock } = req.body;

    if (nuevo_stock === undefined || Number(nuevo_stock) < 0) {
        return res.status(400).json({ error: 'Stock inválido' });
    }

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

app.post('/api/comprar', async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const conn = await poolMaster.getConnection();

    try {
        await conn.beginTransaction();

        for (const item of items) {
            const cantidad = Number(item.cantidad);
            const id = Number(item.id);

            if (!id || !cantidad || cantidad < 1) {
                throw Object.assign(new Error('Cantidad inválida en el carrito'), { status: 400 });
            }

            const [rows] = await conn.query(
                'SELECT id, nombre, stock, precio FROM componentes WHERE id = ? FOR UPDATE',
                [id]
            );

            if (rows.length === 0) {
                throw Object.assign(new Error(`Componente #${id} no encontrado`), { status: 404 });
            }

            if (rows[0].stock < cantidad) {
                throw Object.assign(
                    new Error(`Stock insuficiente para "${rows[0].nombre}" (disponible: ${rows[0].stock})`),
                    { status: 400 }
                );
            }

            await conn.query(
                'UPDATE componentes SET stock = stock - ? WHERE id = ?',
                [cantidad, id]
            );
        }

        await conn.commit();
        res.json({ mensaje: 'Compra realizada exitosamente' });
    } catch (error) {
        await conn.rollback();
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error al procesar la compra' });
    } finally {
        conn.release();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de inventario corriendo en el puerto ${PORT}`);
});
