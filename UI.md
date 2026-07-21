# **Contexto**

Tengo una aplicación web en React (App.jsx y App.css o index.css) que funciona como un CRUD para un sistema de gestión de inventario de componentes de PC (Proyecto Universitario de Arquitectura Distribuida con NGINX y MySQL).

Actualmente, la lógica de estado (useState), las llamadas a la API (fetch) y la renderización condicional (Login vs Inventario) ya funcionan perfectamente.

# **Objetivo**

Quiero reconstruir completamente la interfaz de usuario (UI) de mi App.jsx para que sea **idéntica** al archivo HTML/CSS estático adjunto (voltio-preview-retail.html).

# **Archivo de Diseño Adjunto**

(Asegúrate de adjuntar en Cursor el archivo voltio-preview-retail.html antes de enviar este prompt).

# **Instrucciones Estrictas de Implementación**

1. **MANTENER LA LÓGICA:** \- NO modifiques ni elimines ninguna función de estado (useState, useEffect).  
   * NO modifiques las llamadas fetch ni las rutas de la API (apiUrl).  
   * MANTÉN la renderización condicional inicial: if (\!usuarioActivo) { return \<VistaLogin /\> } return \<VistaPrincipal /\>.  
2. **ADAPTACIÓN DEL HTML a JSX:**  
   * Convierte todo el HTML del archivo adjunto a sintaxis JSX válida (cambiar class por className, cerrar etiquetas input, cambiar estilos en línea de style="width:15px" a style={{ width: '15px' }}, etc.).  
   * Reemplaza los datos "quemados" (mock data) del HTML estático (como las tarjetas de productos en la tabla) por el .map() que ya existe en mi código React mapeando la variable de estado componentes.  
   * Asegúrate de mapear correctamente las variables: comp.codigo\_serie, comp.nombre, comp.categoria, comp.stock, comp.precio.  
3. **MIGRACIÓN DE CSS:**  
   * Extrae todo el bloque \<style\> del archivo HTML adjunto y cópialo íntegramente en mi archivo de estilos (App.css o index.css).  
   * Asegúrate de importar las fuentes de Google Fonts (Baloo 2, Inter, JetBrains Mono) en el CSS o en el index.html público de React.  
4. **COMPONENTES VISUALES ESPECÍFICOS A IMPLEMENTAR:**  
   * **Login:** Adapta la tarjeta de login existente para que use las clases visuales de los "paneles" del nuevo diseño. Usa la fuente Baloo 2 para el título "Acceso al Sistema".  
   * **Header/Nav:** Implementa la barra superior (app-head) con el logo "Voltio", el badge verde "Activo" y el "Admin Mode".  
   * **Filtros/Resumen (Hero):** Agrega la sección de "Hardware disponible" con las pastillas visuales de categorías (GPUs, Placas base, etc.) que se ven en el diseño.  
   * **Formulario (Drawer/Panel):** Convierte el diseño del carrito/formulario lateral (drawer-backdrop, drawer-panel) en el formulario para *Agregar Nuevo Componente*. Haz que este panel lateral se abra al hacer clic en un botón "Nuevo Componente" y se cierre al guardar o cancelar.  
   * **Tabla/Grid de Productos:** Transforma la tabla HTML aburrida actual para que se vea como el data-grid moderno del diseño estático (con las clases grid-row, grid-col, la etiqueta verde "EN STOCK" o roja si el stock es 0, y el badge del precio).  
5. **DETALLES FINALES:**  
   * Usa los iconos SVG en línea (inline SVG) que provee el documento HTML para los botones (basura, editar, cerrar, etc.).  
   * Muestra el estado del nodo que responde (si tuviéramos un ping) o el footer app-footer en la parte inferior.

Entrégame el código completo resultante de App.jsx y el código completo de App.css.