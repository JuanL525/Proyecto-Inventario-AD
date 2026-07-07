import { useState, useEffect, useCallback } from 'react';
import './App.css';

const FORM_VACIO = {
  codigo_serie: '', nombre: '', descripcion: '', unidad: 'unidad',
  categoria: '', stock: 0, precio: 0
};

function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(() => {
    const guardado = localStorage.getItem('usuario');
    if (!guardado) return null;
    try {
      return JSON.parse(guardado);
    } catch {
      localStorage.removeItem('usuario');
      return null;
    }
  });
  const [componentes, setComponentes] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [form, setForm] = useState({ ...FORM_VACIO });
  const [editandoId, setEditandoId] = useState(null);
  const [carrito, setCarrito] = useState(() => {
    const guardado = localStorage.getItem('carrito');
    if (!guardado) return [];
    try {
      return JSON.parse(guardado);
    } catch {
      return [];
    }
  });

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  const fetchComponentes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/componentes`);
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setComponentes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setComponentes([]);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (usuarioActivo) {
      fetchComponentes();
    }
  }, [usuarioActivo, fetchComponentes]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ ...FORM_VACIO });
    setEditandoId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    const url = editandoId ? `${apiUrl}/componentes/${editandoId}` : `${apiUrl}/componentes`;
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ texto: data.error || 'Error al guardar', tipo: 'error' });
        return;
      }
      setMensaje({ texto: data.mensaje, tipo: 'exito' });
      resetForm();
      fetchComponentes();
    } catch {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  const handleEditar = (comp) => {
    setEditandoId(comp.id);
    setForm({
      codigo_serie: comp.codigo_serie || '',
      nombre: comp.nombre || '',
      descripcion: comp.descripcion || '',
      unidad: comp.unidad || 'unidad',
      categoria: comp.categoria || '',
      stock: comp.stock ?? 0,
      precio: comp.precio ?? 0
    });
    setMensaje({ texto: '', tipo: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este componente?')) return;

    try {
      const res = await fetch(`${apiUrl}/componentes/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ texto: data.error || 'Error al eliminar', tipo: 'error' });
        return;
      }
      setMensaje({ texto: data.mensaje, tipo: 'exito' });
      if (editandoId === id) resetForm();
      fetchComponentes();
    } catch {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  const agregarAlCarrito = (comp) => {
    if ((comp.stock ?? 0) < 1) {
      setMensaje({ texto: 'Sin stock disponible', tipo: 'error' });
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === comp.id);
      if (existente) {
        if (existente.cantidad >= comp.stock) {
          setMensaje({ texto: 'No hay más stock disponible', tipo: 'error' });
          return prev;
        }
        return prev.map((item) =>
          item.id === comp.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, {
        id: comp.id,
        nombre: comp.nombre,
        precio: comp.precio,
        stock: comp.stock,
        cantidad: 1
      }];
    });
    setMensaje({ texto: `"${comp.nombre}" agregado al carrito`, tipo: 'exito' });
  };

  const actualizarCantidadCarrito = (id, cantidad) => {
    const nuevaCantidad = Number(cantidad);
    if (nuevaCantidad < 1) {
      setCarrito((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const max = item.stock ?? 0;
        return { ...item, cantidad: Math.min(nuevaCantidad, max) };
      })
    );
  };

  const quitarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCarrito = carrito.reduce(
    (sum, item) => sum + Number(item.precio) * item.cantidad, 0
  );

  const handleComprar = async () => {
    if (carrito.length === 0) {
      setMensaje({ texto: 'El carrito está vacío', tipo: 'error' });
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/comprar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: carrito.map(({ id, cantidad }) => ({ id, cantidad }))
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje({ texto: data.error || 'Error en la compra', tipo: 'error' });
        return;
      }
      setMensaje({ texto: data.mensaje, tipo: 'exito' });
      setCarrito([]);
      fetchComponentes();
    } catch {
      setMensaje({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Credenciales inválidas');
        return;
      }
      setUsuarioActivo(data.usuario);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setLoginForm({ username: '', password: '' });
      setCarrito([]);
    } catch {
      setLoginError('Error conectando al servidor');
    }
  };

  const handleLogout = () => {
    setUsuarioActivo(null);
    setComponentes([]);
    setCarrito([]);
    localStorage.removeItem('usuario');
    localStorage.removeItem('carrito');
    resetForm();
  };

  if (!usuarioActivo) {
    return (
      <div className="container login-container">
        <div className="form-container login-form">
          <h1>Acceso al Sistema</h1>
          <p className="login-subtitle">Sistema de Inventario Distribuido</p>
          {loginError && <div className="alerta error">{loginError}</div>}
          <form onSubmit={handleLogin} className="login-fields">
            <input type="text" name="username" placeholder="Usuario (admin o cliente)" value={loginForm.username} onChange={handleLoginChange} required />
            <input type="password" name="password" placeholder="Contraseña" value={loginForm.password} onChange={handleLoginChange} required autoComplete="current-password" />
            <button type="submit">Iniciar Sesión</button>
          </form>
          <p className="login-hint">Admin: admin / admin123 · Cliente: cliente / cliente123</p>
        </div>
      </div>
    );
  }

  const esAdmin = usuarioActivo.rol === 'admin';
  const esFinal = usuarioActivo.rol === 'final';

  return (
    <div className="container">
      <div className="header-bar">
        <div>
          <h1 style={{ margin: 0 }}>{esAdmin ? 'Inventario de PC Gamer' : 'Catálogo de Componentes'}</h1>
          <p className="user-badge">{usuarioActivo.username} · {usuarioActivo.rol}</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">Cerrar Sesión</button>
      </div>

      {mensaje.texto && !esAdmin && (
        <div className={`alerta ${mensaje.tipo} alerta-flotante`}>{mensaje.texto}</div>
      )}

      {esAdmin && (
        <div className="form-container">
          <h2>{editandoId ? 'Editar Componente' : 'Registrar Hardware'}</h2>
          {mensaje.texto && <div className={`alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}
          <form onSubmit={handleSubmit}>
            <input type="text" name="codigo_serie" placeholder="Código de Serie" value={form.codigo_serie} onChange={handleChange} required />
            <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required />
            <input type="text" name="categoria" placeholder="Categoría" value={form.categoria} onChange={handleChange} required />
            <input type="text" name="unidad" placeholder="Unidad (ej: unidad, caja)" value={form.unidad} onChange={handleChange} required />
            <input type="number" name="stock" placeholder="Stock" value={form.stock} onChange={handleChange} required min="0" />
            <input type="number" name="precio" placeholder="Precio ($)" value={form.precio} onChange={handleChange} required step="0.01" min="0" />
            <textarea name="descripcion" className="full-width" placeholder="Descripción" value={form.descripcion} onChange={handleChange} required rows="3" />
            <div className="form-actions">
              {editandoId && (
                <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
              )}
              <button type="submit">{editandoId ? 'Actualizar' : 'Guardar Componente'}</button>
            </div>
          </form>
        </div>
      )}

      {esFinal && carrito.length > 0 && (
        <div className="form-container carrito-container">
          <div className="table-header">
            <h2>Carrito ({carrito.length})</h2>
            <span className="carrito-total">Total: ${totalCarrito.toFixed(2)}</span>
          </div>
          <ul className="carrito-lista">
            {carrito.map((item) => (
              <li key={item.id} className="carrito-item">
                <span className="carrito-nombre">{item.nombre}</span>
                <input
                  type="number"
                  className="carrito-cantidad"
                  min="1"
                  max={item.stock}
                  value={item.cantidad}
                  onChange={(e) => actualizarCantidadCarrito(item.id, e.target.value)}
                />
                <span className="carrito-subtotal">${(item.precio * item.cantidad).toFixed(2)}</span>
                <button type="button" className="btn-sm btn-delete" onClick={() => quitarDelCarrito(item.id)}>✕</button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={handleComprar} className="btn-comprar">Confirmar Compra</button>
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <h2>{esAdmin ? 'Stock Actual' : 'Disponibilidad en Tiempo Real'}</h2>
          <button onClick={fetchComponentes} className="btn-secondary btn-sm">Actualizar</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Precio</th>
              {(esAdmin || esFinal) && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {componentes.length > 0 ? (
              componentes.map((comp, index) => (
                <tr key={comp.id || `comp-${index}`}>
                  <td>{comp.codigo_serie || 'N/A'}</td>
                  <td>{comp.nombre || 'N/A'}</td>
                  <td className="desc-cell">{comp.descripcion || '—'}</td>
                  <td>{comp.unidad || 'unidad'}</td>
                  <td>{comp.categoria || 'N/A'}</td>
                  <td className={comp.stock > 0 ? 'stock-ok' : 'stock-agotado'}>
                    {comp.stock ?? 0}
                  </td>
                  <td>${Number(comp.precio ?? 0).toFixed(2)}</td>
                  {esAdmin && (
                    <td className="actions-cell">
                      <button type="button" className="btn-sm btn-edit" onClick={() => handleEditar(comp)}>Editar</button>
                      <button type="button" className="btn-sm btn-delete" onClick={() => handleEliminar(comp.id)}>Eliminar</button>
                    </td>
                  )}
                  {esFinal && (
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="btn-sm btn-cart"
                        onClick={() => agregarAlCarrito(comp)}
                        disabled={(comp.stock ?? 0) < 1}
                      >
                        {(comp.stock ?? 0) < 1 ? 'Agotado' : 'Al carrito'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="empty-row">No hay componentes registrados o cargando...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
