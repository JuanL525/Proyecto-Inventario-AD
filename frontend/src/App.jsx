import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [componentes, setComponentes] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [form, setForm] = useState({
    codigo_serie: '',
    nombre: '',
    categoria: '',
    stock: 0,
    precio: 0
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchComponentes();
  }, []);

  const fetchComponentes = async () => {
    try {
      const res = await fetch(`${apiUrl}/componentes`);
      if (!res.ok) throw new Error('Error en el servidor'); // Lanza error si 500
      const data = await res.json();
      setComponentes(Array.isArray(data) ? data : []); // Asegura que siempre sea array
    } catch (error) {
      console.error('Error al cargar componentes:', error);
      setComponentes([]); // Si falla, queda vacío en lugar de romper
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    try {
      const res = await fetch(`${apiUrl}/componentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje({ texto: data.error, tipo: 'error' });
        return;
      }

      setMensaje({ texto: data.mensaje, tipo: 'exito' });
      setForm({ codigo_serie: '', nombre: '', categoria: '', stock: 0, precio: 0 }); // Limpiar formulario
      fetchComponentes(); 
    } catch (error) {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  return (
    <div className="container">
      <h1>Inventario de PC Gamer</h1>

      <div className="form-container">
        <h2>Registrar Hardware</h2>
        {mensaje.texto && (
          <div className={`alerta ${mensaje.tipo}`}>{mensaje.texto}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input type="text" name="codigo_serie" placeholder="Código de Serie (ej. RTX3060-001)" value={form.codigo_serie} onChange={handleChange} required />
          <input type="text" name="nombre" placeholder="Nombre (ej. Tarjeta Gráfica RTX 3060)" value={form.nombre} onChange={handleChange} required />
          <input type="text" name="categoria" placeholder="Categoría (ej. GPU, RAM, CPU)" value={form.categoria} onChange={handleChange} required />
          <input type="number" name="stock" placeholder="Stock" value={form.stock} onChange={handleChange} required min="0" />
          <input type="number" name="precio" placeholder="Precio ($)" value={form.precio} onChange={handleChange} required step="0.01" />
          <button type="submit">Guardar Componente</button>
        </form>
      </div>

      <div className="table-container">
        <h2>Stock Actual</h2>
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {componentes.map((comp) => (
              <tr key={comp.id}>
                <td>{comp.codigo_serie}</td>
                <td>{comp.nombre}</td>
                <td>{comp.categoria}</td>
                <td>{comp.stock}</td>
                <td>${comp.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;