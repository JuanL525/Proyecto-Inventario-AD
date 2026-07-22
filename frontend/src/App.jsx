import { useState, useEffect, useCallback } from 'react';
import './App.css';

const FORM_VACIO = {
  codigo_serie: '', nombre: '', descripcion: '', unidad: 'unidad',
  categoria: '', stock: 0, precio: 0, imagen_url: ''
};

const TILE_COLORS = ['tile-lavender', 'tile-mint', 'tile-peach', 'tile-sky', 'tile-butter'];

const animDelay = (i, step = 0.07, max = 0.55) => ({ animationDelay: `${Math.min(i * step, max)}s` });

const PASOS_ENVIO = [
  { id: 'recibido', label: 'Pedido recibido', detalle: 'Confirmado en el sistema' },
  { id: 'preparacion', label: 'En preparación', detalle: 'Armando tu pedido en bodega' },
  { id: 'paqueteria', label: 'En paquetería', detalle: 'Empacado y listo para despacho' },
  { id: 'enviado', label: 'Enviado', detalle: 'Salió del centro de distribución' },
  { id: 'entrega', label: 'Entrega estimada', detalle: 'Llegada al domicilio' }
];

function generarNumeroOrden() {
  return `VLT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function fechaEntregaEstimada(dias = 3) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function claveHistorial(username) {
  return `historialCompras_${username}`;
}

function etiquetaRol(rol) {
  if (rol === 'admin') return 'Administrador';
  if (rol === 'final') return 'Cliente';
  return 'Usuario';
}

function leerHistorial(username) {
  if (!username) return [];
  try {
    const data = localStorage.getItem(claveHistorial(username));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function escribirHistorial(username, historial) {
  if (!username) return;
  localStorage.setItem(claveHistorial(username), JSON.stringify(historial));
}

function migrarUltimaOrden(username) {
  const historial = leerHistorial(username);
  const viejo = localStorage.getItem('ultimaOrden');
  if (!viejo) return historial;

  try {
    const orden = JSON.parse(viejo);
    const existe = historial.some((o) => o.numero === orden.numero);
    const actualizado = existe ? historial : [orden, ...historial];
    escribirHistorial(username, actualizado);
    localStorage.removeItem('ultimaOrden');
    return actualizado;
  } catch {
    localStorage.removeItem('ultimaOrden');
    return historial;
  }
}

function formatearFechaOrden(iso) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function calcularPasoActual(fechaIso) {
  const dias = (Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24);
  if (dias >= 3) return 4;
  if (dias >= 2) return 3;
  if (dias >= 0.5) return 2;
  return 1;
}

function agruparArticulosComprados(historial) {
  const mapa = new Map();
  historial.forEach((orden) => {
    orden.items.forEach((item) => {
      const prev = mapa.get(item.id);
      if (prev) {
        mapa.set(item.id, {
          ...prev,
          cantidadTotal: prev.cantidadTotal + item.cantidad,
          vecesComprado: prev.vecesComprado + 1
        });
      } else {
        mapa.set(item.id, { ...item, cantidadTotal: item.cantidad, vecesComprado: 1 });
      }
    });
  });
  return Array.from(mapa.values());
}

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

const IconProduct = () => (
  <svg className="icon icon-big" viewBox="0 0 24 24" strokeWidth="1.5">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M7 14h.01M12 10h6M12 14h4" />
  </svg>
);

function ProductImagen({ url, alt, className = '', fallbackClass = '' }) {
  const [error, setError] = useState(false);
  const tieneImagen = url && !error;

  if (!tieneImagen) {
    return (
      <div className={`product-tile-fallback ${fallbackClass}`}>
        <IconProduct />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`product-img ${className}`}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

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
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
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
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [categoriaAdminFiltro, setCategoriaAdminFiltro] = useState('Todas');
  const [productoDetalle, setProductoDetalle] = useState(null);
  const [historialCompras, setHistorialCompras] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [modalComprasAbierto, setModalComprasAbierto] = useState(false);
  const [vistaCompras, setVistaCompras] = useState('lista');

  const apiUrl = import.meta.env.VITE_API_URL;

  const cerrarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrarNotificacion = useCallback((texto, tipo = 'exito') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, texto, tipo }]);
    window.setTimeout(() => cerrarToast(id), 4200);
  }, [cerrarToast]);

  const cerrarConfirmacion = () => setConfirmDialog(null);

  const pedirConfirmacion = ({ titulo, mensaje, detalle, confirmarTexto = 'Confirmar', tipo = 'danger', onConfirm }) => {
    setConfirmDialog({ titulo, mensaje, detalle, confirmarTexto, tipo, onConfirm });
  };

  const confirmarAccion = async () => {
    if (!confirmDialog?.onConfirm) return;
    await confirmDialog.onConfirm();
    cerrarConfirmacion();
  };

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    if (usuarioActivo?.rol === 'final') {
      setHistorialCompras(migrarUltimaOrden(usuarioActivo.username));
    } else {
      setHistorialCompras([]);
    }
  }, [usuarioActivo]);

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
      fetchComponentes(usuarioActivo.rol === 'admin');
    }
  }, [usuarioActivo, fetchComponentes]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleLoginChange = (e) => setLoginForm({ ...loginForm, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ ...FORM_VACIO });
    setEditandoId(null);
    setModalFormAbierto(false);
  };

  const abrirModalNuevo = () => {
    setForm({ ...FORM_VACIO });
    setEditandoId(null);
    setModalFormAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        mostrarNotificacion(data.error || 'Error al guardar', 'error');
        return;
      }
      mostrarNotificacion(data.mensaje, 'exito');
      resetForm();
      fetchComponentes(true);
    } catch {
      mostrarNotificacion('Error de conexión con el servidor', 'error');
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
      precio: comp.precio ?? 0,
      imagen_url: comp.imagen_url || ''
    });
    setModalFormAbierto(true);
  };

  const ejecutarEliminar = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/componentes/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        mostrarNotificacion(data.error || 'Error al eliminar', 'error');
        return;
      }
      mostrarNotificacion(data.mensaje, 'exito');
      if (editandoId === id) resetForm();
      setComponentes((prev) => prev.filter((c) => c.id !== id));
      fetchComponentes(true);
    } catch {
      mostrarNotificacion('Error de conexión con el servidor', 'error');
    }
  };

  const solicitarEliminar = (comp) => {
    pedirConfirmacion({
      titulo: 'Eliminar componente',
      mensaje: `¿Eliminar "${comp.nombre}"?`,
      detalle: 'Esta acción no se puede deshacer. El registro se borrará del inventario replicado en los tres nodos.',
      confirmarTexto: 'Sí, eliminar',
      tipo: 'danger',
      onConfirm: () => ejecutarEliminar(comp.id)
    });
  };

  const agregarAlCarrito = (comp) => {
    if ((comp.stock ?? 0) < 1) {
      mostrarNotificacion('Sin stock disponible', 'error');
      return;
    }

    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === comp.id);
      if (existente) {
        if (existente.cantidad >= comp.stock) {
          mostrarNotificacion('No hay más stock disponible', 'error');
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
        cantidad: 1,
        imagen_url: comp.imagen_url || '',
        codigo_serie: comp.codigo_serie || ''
      }];
    });
    mostrarNotificacion(`"${comp.nombre}" agregado al carrito`, 'exito');
    setDrawerAbierto(true);
    setProductoDetalle(null);
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
      mostrarNotificacion('El carrito está vacío', 'error');
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
        mostrarNotificacion(data.error || 'Error en la compra', 'error');
        return;
      }

      const total = carrito.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0);
      const unidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);
      const orden = {
        numero: generarNumeroOrden(),
        fecha: new Date().toISOString(),
        entregaEstimada: fechaEntregaEstimada(3),
        items: carrito.map((item) => ({ ...item })),
        total,
        unidades,
        usuario: usuarioActivo.username
      };

      const nuevoHistorial = [orden, ...historialCompras];
      setHistorialCompras(nuevoHistorial);
      escribirHistorial(usuarioActivo.username, nuevoHistorial);
      setOrdenSeleccionada(orden);
      setVistaCompras('detalle');
      setModalComprasAbierto(true);
      setCarrito([]);
      setDrawerAbierto(false);
      setProductoDetalle(null);
      fetchComponentes(true);
    } catch {
      mostrarNotificacion('Error de conexión con el servidor', 'error');
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
    setHistorialCompras([]);
    setOrdenSeleccionada(null);
    setModalComprasAbierto(false);
    setVistaCompras('lista');
    setBusqueda('');
    setBusquedaAdmin('');
    setCategoriaFiltro('Todas');
    setCategoriaAdminFiltro('Todas');
    setProductoDetalle(null);
  };

  const abrirMisCompras = () => {
    setVistaCompras('lista');
    setOrdenSeleccionada(null);
    setModalComprasAbierto(true);
  };

  const verDetalleOrden = (orden) => {
    setOrdenSeleccionada(orden);
    setVistaCompras('detalle');
  };

  const cerrarMisCompras = () => {
    setModalComprasAbierto(false);
    setVistaCompras('lista');
    setOrdenSeleccionada(null);
  };

  const volverAListaCompras = () => {
    setVistaCompras('lista');
    setOrdenSeleccionada(null);
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
  const bibliotecaArticulos = esFinal ? agruparArticulosComprados(historialCompras) : [];
  const ordenActiva = ordenSeleccionada;

  const totalUnidades = componentes.reduce((s, c) => s + (Number(c.stock) || 0), 0);
  const valorInventario = componentes.reduce((s, c) => s + (Number(c.stock) || 0) * Number(c.precio || 0), 0);
  const agotados = componentes.filter((c) => (c.stock ?? 0) <= 0).length;
  const stockBajo = componentes.filter((c) => {
    const s = c.stock ?? 0;
    return s > 0 && s <= 5;
  }).length;
  const conImagen = componentes.filter((c) => c.imagen_url).length;
  const categoriasUnicas = new Set(componentes.map((c) => c.categoria).filter(Boolean)).size;

  const categorias = ['Todas', ...new Set(componentes.map((c) => c.categoria).filter(Boolean))];

  const filtrarComponentes = (lista, cat, q) => lista.filter((c) => {
    const matchCat = cat === 'Todas' || c.categoria === cat;
    const query = q.toLowerCase();
    const matchBusqueda = !query || [c.nombre, c.codigo_serie, c.categoria, c.descripcion]
      .some((v) => String(v || '').toLowerCase().includes(query));
    return matchCat && matchBusqueda;
  });

  const componentesFiltrados = esFinal
    ? filtrarComponentes(componentes, categoriaFiltro, busqueda)
    : componentes;

  const componentesAdminFiltrados = esAdmin
    ? filtrarComponentes(componentes, categoriaAdminFiltro, busquedaAdmin)
    : [];

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
          <span className="role-pill">{etiquetaRol(usuarioActivo.rol)}</span>
          {esFinal && (
            <button type="button" className="cart-btn" onClick={() => setDrawerAbierto(true)} aria-label="Carrito">
              <IconCart />
              {totalUnidadesCarrito > 0 && <span className="cart-badge">{totalUnidadesCarrito}</span>}
            </button>
          )}
          {esFinal && historialCompras.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm order-pill-btn" onClick={abrirMisCompras}>
              Mis compras ({historialCompras.length})
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
        <div className="main admin-main">
          <div className="page-head admin-page-head anim-fade-up">
            <div>
              <p className="eyebrow">Panel de administración</p>
              <h1>Inventario de <mark>PC Gamer</mark></h1>
              <p>Catálogo replicado en maestro + 2 esclavos · gestión en tiempo real.</p>
            </div>
            <button type="button" className="btn btn-primary admin-cta" onClick={abrirModalNuevo}>
              + Nuevo componente
            </button>
          </div>

          <div className="stat-grid admin-stat-grid">
            <div className="stat-card anim-fade-up" style={animDelay(0)}>
              <div className="stat-label">Referencias</div>
              <div className="stat-value">{componentes.length}</div>
              <div className="stat-sub">{categoriasUnicas} categorías</div>
            </div>
            <div className="stat-card green anim-fade-up" style={animDelay(1)}>
              <div className="stat-label">Unidades totales</div>
              <div className="stat-value">{totalUnidades}</div>
              <div className="stat-sub">En inventario activo</div>
            </div>
            <div className="stat-card red anim-fade-up" style={animDelay(2)}>
              <div className="stat-label">Valor de inventario</div>
              <div className="stat-value">${valorInventario.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              <div className="stat-sub">Precio × stock</div>
            </div>
            <div className="stat-card amber anim-fade-up" style={animDelay(3)}>
              <div className="stat-label">Stock bajo</div>
              <div className="stat-value">{stockBajo}</div>
              <div className="stat-sub">{agotados} agotados</div>
            </div>
            <div className="stat-card lavender anim-fade-up" style={animDelay(4)}>
              <div className="stat-label">Con imagen</div>
              <div className="stat-value">{conImagen}/{componentes.length}</div>
              <div className="stat-sub">Catálogo visual</div>
            </div>
          </div>

          <div className="admin-toolbar anim-fade-up" style={animDelay(5, 0.05)}>
            <div className="admin-search">
              <IconSearch />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o categoría..."
                value={busquedaAdmin}
                onChange={(e) => setBusquedaAdmin(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fetchComponentes(true)}
            >
              Actualizar
            </button>
          </div>

          <div className="chip-row anim-fade-up" style={animDelay(6, 0.05)}>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip${categoriaAdminFiltro === cat ? ' active' : ''}`}
                onClick={() => setCategoriaAdminFiltro(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {componentesAdminFiltrados.length > 0 ? (
            <div className="admin-grid">
              {componentesAdminFiltrados.map((comp, index) => {
                const stock = comp.stock ?? 0;
                const tile = TILE_COLORS[index % TILE_COLORS.length];
                return (
                  <article key={comp.id || `admin-${index}`} className="admin-card anim-card-pop" style={animDelay(index)}>
                    <div className={`admin-card-image ${tile}`}>
                      <ProductImagen url={comp.imagen_url} alt={comp.nombre} />
                      {stock <= 0 && <span className="admin-badge out">Agotado</span>}
                      {stock > 0 && stock <= 5 && <span className="admin-badge warn">Stock bajo</span>}
                    </div>
                    <div className="admin-card-body">
                      <div className="admin-card-top">
                        <span className="sku-tag">{comp.codigo_serie}</span>
                        <span className="cat-tag">{comp.categoria}</span>
                      </div>
                      <h3>{comp.nombre}</h3>
                      <p className="admin-card-desc">{comp.descripcion}</p>
                      {renderStock(stock)}
                      <div className="admin-card-foot">
                        <span className="price">${Number(comp.precio ?? 0).toFixed(0)} <small>USD</small></span>
                        <div className="admin-card-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEditar(comp)}>Editar</button>
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => solicitarEliminar(comp)}>
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty anim-fade-up">
              <IconProduct />
              <p>No hay componentes que coincidan con la búsqueda.</p>
              <button type="button" className="btn btn-primary" onClick={abrirModalNuevo}>Registrar primero</button>
            </div>
          )}

          {modalFormAbierto && (
            <>
              <div className="drawer-backdrop anim-backdrop-in" onClick={resetForm} />
              <div className="admin-form-modal anim-modal-in">
                <div className="admin-form-head">
                  <div>
                    <p className="eyebrow">{editandoId ? 'Edición' : 'Nuevo producto'}</p>
                    <h2>{editandoId ? 'Actualizar componente' : 'Registrar componente'}</h2>
                  </div>
                  <button type="button" className="detail-close" onClick={resetForm} aria-label="Cerrar">
                    <IconClose />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="admin-form">
                  <div className="admin-form-preview">
                    <div className="admin-preview-frame">
                      <ProductImagen url={form.imagen_url} alt={form.nombre || 'Vista previa'} className="admin-preview-img" />
                    </div>
                    <p className="admin-preview-hint">Vista previa del catálogo</p>
                  </div>
                  <div className="admin-form-fields">
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
                        <label>URL de imagen</label>
                        <input type="url" name="imagen_url" placeholder="https://ejemplo.com/imagen.jpg" value={form.imagen_url} onChange={handleChange} />
                      </div>
                      <div className="field full-width">
                        <label>Descripción</label>
                        <textarea name="descripcion" rows="3" placeholder="Especificaciones técnicas..." value={form.descripcion} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="admin-form-actions">
                      <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancelar</button>
                      <button type="submit" className="btn btn-primary">
                        {editandoId ? 'Guardar cambios' : 'Publicar en catálogo'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
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

            {componentesFiltrados.length > 0 ? (
              <div className="product-grid">
                {componentesFiltrados.map((comp, index) => {
                  const stock = comp.stock ?? 0;
                  const tile = TILE_COLORS[index % TILE_COLORS.length];
                  return (
                    <div key={comp.id || `comp-${index}`} className="product-card anim-card-pop" style={animDelay(index)}>
                      {stock > 10 && <div className="badge-corner">En stock</div>}
                      {stock > 0 && stock <= 5 && <div className="badge-corner low">¡Pocas unidades!</div>}
                      <button
                        type="button"
                        className={`product-tile product-tile-btn ${tile}`}
                        onClick={() => setProductoDetalle(comp)}
                        aria-label={`Ver ${comp.nombre}`}
                      >
                        <ProductImagen url={comp.imagen_url} alt={comp.nombre} />
                      </button>
                      <div className="product-body">
                        <h3>{comp.nombre}</h3>
                        <p className="card-desc">{comp.descripcion || comp.categoria}</p>
                        {renderStock(stock)}
                        <div className="card-foot">
                          <span className="price">${Number(comp.precio ?? 0).toFixed(0)} <small>USD</small></span>
                          <button type="button" className="btn-ver-detalle" onClick={() => setProductoDetalle(comp)}>
                            Ver más
                          </button>
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

          {productoDetalle && (
            <>
              <div className="drawer-backdrop anim-backdrop-in" onClick={() => setProductoDetalle(null)} />
              <div className="product-detail-modal anim-modal-in">
                <button type="button" className="detail-close" onClick={() => setProductoDetalle(null)} aria-label="Cerrar">
                  <IconClose />
                </button>
                <div className="detail-image-wrap">
                  <ProductImagen url={productoDetalle.imagen_url} alt={productoDetalle.nombre} className="detail-img" />
                </div>
                <div className="detail-content">
                  <span className="sku-tag">{productoDetalle.codigo_serie}</span>
                  <span className="cat-tag">{productoDetalle.categoria}</span>
                  <h2>{productoDetalle.nombre}</h2>
                  <p className="detail-desc">{productoDetalle.descripcion}</p>
                  <div className="detail-meta">
                    <span>Unidad: <strong>{productoDetalle.unidad || 'unidad'}</strong></span>
                    {renderStock(productoDetalle.stock)}
                  </div>
                  <div className="detail-foot">
                    <span className="price detail-price">
                      ${Number(productoDetalle.precio ?? 0).toFixed(0)} <small>USD</small>
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => agregarAlCarrito(productoDetalle)}
                      disabled={(productoDetalle.stock ?? 0) < 1}
                    >
                      {(productoDetalle.stock ?? 0) < 1 ? 'Agotado' : <><IconCart size={16} /> Agregar al carrito</>}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {modalComprasAbierto && (
            <>
              <div className="drawer-backdrop anim-backdrop-in" onClick={cerrarMisCompras} />
              <div className="order-confirm-modal anim-modal-in purchases-modal">
                <button type="button" className="detail-close" onClick={cerrarMisCompras} aria-label="Cerrar">
                  <IconClose />
                </button>

                {vistaCompras === 'lista' ? (
                  <>
                    <div className="order-confirm-head">
                      <div className="order-success-icon library">📦</div>
                      <div>
                        <p className="eyebrow">Historial de compras</p>
                        <h2>Mis pedidos</h2>
                        <p className="order-sub">
                          {historialCompras.length} pedido{historialCompras.length !== 1 ? 's' : ''} guardado{historialCompras.length !== 1 ? 's' : ''} en tu cuenta.
                          El stock se descontó del inventario al confirmar cada compra.
                        </p>
                      </div>
                    </div>

                    <div className="purchases-list">
                      {historialCompras.map((orden) => (
                        <button
                          key={orden.numero}
                          type="button"
                          className="purchase-card"
                          onClick={() => verDetalleOrden(orden)}
                        >
                          <div className="purchase-card-top">
                            <span className="sku-tag">{orden.numero}</span>
                            <span className="purchase-date">{formatearFechaOrden(orden.fecha)}</span>
                          </div>
                          <div className="purchase-card-body">
                            <span className="purchase-summary">
                              {orden.unidades} artículo{orden.unidades !== 1 ? 's' : ''} · ${Number(orden.total).toFixed(0)} USD
                            </span>
                            <span className="purchase-preview">
                              {orden.items.slice(0, 2).map((i) => i.nombre).join(', ')}
                              {orden.items.length > 2 ? ` +${orden.items.length - 2} más` : ''}
                            </span>
                          </div>
                          <span className="purchase-link">Ver detalle →</span>
                        </button>
                      ))}
                    </div>

                    {bibliotecaArticulos.length > 0 && (
                      <div className="library-block">
                        <p className="order-section-title">Biblioteca de artículos comprados</p>
                        <div className="library-grid">
                          {bibliotecaArticulos.map((item) => (
                            <div key={item.id} className="library-item">
                              <div className="library-thumb">
                                <ProductImagen url={item.imagen_url} alt={item.nombre} />
                              </div>
                              <div className="library-info">
                                <span className="order-item-name">{item.nombre}</span>
                                <span className="library-meta">
                                  {item.cantidadTotal} unid. · {item.vecesComprado} pedido{item.vecesComprado !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : ordenActiva && (
                  <>
                    <button type="button" className="btn btn-ghost btn-sm purchase-back" onClick={volverAListaCompras}>
                      ← Volver al historial
                    </button>

                    <div className="order-confirm-head">
                      <div className="order-success-icon">✓</div>
                      <div>
                        <p className="eyebrow">Pedido {ordenActiva.numero}</p>
                        <h2>¡Tu pedido está en camino!</h2>
                        <p className="order-sub">
                          Compra del {formatearFechaOrden(ordenActiva.fecha)}. El stock del inventario se actualizó al confirmar.
                        </p>
                      </div>
                    </div>

                    <div className="order-meta-row">
                      <div className="order-meta-card">
                        <span className="order-meta-label">Nº de pedido</span>
                        <span className="order-meta-value">{ordenActiva.numero}</span>
                      </div>
                      <div className="order-meta-card">
                        <span className="order-meta-label">Entrega estimada</span>
                        <span className="order-meta-value">{ordenActiva.entregaEstimada}</span>
                      </div>
                      <div className="order-meta-card">
                        <span className="order-meta-label">Total pagado</span>
                        <span className="order-meta-value">${Number(ordenActiva.total).toFixed(0)} USD</span>
                      </div>
                    </div>

                    <div className="order-timeline">
                      <p className="order-section-title">Seguimiento del envío</p>
                      <div className="timeline-steps">
                        {PASOS_ENVIO.map((paso, index) => {
                          const pasoActual = calcularPasoActual(ordenActiva.fecha);
                          const estado = index < pasoActual ? 'done' : index === pasoActual ? 'active' : 'pending';
                          const detalle = paso.id === 'entrega'
                            ? ordenActiva.entregaEstimada
                            : paso.detalle;
                          return (
                            <div key={paso.id} className={`timeline-step ${estado}`}>
                              <div className="timeline-dot" />
                              <div className="timeline-content">
                                <span className="timeline-label">{paso.label}</span>
                                <span className="timeline-detail">{detalle}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="order-items-block">
                      <p className="order-section-title">Artículos comprados ({ordenActiva.unidades})</p>
                      <div className="order-items-list">
                        {ordenActiva.items.map((item, index) => (
                          <div key={item.id || `orden-${index}`} className="order-item-row">
                            <div className="order-item-thumb">
                              <ProductImagen url={item.imagen_url} alt={item.nombre} />
                            </div>
                            <div className="order-item-info">
                              <span className="sku-tag">{item.codigo_serie || 'SKU'}</span>
                              <span className="order-item-name">{item.nombre}</span>
                              <span className="order-item-qty">{item.cantidad} × ${Number(item.precio).toFixed(0)}</span>
                            </div>
                            <span className="order-item-sub">${(Number(item.precio) * item.cantidad).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="order-confirm-foot">
                      <p className="order-foot-note">
                        Recibirás actualizaciones por correo. Tiempo estimado: <strong>3 días hábiles</strong>.
                      </p>
                      <button type="button" className="btn btn-primary btn-block" onClick={cerrarMisCompras}>
                        Seguir comprando
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

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

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tipo} anim-toast-in`}>
            <span className="toast-icon" aria-hidden="true">{toast.tipo === 'error' ? '✕' : '✓'}</span>
            <span className="toast-text">{toast.texto}</span>
            <button type="button" className="toast-close" onClick={() => cerrarToast(toast.id)} aria-label="Cerrar">
              <IconClose />
            </button>
          </div>
        ))}
      </div>

      {confirmDialog && (
        <>
          <div className="drawer-backdrop anim-backdrop-in" onClick={cerrarConfirmacion} />
          <div className="confirm-modal anim-modal-in" role="dialog" aria-modal="true">
            <div className={`confirm-icon ${confirmDialog.tipo}`}>
              {confirmDialog.tipo === 'warning' ? '!' : <IconTrash />}
            </div>
            <h3>{confirmDialog.titulo}</h3>
            <p className="confirm-message">{confirmDialog.mensaje}</p>
            {confirmDialog.detalle && <p className="confirm-detail">{confirmDialog.detalle}</p>}
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={cerrarConfirmacion}>
                Cancelar
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.tipo === 'danger' ? 'btn-outline-danger' : 'btn-primary'}`}
                onClick={confirmarAccion}
              >
                {confirmDialog.confirmarTexto}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="app-footer">
        VOLTIO · Infraestructura distribuida con Docker, NGINX y réplica MySQL
      </div>
    </div>
  );
}

export default App;
