import { useState, useEffect, useCallback } from 'react';
import './App.css';

const FORM_VACIO = {
  codigo_serie: '', nombre: '', descripcion: '', unidad: 'unidad',
  categoria: '', stock: 0, precio: 0
};

const TILE_COLORS = ['tile-lavender', 'tile-mint', 'tile-peach', 'tile-sky', 'tile-butter'];

const animDelay = (i, step = 0.07, max = 0.55) => ({ animationDelay: `${Math.min(i * step, max)}s` });

function getStockInfo(stock) {
  const s = Number(stock) || 0;
  if (s <= 0) return { bar: 'low', label: 'low', text: 'Agotado', width: '6%' };
  if (s <= 5) return { bar: 'warn', label: 'warn', text: `${s} disponibles`, width: `${Math.min(100, s * 12)}%` };
  return { bar: 'ok', label: 'ok', text: `${s} disponibles`, width: `${Math.min(100, 25 + s * 2)}%` };
}

const IconSearch = () => (
  <svg className="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);

const IconCart = ({ size = 18 }) => (
  <svg className="icon" style={{ width: size, height: size }} viewBox="0 0 24 24">
    <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6" />
  </svg>
);

const IconClose = () => (
  <svg className="icon" style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconTrash = () => (
  <svg className="icon" style={{ width: 15, height: 15 }} viewBox="0 0 24 24">
    <path d="M4 6h16" /><path d="M9 6V4h6v2" /><path d="M6 6l1 14h10l1-14" />
  </svg>
);

const IconChevron = ({ open }) => (
  <svg className={`icon chevron${open ? ' open' : ''}`} viewBox="0 0 24 24">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconProduct = () => (
  <svg className="icon icon-big" viewBox="0 0 24 24" strokeWidth="1.5">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M7 14h.01M12 10h6M12 14h4" />
  </svg>
);

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
  const [formAbierto, setFormAbierto] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  const fetchComponentes = useCallback(async (fresh = false) => {
    try {
      const url = fresh ? `${apiUrl}/componentes?fresh=true` : `${apiUrl}/componentes`;
      const res = await fetch(url);
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
    setFormAbierto(false);
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
      fetchComponentes(true);
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
    setFormAbierto(true);
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
      setComponentes((prev) => prev.filter((c) => c.id !== id));
      fetchComponentes(true);
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
    setDrawerAbierto(true);
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

  const totalUnidadesCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);

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
      setDrawerAbierto(false);
      fetchComponentes(true);
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
    setDrawerAbierto(false);
    setBusqueda('');
    setCategoriaFiltro('Todas');
  };

  if (!usuarioActivo) {
    return (
      <div className="login-shell anim-page-in">
        <div className="login-brand anim-brand-in">
          <div className="blob blob-float" style={{ width: 280, height: 280, top: -80, right: -80 }} />
          <div className="blob blob-float" style={{ width: 180, height: 180, bottom: -40, left: -40 }} />
          <div className="brand-mark">
            <div className="badge">V</div>
            <span>VOLTIO</span>
          </div>
          <div className="login-hero">
            <p className="eyebrow" style={{ color: 'var(--yellow)' }}>Tienda de componentes gamer</p>
            <h1>Arma tu PC sin <mark>vueltas</mark>, con stock real.</h1>
            <p>Tres nodos de aplicación, balanceo de carga y réplica de base de datos trabajando para que el catálogo esté siempre al día.</p>
          </div>
          <div className="login-features">
            <div className="login-feature">🚚 Stock en vivo</div>
            <div className="login-feature">⚡ Envío rápido</div>
            <div className="login-feature">🔧 Piezas certificadas</div>
          </div>
        </div>
        <div className="login-side">
          <div className="login-card anim-card-in">
            <h2>Acceso al Sistema</h2>
            <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema.</p>
            {loginError && <div className="alerta error">{loginError}</div>}
            <form onSubmit={handleLogin}>
              <div className="field">
                <label>Usuario</label>
                <input type="text" name="username" placeholder="admin o cliente" value={loginForm.username} onChange={handleLoginChange} required />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="••••••••" value={loginForm.password} onChange={handleLoginChange} required autoComplete="current-password" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Iniciar sesión</button>
            </form>
            <p className="login-hint">Admin: <code>admin / admin123</code> · Cliente: <code>cliente / cliente123</code></p>
          </div>
        </div>
      </div>
    );
  }

  const esAdmin = usuarioActivo.rol === 'admin';
  const esFinal = usuarioActivo.rol === 'final';

  const totalUnidades = componentes.reduce((s, c) => s + (Number(c.stock) || 0), 0);
  const valorInventario = componentes.reduce((s, c) => s + (Number(c.stock) || 0) * Number(c.precio || 0), 0);
  const agotados = componentes.filter((c) => (c.stock ?? 0) <= 0).length;

  const categorias = ['Todas', ...new Set(componentes.map((c) => c.categoria).filter(Boolean))];

  const componentesFiltrados = esFinal
    ? componentes.filter((c) => {
        const matchCat = categoriaFiltro === 'Todas' || c.categoria === categoriaFiltro;
        const q = busqueda.toLowerCase();
        const matchBusqueda = !q || [c.nombre, c.codigo_serie, c.categoria, c.descripcion]
          .some((v) => String(v || '').toLowerCase().includes(q));
        return matchCat && matchBusqueda;
      })
    : componentes;

  const renderStock = (stock) => {
    const info = getStockInfo(stock);
    return (
      <div className="stock-wrap">
        <div className={`stock-bar ${info.bar}`}><span style={{ width: info.width }} /></div>
        <span className={`stock-label ${info.label}`}>{info.text}</span>
      </div>
    );
  };

  return (
    <div className="app-shell anim-view-in">
      <div className="navbar anim-nav-in">
        <div className="brand-mark small">
          <div className="badge">V</div>
          <span>VOLTIO</span>
        </div>
        {esFinal && (
          <div className="nav-search">
            <input
              type="text"
              placeholder="Buscar componentes, marcas, categorías..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="button" aria-label="Buscar"><IconSearch /></button>
          </div>
        )}
        <div className="nav-user">
          <span className="role-pill">{usuarioActivo.rol}</span>
          {esFinal && (
            <button type="button" className="cart-btn" onClick={() => setDrawerAbierto(true)} aria-label="Carrito">
              <IconCart />
              {totalUnidadesCarrito > 0 && <span className="cart-badge">{totalUnidadesCarrito}</span>}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" style={{ background: '#fff' }} onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>

      {esFinal && (
        <div className="subnav anim-subnav-in">
          <div className="chip-row" style={{ margin: 0 }}>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip${categoriaFiltro === cat ? ' active' : ''}`}
                onClick={() => setCategoriaFiltro(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {esAdmin && (
        <div className="main">
          <div className="page-head anim-fade-up">
            <p className="eyebrow">Panel de administración</p>
            <h1>Inventario de <mark>PC Gamer</mark></h1>
            <p>Gestiona el catálogo replicado en los tres nodos de la aplicación.</p>
          </div>

          {mensaje.texto && <div className={`alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

          <div className="stat-grid">
            <div className="stat-card anim-fade-up" style={animDelay(0)}>
              <div className="stat-label">Referencias</div>
              <div className="stat-value">{componentes.length}</div>
            </div>
            <div className="stat-card green anim-fade-up" style={animDelay(1)}>
              <div className="stat-label">Unidades totales</div>
              <div className="stat-value">{totalUnidades}</div>
            </div>
            <div className="stat-card red anim-fade-up" style={animDelay(2)}>
              <div className="stat-label">Valor de inventario</div>
              <div className="stat-value">${valorInventario.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="stat-card amber anim-fade-up" style={animDelay(3)}>
              <div className="stat-label">Agotados</div>
              <div className="stat-value">{agotados}</div>
            </div>
          </div>

          <div className="panel anim-fade-up" style={animDelay(4, 0.05)}>
            <button
              type="button"
              className="panel-toggle-head"
              onClick={() => setFormAbierto((v) => !v)}
            >
              <h2>{editandoId ? '✎ Editar componente' : '+ Registrar nuevo componente'}</h2>
              <IconChevron open={formAbierto} />
            </button>
            {formAbierto && (
              <div className="panel-body panel-body-open">
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="field">
                      <label>Código de serie</label>
                      <input type="text" name="codigo_serie" placeholder="Ej: GPU-4070-01" value={form.codigo_serie} onChange={handleChange} required />
                    </div>
                    <div className="field">
                      <label>Nombre</label>
                      <input type="text" name="nombre" placeholder="Ej: RTX 4070 Super" value={form.nombre} onChange={handleChange} required />
                    </div>
                    <div className="field">
                      <label>Categoría</label>
                      <input type="text" name="categoria" placeholder="Ej: Tarjeta gráfica" value={form.categoria} onChange={handleChange} required />
                    </div>
                    <div className="field">
                      <label>Unidad</label>
                      <input type="text" name="unidad" placeholder="Ej: unidad, kit" value={form.unidad} onChange={handleChange} required />
                    </div>
                    <div className="field">
                      <label>Stock</label>
                      <input type="number" name="stock" placeholder="0" value={form.stock} onChange={handleChange} required min="0" />
                    </div>
                    <div className="field">
                      <label>Precio ($)</label>
                      <input type="number" name="precio" placeholder="0.00" value={form.precio} onChange={handleChange} required step="0.01" min="0" />
                    </div>
                    <div className="field full-width">
                      <label>Descripción</label>
                      <textarea name="descripcion" rows="2" placeholder="Especificaciones técnicas..." value={form.descripcion} onChange={handleChange} required />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {editandoId && (
                      <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
                    )}
                    <button type="submit" className="btn btn-primary">
                      {editandoId ? 'Actualizar componente' : 'Guardar componente'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="panel anim-fade-up" style={animDelay(5, 0.05)}>
            <div className="panel-body" style={{ borderTop: 'none', paddingTop: 20 }}>
              <div className="toolbar-row">
                <p className="eyebrow" style={{ margin: 0 }}>Stock actual</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={fetchComponentes}>Actualizar</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Precio</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentes.length > 0 ? (
                      componentes.map((comp, index) => (
                        <tr key={comp.id || `comp-${index}`} className="anim-row-in" style={animDelay(index, 0.04, 0.5)}>
                          <td><span className="sku-tag">{comp.codigo_serie || 'N/A'}</span></td>
                          <td>{comp.nombre || 'N/A'}</td>
                          <td><span className="cat-tag">{comp.categoria || 'N/A'}</span></td>
                          <td>{renderStock(comp.stock)}</td>
                          <td className="price-cell">${Number(comp.precio ?? 0).toFixed(0)}</td>
                          <td className="actions-cell">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEditar(comp)}>Editar</button>
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleEliminar(comp.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-state">No hay componentes registrados o cargando...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {esFinal && (
        <div className="store-wrap">
          <div className="main">
            <div className="page-head anim-fade-up">
              <p className="eyebrow">Catálogo</p>
              <h1>Arma tu <mark>setup</mark></h1>
              <p>Disponibilidad en tiempo real desde los tres nodos replicados.</p>
            </div>

            {mensaje.texto && <div className={`alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

            {componentesFiltrados.length > 0 ? (
              <div className="product-grid">
                {componentesFiltrados.map((comp, index) => {
                  const stock = comp.stock ?? 0;
                  const tile = TILE_COLORS[index % TILE_COLORS.length];
                  return (
                    <div key={comp.id || `comp-${index}`} className="product-card anim-card-pop" style={animDelay(index)}>
                      {stock > 10 && <div className="badge-corner">En stock</div>}
                      {stock > 0 && stock <= 5 && <div className="badge-corner low">¡Pocas unidades!</div>}
                      <div className={`product-tile ${tile}`}><IconProduct /></div>
                      <div className="product-body">
                        <h3>{comp.nombre}</h3>
                        <p className="card-desc">{comp.descripcion || comp.categoria}</p>
                        {renderStock(stock)}
                        <div className="card-foot">
                          <span className="price">${Number(comp.precio ?? 0).toFixed(0)} <small>USD</small></span>
                        </div>
                        <button
                          type="button"
                          className="btn-cart-add"
                          onClick={() => agregarAlCarrito(comp)}
                          disabled={stock < 1}
                        >
                          {stock < 1 ? 'Agotado' : <><IconCart size={15} /> Agregar</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">No hay componentes que coincidan con tu búsqueda.</div>
            )}
          </div>

          {carrito.length > 0 && (
            <button type="button" className="cart-fab anim-fab-in" onClick={() => setDrawerAbierto(true)}>
              <IconCart />
              Carrito <span className="fab-count">{totalUnidadesCarrito}</span>
            </button>
          )}

          {drawerAbierto && (
            <>
              <div className="drawer-backdrop anim-backdrop-in" onClick={() => setDrawerAbierto(false)} />
              <div className="cart-drawer anim-drawer-in">
                <div className="drawer-head">
                  <h2>Tu carrito</h2>
                  <button type="button" className="drawer-close" onClick={() => setDrawerAbierto(false)} aria-label="Cerrar">
                    <IconClose />
                  </button>
                </div>
                <div className="drawer-items">
                  {carrito.map((item, index) => (
                    <div key={item.id} className="cart-line anim-line-in" style={animDelay(index, 0.06)}>
                      <div className="line-info">
                        <div className="line-name">{item.nombre}</div>
                        <div className="line-unit">${Number(item.precio).toFixed(0)} c/u</div>
                      </div>
                      <input
                        className="qty-input"
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidadCarrito(item.id, e.target.value)}
                      />
                      <span className="line-subtotal">${(item.precio * item.cantidad).toFixed(0)}</span>
                      <button type="button" className="line-remove" onClick={() => quitarDelCarrito(item.id)} aria-label="Eliminar">
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="drawer-foot">
                  <div className="drawer-total">
                    <span className="label">Total ({totalUnidadesCarrito} unid.)</span>
                    <span className="value">${totalCarrito.toFixed(0)}</span>
                  </div>
                  <button type="button" className="btn btn-primary btn-block" onClick={handleComprar}>
                    Confirmar compra
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="app-footer">
        VOLTIO · Infraestructura distribuida con Docker, NGINX y réplica MySQL
      </div>
    </div>
  );
}

export default App;
