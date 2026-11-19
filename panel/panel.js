/* ============================================================
   La Gran Nuez — Panel de administración
   ============================================================ */
(function () {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const state = {
    products: Store.getProducts(),
    orders: Store.getOrders(),
    config: Store.getConfig(),
    search: '',
    statusFilter: 'todos',
    editingId: null,
    pendingImage: '',
    currentOrderId: null,
    confirmResolver: null
  };

  const els = {
    loginView: $('#loginView'),
    appView: $('#appView'),
    loginForm: $('#loginForm'),
    pinInput: $('#pinInput'),
    loginError: $('#loginError'),
    viewTitle: $('#viewTitle'),
    viewSubtitle: $('#viewSubtitle'),
    productsBody: $('#productsBody'),
    productsEmpty: $('#productsEmpty'),
    productSearch: $('#productSearch'),
    ordersBody: $('#ordersBody'),
    ordersEmpty: $('#ordersEmpty'),
    recentOrders: $('#recentOrders'),
    recentEmpty: $('#recentEmpty'),
    productDialog: $('#productDialog'),
    productForm: $('#productForm'),
    orderDialog: $('#orderDialog'),
    orderDetail: $('#orderDetail'),
    confirmDialog: $('#confirmDialog'),
    toasts: $('#toasts'),
    orderFilters: $('#orderFilters'),
    configForm: $('#configForm'),
    pinForm: $('#pinForm'),
    pinError: $('#pinError'),
    importInput: $('#importInput'),
    saveState: $('#saveState')
  };

  const VIEWS = {
    resumen: ['Resumen', 'Tu tienda de postres caseros de un vistazo.'],
    productos: ['Productos', 'Agrega, edita y controla la disponibilidad del menú.'],
    pedidos: ['Pedidos', 'Revisa y actualiza el estado de cada pedido.'],
    config: ['Configuración', 'Datos de contacto, pagos, delivery y respaldo.']
  };

  const STATUS = {
    pendiente: 'Pendiente',
    preparando: 'En preparación',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
  };

  /* ---------- Utilidades ---------- */

  function escapeHTML(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.innerHTML = '<span aria-hidden="true">' + (type === 'error' ? '⚠️' : type === 'ok' ? '✅' : '🔔') + '</span><span>' + escapeHTML(message) + '</span>';
    els.toasts.appendChild(el);
    window.setTimeout(function () {
      el.classList.add('is-out');
      window.setTimeout(function () { el.remove(); }, 250);
    }, 3200);
  }

  function lockScroll() {
    const open = els.productDialog.open || els.orderDialog.open || els.confirmDialog.open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function previewSrc(src) {
    if (!src) return '';
    if (/^assets\//.test(src)) return '../' + src;
    return src;
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function markSaved() {
    const now = new Date();
    const time = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    els.saveState.textContent = 'Guardado · ' + time;
  }

  /* ---------- Sesión ---------- */

  async function boot() {
    await Store.ensurePin();
    bindEvents();
    if (Store.hasSession()) {
      showApp();
    } else {
      els.loginView.hidden = false;
    }
  }

  function showApp() {
    els.loginView.hidden = true;
    els.appView.hidden = false;
    refreshData();
    const hash = (location.hash || '').replace('#', '');
    navigate(VIEWS[hash] ? hash : 'resumen');
    lockScroll();
  }

  function refreshData() {
    state.products = Store.getProducts();
    state.orders = Store.getOrders();
    state.config = Store.getConfig();
    paintAll();
  }

  function paintAll() {
    paintNavCounts();
    paintStats();
    paintRecent();
    paintProducts();
    paintOrders();
    paintConfig();
  }

  function navigate(view) {
    if (!VIEWS[view]) view = 'resumen';
    $$('.nav-btn[data-view]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-view') === view);
    });
    $$('[data-view-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-view-panel') !== view;
    });
    els.viewTitle.textContent = VIEWS[view][0];
    els.viewSubtitle.textContent = VIEWS[view][1];
    if (location.hash !== '#' + view) {
      history.replaceState(null, '', '#' + view);
    }
    $('#newProductTop').hidden = view !== 'resumen';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'pedidos') paintOrders();
    if (view === 'productos') paintProducts();
  }

  function paintNavCounts() {
    $('#navProductCount').textContent = state.products.length;
    $('#navOrderCount').textContent = state.orders.length;
  }

  /* ---------- Resumen ---------- */

  function paintStats() {
    const available = state.products.filter(function (p) { return p.available !== false; }).length;
    const activeOrders = state.orders.filter(function (o) { return o.status === 'pendiente' || o.status === 'preparando'; });
    const sales = state.orders
      .filter(function (o) { return o.status !== 'cancelado'; })
      .reduce(function (sum, o) { return sum + (Number(o.total) || 0); }, 0);

    $('#statProducts').textContent = state.products.length;
    $('#statAvailable').textContent = available + ' disponibles';
    $('#statOrders').textContent = state.orders.length;
    $('#statPending').textContent = activeOrders.length + (activeOrders.length === 1 ? ' activo' : ' activos');
    $('#statSales').textContent = Store.money(sales);

    const upcoming = activeOrders
      .filter(function (o) { return o.deliveryDate; })
      .sort(function (a, b) { return a.deliveryDate.localeCompare(b.deliveryDate); })[0];

    if (upcoming) {
      $('#statNext').textContent = Store.formatDate(upcoming.deliveryDate);
      $('#statNextLabel').textContent = upcoming.code + ' · ' + (upcoming.customer ? upcoming.customer.name : '');
    } else {
      $('#statNext').textContent = '—';
      $('#statNextLabel').textContent = 'Sin pedidos activos';
    }
  }

  function paintRecent() {
    const recent = state.orders.slice(0, 5);
    els.recentEmpty.hidden = recent.length > 0;
    els.recentOrders.innerHTML = recent.map(function (order) {
      return '' +
        '<div class="recent">' +
          '<div class="recent__main">' +
            '<strong>' + escapeHTML(order.code) + '</strong>' +
            '<span>' + escapeHTML(order.customer ? order.customer.name : 'Cliente') + ' · ' +
              Store.formatDate(order.deliveryDate) + '</span>' +
          '</div>' +
          '<span class="status status--' + escapeHTML(order.status || 'pendiente') + '">' +
            escapeHTML(STATUS[order.status] || 'Pendiente') + '</span>' +
          '<span class="recent__total">' + Store.money(order.total) + '</span>' +
        '</div>';
    }).join('');
  }

  /* ---------- Productos ---------- */

  function filteredProducts() {
    const q = state.search.trim().toLowerCase();
    if (!q) return state.products;
    return state.products.filter(function (product) {
      return (product.name + ' ' + Store.categoryLabel(product.category)).toLowerCase().indexOf(q) !== -1;
    });
  }

  function paintProducts() {
    const list = filteredProducts();
    els.productsEmpty.hidden = list.length > 0;
    els.productsBody.innerHTML = list.map(function (product) {
      return '' +
        '<tr>' +
          '<td data-label="Producto">' +
            '<div class="product-cell">' +
              '<img src="' + escapeHTML(previewSrc(product.image)) + '" alt="" width="52" height="42" loading="lazy">' +
              '<div>' +
                '<strong>' + escapeHTML(product.name) + '</strong>' +
                (product.badge ? '<small class="badge-soft">' + escapeHTML(product.badge) + '</small>' : '<small>' + Store.money(product.price) + ' por porción</small>') +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td data-label="Categoría">' + escapeHTML(Store.categoryLabel(product.category)) + '</td>' +
          '<td data-label="Precio"><strong>' + Store.money(product.price) + '</strong></td>' +
          '<td data-label="Disponible">' +
            '<label class="switch-row" title="Cambiar disponibilidad">' +
              '<input type="checkbox" data-toggle="' + escapeHTML(product.id) + '"' + (product.available !== false ? ' checked' : '') + ' aria-label="Disponibilidad de ' + escapeHTML(product.name) + '">' +
              '<span class="switch" aria-hidden="true"></span>' +
            '</label>' +
          '</td>' +
          '<td data-label="Acciones">' +
            '<div class="row-actions">' +
              '<button type="button" class="mini-btn" data-edit="' + escapeHTML(product.id) + '">Editar</button>' +
              '<button type="button" class="mini-btn mini-btn--danger" data-delete="' + escapeHTML(product.id) + '">Eliminar</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
    }).join('');
  }

  function openProductDialog(product) {
    state.editingId = product ? product.id : null;
    state.pendingImage = product ? product.image : '';
    els.productForm.reset();
    clearProductErrors();
    $('#pAvailable').checked = true;
    $('#pId').value = product ? product.id : '';
    $('#productDialogTitle').textContent = product ? 'Editar producto' : 'Nuevo producto';

    if (product) {
      $('#pName').value = product.name;
      $('#pCategory').value = product.category;
      $('#pPrice').value = product.price;
      $('#pDescription').value = product.description || '';
      $('#pBadge').value = product.badge || '';
      $('#pAvailable').checked = product.available !== false;
      $('#pImageUrl').value = /^https?:/.test(product.image) ? product.image : '';
    }

    paintImagePreview();
    els.productDialog.showModal();
    lockScroll();
    window.setTimeout(function () { $('#pName').focus(); }, 120);
  }

  function paintImagePreview() {
    const box = $('#pPreview');
    if (!state.pendingImage) {
      box.innerHTML = '<span>Vista previa</span>';
      return;
    }
    box.innerHTML = '<img src="' + escapeHTML(previewSrc(state.pendingImage)) + '" alt="Vista previa del producto">';
    const img = box.querySelector('img');
    if (img) {
      img.addEventListener('error', function () {
        box.innerHTML = '<span>No se pudo cargar la imagen</span>';
      });
    }
  }

  function clearProductErrors() {
    $$('[data-error-for]', els.productForm).forEach(function (slot) {
      slot.textContent = '';
    });
    $$('[aria-invalid]', els.productForm).forEach(function (field) {
      field.removeAttribute('aria-invalid');
    });
  }

  function setProductError(fieldId, message) {
    const slot = els.productForm.querySelector('[data-error-for="' + fieldId + '"]');
    if (slot) slot.textContent = message;
    const field = document.getElementById(fieldId);
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  function validImageSource(src) {
    return /^data:image\/(jpeg|jpg|png|webp);base64,/.test(src) || /^https?:\/\//.test(src) || /^assets\//.test(src);
  }

  async function handleImageFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast('Selecciona un archivo de imagen (JPG o PNG).', 'error');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      state.pendingImage = dataUrl;
      $('#pImageUrl').value = '';
      paintImagePreview();
      clearProductErrors();
      toast('Imagen optimizada y lista.', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo procesar la imagen.', 'error');
    }
  }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('El archivo no es una imagen válida.')); };
        img.onload = function () {
          const max = 900;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > max || height > max) {
            const ratio = Math.min(max / width, max / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function saveProduct(event) {
    event.preventDefault();
    clearProductErrors();

    const name = $('#pName').value.trim();
    const category = $('#pCategory').value;
    const price = Number($('#pPrice').value);
    const description = $('#pDescription').value.trim();
    const badge = $('#pBadge').value.trim();
    const available = $('#pAvailable').checked;
    const urlValue = $('#pImageUrl').value.trim();
    let image = urlValue || state.pendingImage;

    let firstError = null;
    if (name.length < 2) {
      setProductError('pName', 'Escribe un nombre de al menos 2 caracteres.');
      firstError = firstError || 'pName';
    }
    if (!Store.CATEGORIES.some(function (c) { return c.id === category; })) {
      toast('Selecciona una categoría válida.', 'error');
      firstError = firstError || 'pCategory';
    }
    if (!isFinite(price) || price <= 0) {
      setProductError('pPrice', 'Ingresa un precio mayor a 0.');
      firstError = firstError || 'pPrice';
    }
    if (!image) {
      setProductError('pImage', 'Sube una imagen o pega una URL válida.');
      firstError = firstError || 'pImage';
    } else if (!validImageSource(image)) {
      setProductError('pImage', 'Usa una imagen subida, una URL https o una ruta que empiece con "assets/".');
      firstError = firstError || 'pImage';
    }

    if (firstError) {
      const el = document.getElementById(firstError === 'pImage' ? 'pImageFile' : firstError);
      if (el && el.focus) el.focus();
      return;
    }

    if (/^assets\//.test(image)) {
      /* ruta relativa a la raíz del sitio */
    } else if (!/^data:/.test(image)) {
      image = image.trim();
    }

    let list = state.products.slice();
    if (state.editingId) {
      list = list.map(function (product) {
        if (product.id !== state.editingId) return product;
        return Object.assign({}, product, {
          name: name,
          category: category,
          price: price,
          description: description,
          badge: badge,
          available: available,
          image: image
        });
      });
    } else {
      list.unshift({
        id: Store.uid('p'),
        name: name,
        category: category,
        price: price,
        description: description,
        badge: badge,
        available: available,
        image: image,
        createdAt: new Date().toISOString()
      });
    }

    try {
      Store.saveProducts(list);
    } catch (err) {
      toast(err.message || 'No se pudo guardar el producto.', 'error');
      return;
    }

    state.products = list;
    els.productDialog.close();
    lockScroll();
    paintNavCounts();
    paintProducts();
    paintStats();
    markSaved();
    toast(state.editingId ? 'Producto actualizado.' : 'Producto agregado al menú.', 'ok');
    state.editingId = null;
  }

  function toggleAvailability(id, value) {
    const list = state.products.map(function (product) {
      return product.id === id ? Object.assign({}, product, { available: value }) : product;
    });
    try {
      Store.saveProducts(list);
      state.products = list;
      paintStats();
      paintProducts();
      markSaved();
      toast(value ? 'Producto disponible.' : 'Producto marcado como agotado.', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo actualizar.', 'error');
    }
  }

  async function deleteProduct(id) {
    const product = state.products.find(function (p) { return p.id === id; });
    if (!product) return;
    const ok = await askConfirm({
      title: 'Eliminar producto',
      text: 'Se quitará "' + product.name + '" del menú. Los pedidos anteriores se conservan.',
      okLabel: 'Eliminar',
      danger: true
    });
    if (!ok) return;
    const list = state.products.filter(function (p) { return p.id !== id; });
    try {
      Store.saveProducts(list);
      state.products = list;
      paintAll();
      markSaved();
      toast('Producto eliminado.', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo eliminar.', 'error');
    }
  }

  /* ---------- Pedidos ---------- */

  function filteredOrders() {
    if (state.statusFilter === 'todos') return state.orders;
    return state.orders.filter(function (order) { return order.status === state.statusFilter; });
  }

  function paintOrders() {
    const list = filteredOrders();
    els.ordersEmpty.hidden = list.length > 0;
    els.ordersBody.innerHTML = list.map(function (order) {
      const isDelivery = order.fulfillment === 'delivery';
      return '' +
        '<tr>' +
          '<td data-label="Pedido">' +
            '<strong>' + escapeHTML(order.code) + '</strong><br>' +
            '<small class="hint">' + Store.formatDateTime(order.createdAt) + '</small>' +
          '</td>' +
          '<td data-label="Cliente">' +
            escapeHTML(order.customer ? order.customer.name : 'Cliente') + '<br>' +
            '<small class="hint">' + escapeHTML(order.customer ? order.customer.phone : '') + '</small>' +
          '</td>' +
          '<td data-label="Entrega">' +
            (isDelivery ? 'Delivery' : 'Recojo') + '<br>' +
            '<small class="hint">' + Store.formatDate(order.deliveryDate) + '</small>' +
          '</td>' +
          '<td data-label="Total"><strong>' + Store.money(order.total) + '</strong></td>' +
          '<td data-label="Estado">' +
            '<select class="select-status" data-order-status="' + escapeHTML(order.id) + '" aria-label="Estado del pedido ' + escapeHTML(order.code) + '">' +
              Object.keys(STATUS).map(function (key) {
                return '<option value="' + key + '"' + (order.status === key ? ' selected' : '') + '>' + STATUS[key] + '</option>';
              }).join('') +
            '</select>' +
          '</td>' +
          '<td data-label="Detalle">' +
            '<button type="button" class="mini-btn" data-view-order="' + escapeHTML(order.id) + '">Ver</button>' +
          '</td>' +
        '</tr>';
    }).join('');
  }

  function changeOrderStatus(id, status) {
    if (!STATUS[status]) return;
    try {
      state.orders = Store.updateOrder(id, { status: status });
      paintStats();
      paintRecent();
      paintOrders();
      markSaved();
      toast('Estado actualizado a "' + STATUS[status] + '".', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo actualizar el estado.', 'error');
    }
  }

  function openOrder(id) {
    const order = state.orders.find(function (o) { return o.id === id; });
    if (!order) return;
    state.currentOrderId = id;
    const isDelivery = order.fulfillment === 'delivery';
    const payment = order.paymentLabel || order.payment || 'Por coordinar';
    const items = (order.items || []).map(function (item) {
      return '<li><span>' + item.qty + ' × ' + escapeHTML(item.name) + '</span><strong>' +
        Store.money(Number(item.price) * Number(item.qty)) + '</strong></li>';
    }).join('');

    els.orderDetail.innerHTML = '' +
      '<div class="order-head">' +
        '<div><h3>' + escapeHTML(order.code) + '</h3><small>Creado el ' + Store.formatDateTime(order.createdAt) + '</small></div>' +
        '<span class="status status--' + escapeHTML(order.status || 'pendiente') + '">' +
          escapeHTML(STATUS[order.status] || 'Pendiente') + '</span>' +
      '</div>' +
      '<div class="order-grid">' +
        '<div><span>Cliente</span><strong>' + escapeHTML(order.customer ? order.customer.name : '—') + '</strong></div>' +
        '<div><span>Celular</span><strong>' + escapeHTML(order.customer ? order.customer.phone : '—') + '</strong></div>' +
        '<div><span>Entrega</span><strong>' + (isDelivery ? 'Delivery' : 'Recojo') + '</strong></div>' +
        '<div><span>Fecha de pedido</span><strong>' + Store.formatDate(order.orderDate) + '</strong></div>' +
        '<div><span>Fecha de entrega</span><strong>' + Store.formatDate(order.deliveryDate) + '</strong></div>' +
        '<div><span>Pago</span><strong>' + escapeHTML(payment) + '</strong></div>' +
        (isDelivery ? '<div style="grid-column:1/-1"><span>Dirección</span><strong>' + escapeHTML(order.address || '—') + '</strong></div>' : '') +
      '</div>' +
      '<div class="order-items"><h4>Productos</h4><ul>' + items + '</ul>' +
        '<div class="order-totals">' +
          '<div><span>Subtotal</span><span>' + Store.money(order.subtotal) + '</span></div>' +
          '<div><span>Delivery</span><span>' + (Number(order.deliveryFee) === 0 ? 'Gratis' : Store.money(order.deliveryFee)) + '</span></div>' +
          '<div><span>Total</span><span>' + Store.money(order.total) + '</span></div>' +
        '</div>' +
      '</div>' +
      (order.notes ? '<div class="order-notes"><h4>Notas del cliente</h4><p>' + escapeHTML(order.notes) + '</p></div>' : '');

    const phone = order.customer ? digits(order.customer.phone) : '';
    const contact = $('#orderContact');
    if (phone) {
      const full = phone.length === 9 ? '51' + phone : phone;
      contact.href = 'https://wa.me/' + full + '?text=' + encodeURIComponent(
        'Hola ' + (order.customer.name || '') + ', te escribimos de ' + state.config.brand + ' por tu pedido ' + order.code + '.'
      );
      contact.hidden = false;
    } else {
      contact.hidden = true;
    }

    els.orderDialog.showModal();
    lockScroll();
  }

  async function deleteOrder() {
    const id = state.currentOrderId;
    const order = state.orders.find(function (o) { return o.id === id; });
    if (!order) return;
    const ok = await askConfirm({
      title: 'Eliminar pedido',
      text: 'Se borrará el pedido ' + order.code + ' de este navegador. Esta acción no se puede deshacer.',
      okLabel: 'Eliminar pedido',
      danger: true
    });
    if (!ok) return;
    try {
      state.orders = Store.removeOrder(id);
      els.orderDialog.close();
      lockScroll();
      paintAll();
      markSaved();
      toast('Pedido eliminado.', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo eliminar el pedido.', 'error');
    }
  }

  /* ---------- Configuración ---------- */

  function paintConfig() {
    const cfg = state.config;
    $('#cfgBrand').value = cfg.brand;
    $('#cfgTagline').value = cfg.tagline;
    $('#cfgAnnouncement').value = cfg.announcement;
    $('#cfgWhatsapp').value = cfg.whatsapp;
    $('#cfgPhone').value = cfg.phone;
    $('#cfgHours').value = cfg.hours;
    $('#cfgAddress').value = cfg.address;
    $('#cfgYape').value = cfg.yape;
    $('#cfgPlin').value = cfg.plin;
    $('#cfgBank').value = cfg.bankInfo;
    $('#cfgDeliveryFee').value = cfg.deliveryFee;
    $('#cfgFreeFrom').value = cfg.freeDeliveryFrom;
    $('#cfgAdvance').value = cfg.minAdvanceDays;
  }

  function saveConfig() {
    const cfg = {
      brand: $('#cfgBrand').value.trim(),
      tagline: $('#cfgTagline').value.trim(),
      announcement: $('#cfgAnnouncement').value.trim(),
      whatsapp: digits($('#cfgWhatsapp').value),
      phone: $('#cfgPhone').value.trim(),
      hours: $('#cfgHours').value.trim(),
      address: $('#cfgAddress').value.trim(),
      yape: $('#cfgYape').value.trim(),
      plin: $('#cfgPlin').value.trim(),
      bankInfo: $('#cfgBank').value.trim(),
      deliveryFee: Number($('#cfgDeliveryFee').value),
      freeDeliveryFrom: Number($('#cfgFreeFrom').value),
      minAdvanceDays: Number($('#cfgAdvance').value)
    };

    if (!cfg.brand || !cfg.phone || !cfg.hours || !cfg.address || !cfg.yape || !cfg.plin) {
      toast('Completa los datos obligatorios de la tienda.', 'error');
      return;
    }
    if (cfg.whatsapp.length < 9 || cfg.whatsapp.length > 15) {
      toast('El WhatsApp debe incluir código de país (ej. 51922678663).', 'error');
      return;
    }
    if (!isFinite(cfg.deliveryFee) || cfg.deliveryFee < 0 || !isFinite(cfg.freeDeliveryFrom) || cfg.freeDeliveryFrom < 0) {
      toast('Revisa los montos de delivery.', 'error');
      return;
    }
    if (!isFinite(cfg.minAdvanceDays) || cfg.minAdvanceDays < 0) {
      toast('Revisa los días de anticipación.', 'error');
      return;
    }

    try {
      state.config = Store.saveConfig(cfg);
      paintConfig();
      markSaved();
      toast('Configuración guardada.', 'ok');
    } catch (err) {
      toast(err.message || 'No se pudo guardar la configuración.', 'error');
    }
  }

  async function changePin(event) {
    event.preventDefault();
    els.pinError.textContent = '';
    const current = $('#currentPin').value;
    const next = $('#newPin').value;
    const repeat = $('#repeatPin').value;

    if (!/^\d{4,8}$/.test(next)) {
      els.pinError.textContent = 'El nuevo PIN debe tener entre 4 y 8 dígitos.';
      return;
    }
    if (next !== repeat) {
      els.pinError.textContent = 'Los PIN nuevos no coinciden.';
      return;
    }
    const valid = await Store.verifyPin(current);
    if (!valid) {
      els.pinError.textContent = 'El PIN actual no es correcto.';
      return;
    }
    try {
      await Store.setPin(next);
      els.pinForm.reset();
      toast('PIN actualizado correctamente.', 'ok');
      markSaved();
    } catch (err) {
      els.pinError.textContent = err.message || 'No se pudo cambiar el PIN.';
    }
  }

  /* ---------- Respaldo ---------- */

  function downloadBackup() {
    const data = Store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'la-gran-nuez-respaldo-' + Store.todayISO() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast('Respaldo descargado.', 'ok');
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const products = Array.isArray(data.products) ? data.products.length : 0;
      const orders = Array.isArray(data.orders) ? data.orders.length : 0;
      const ok = await askConfirm({
        title: 'Importar respaldo',
        text: 'Se reemplazarán los datos actuales por ' + products + ' productos y ' + orders + ' pedidos del archivo. ¿Continuar?',
        okLabel: 'Importar',
        danger: false
      });
      if (!ok) return;
      Store.importData(data);
      refreshData();
      markSaved();
      toast('Respaldo importado correctamente.', 'ok');
    } catch (err) {
      toast(err.message || 'El archivo no es un respaldo válido.', 'error');
    } finally {
      els.importInput.value = '';
    }
  }

  /* ---------- Confirmación ---------- */

  function askConfirm(options) {
    return new Promise(function (resolve) {
      state.confirmResolver = resolve;
      $('#confirmTitle').textContent = options.title || '¿Estás seguro?';
      $('#confirmText').textContent = options.text || 'Esta acción no se puede deshacer.';
      $('#confirmIcon').textContent = options.danger ? '🗑️' : '❓';
      $('#confirmOk').textContent = options.okLabel || 'Sí, continuar';
      $('#confirmOk').className = 'btn ' + (options.danger ? 'btn--danger' : 'btn--primary');
      els.confirmDialog.showModal();
      lockScroll();
    });
  }

  function resolveConfirm(value) {
    const resolver = state.confirmResolver;
    state.confirmResolver = null;
    if (els.confirmDialog.open) els.confirmDialog.close();
    lockScroll();
    if (resolver) resolver(value);
  }

  /* ---------- Eventos ---------- */

  function bindEvents() {
    /* Login */
    els.loginForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      els.loginError.textContent = '';
      const pin = els.pinInput.value.trim();
      if (!pin) {
        els.loginError.textContent = 'Ingresa tu PIN.';
        return;
      }
      const valid = await Store.verifyPin(pin);
      if (!valid) {
        els.loginError.textContent = 'PIN incorrecto. Inténtalo de nuevo.';
        els.pinInput.select();
        return;
      }
      Store.saveSession();
      els.loginForm.reset();
      showApp();
      toast('Bienvenido de vuelta.', 'ok');
    });

    $('#logoutBtn').addEventListener('click', function () {
      Store.clearSession();
      els.appView.hidden = true;
      els.loginView.hidden = false;
      els.pinInput.focus();
      toast('Sesión cerrada.');
    });

    /* Navegación */
    $$('.nav-btn[data-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        navigate(button.getAttribute('data-view'));
      });
    });
    $$('[data-go]').forEach(function (button) {
      button.addEventListener('click', function () {
        navigate(button.getAttribute('data-go'));
      });
    });

    /* Productos */
    $('#newProductBtn').addEventListener('click', function () { openProductDialog(null); });
    $('#newProductTop').addEventListener('click', function () { openProductDialog(null); });
    $('#quickProduct').addEventListener('click', function () { openProductDialog(null); });

    els.productSearch.addEventListener('input', function () {
      state.search = els.productSearch.value;
      paintProducts();
    });
    $('#clearProductSearch').addEventListener('click', function () {
      state.search = '';
      els.productSearch.value = '';
      paintProducts();
    });

    els.productsBody.addEventListener('click', function (event) {
      const edit = event.target.closest('[data-edit]');
      const del = event.target.closest('[data-delete]');
      if (edit) {
        const product = state.products.find(function (p) { return p.id === edit.getAttribute('data-edit'); });
        if (product) openProductDialog(product);
      }
      if (del) deleteProduct(del.getAttribute('data-delete'));
    });
    els.productsBody.addEventListener('change', function (event) {
      const toggle = event.target.closest('[data-toggle]');
      if (toggle) toggleAvailability(toggle.getAttribute('data-toggle'), toggle.checked);
    });

    $$('[data-close-product]').forEach(function (button) {
      button.addEventListener('click', function () { els.productDialog.close(); });
    });
    els.productDialog.addEventListener('close', lockScroll);
    els.productForm.addEventListener('submit', saveProduct);

    $('#pImageFile').addEventListener('change', function (event) {
      handleImageFile(event.target.files && event.target.files[0]);
      event.target.value = '';
    });
    $('#pImageUrl').addEventListener('change', function () {
      const value = $('#pImageUrl').value.trim();
      state.pendingImage = value;
      paintImagePreview();
      clearProductErrors();
    });
    $('#pRemoveImage').addEventListener('click', function () {
      state.pendingImage = '';
      $('#pImageUrl').value = '';
      $('#pImageFile').value = '';
      paintImagePreview();
    });

    /* Pedidos */
    els.orderFilters.addEventListener('click', function (event) {
      const chip = event.target.closest('[data-status]');
      if (!chip) return;
      state.statusFilter = chip.getAttribute('data-status');
      $$('.chip', els.orderFilters).forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      paintOrders();
    });
    els.ordersBody.addEventListener('click', function (event) {
      const view = event.target.closest('[data-view-order]');
      if (view) openOrder(view.getAttribute('data-view-order'));
    });
    els.ordersBody.addEventListener('change', function (event) {
      const select = event.target.closest('[data-order-status]');
      if (select) changeOrderStatus(select.getAttribute('data-order-status'), select.value);
    });
    $$('[data-close-order]').forEach(function (button) {
      button.addEventListener('click', function () { els.orderDialog.close(); });
    });
    els.orderDialog.addEventListener('close', lockScroll);
    $('#deleteOrderBtn').addEventListener('click', deleteOrder);

    /* Configuración */
    $('#saveConfigBtn').addEventListener('click', saveConfig);
    els.pinForm.addEventListener('submit', changePin);
    $('#exportBtn').addEventListener('click', downloadBackup);
    $('#exportOrdersBtn').addEventListener('click', downloadBackup);
    els.importInput.addEventListener('change', function (event) {
      importBackup(event.target.files && event.target.files[0]);
    });

    $('#resetProductsBtn').addEventListener('click', async function () {
      const ok = await askConfirm({
        title: 'Restaurar productos',
        text: 'Se reemplazarán los productos actuales por los seis postres de ejemplo. Los pedidos no se tocan.',
        okLabel: 'Restaurar',
        danger: false
      });
      if (!ok) return;
      Store.resetProducts();
      refreshData();
      markSaved();
      toast('Productos de ejemplo restaurados.', 'ok');
    });

    $('#resetAllBtn').addEventListener('click', async function () {
      const ok = await askConfirm({
        title: 'Borrar todos los datos',
        text: 'Se eliminarán productos, pedidos, carrito y configuración de este navegador. El PIN se conserva.',
        okLabel: 'Borrar todo',
        danger: true
      });
      if (!ok) return;
      Store.resetAll();
      refreshData();
      toast('Datos restablecidos a la configuración inicial.', 'ok');
    });

    /* Confirmación */
    $('#confirmOk').addEventListener('click', function () { resolveConfirm(true); });
    $('#confirmCancel').addEventListener('click', function () { resolveConfirm(false); });
    els.confirmDialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      resolveConfirm(false);
    });
    els.confirmDialog.addEventListener('close', function () {
      if (state.confirmResolver) resolveConfirm(false);
      lockScroll();
    });

    /* Sincronización entre pestañas */
    window.addEventListener('storage', function (event) {
      if (!event.key) return;
      if ([Store.KEYS.products, Store.KEYS.orders, Store.KEYS.config].indexOf(event.key) !== -1) {
        refreshData();
      }
    });

    window.addEventListener('hashchange', function () {
      const hash = (location.hash || '').replace('#', '');
      if (VIEWS[hash]) navigate(hash);
    });
  }

  boot();
})();
