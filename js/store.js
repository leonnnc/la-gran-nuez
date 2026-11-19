/* ============================================================
   La Gran Nuez — Capa de datos compartida (tienda + panel)
   Persistencia: localStorage
   ============================================================ */
(function (global) {
  'use strict';

  const KEYS = {
    products: 'lgn.products.v1',
    cart: 'lgn.cart.v1',
    orders: 'lgn.orders.v1',
    config: 'lgn.config.v1',
    pin: 'lgn.pin.v1'
  };

  const SESSION_KEY = 'lgn.panel.session';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 horas

  const CATEGORIES = [
    { id: 'tortas', label: 'Tortas' },
    { id: 'postres', label: 'Postres' },
    { id: 'queques', label: 'Queques' }
  ];

  const SEED_PRODUCTS = [
    {
      id: 'p-torta-chocolate',
      name: 'Torta de Chocolate',
      category: 'tortas',
      price: 8,
      description: 'Bizcocho húmedo de cacao con cobertura de chocolate y chispas.',
      image: 'assets/img/torta-chocolate.jpg',
      badge: 'Más vendido',
      available: true,
      createdAt: '2026-11-01T09:00:00.000Z'
    },
    {
      id: 'p-crema-volteada',
      name: 'Crema Volteada',
      category: 'postres',
      price: 7,
      description: 'Clásico flan de caramelo, suave y con el punto justo de dulce.',
      image: 'assets/img/crema-volteada.jpg',
      badge: '',
      available: true,
      createdAt: '2026-11-01T09:01:00.000Z'
    },
    {
      id: 'p-budin',
      name: 'Budín',
      category: 'queques',
      price: 3.5,
      description: 'Budín casero esponjoso, perfecto para acompañar el café de la tarde.',
      image: 'assets/img/budin.jpg',
      badge: '',
      available: true,
      createdAt: '2026-11-01T09:02:00.000Z'
    },
    {
      id: 'p-torta-red-velvet',
      name: 'Torta Red Velvet',
      category: 'tortas',
      price: 8,
      description: 'Bizcocho red velvet con frosting de queso crema y lluvia de migas.',
      image: 'assets/img/torta-red-velvet.jpg',
      badge: 'Favorito',
      available: true,
      createdAt: '2026-11-01T09:03:00.000Z'
    },
    {
      id: 'p-queque-naranja',
      name: 'Queque de Naranja',
      category: 'queques',
      price: 4,
      description: 'Queque de naranja recién horneado, aromático y con jugo natural.',
      image: 'assets/img/queque-naranja.jpg',
      badge: '',
      available: true,
      createdAt: '2026-11-01T09:04:00.000Z'
    },
    {
      id: 'p-queque-vainilla',
      name: 'Queque de Vainilla',
      category: 'queques',
      price: 4,
      description: 'Clásico queque de vainilla, esponjoso, tierno y aromático.',
      image: 'assets/img/queque-vainilla.jpg',
      badge: '',
      available: true,
      createdAt: '2026-11-01T09:05:00.000Z'
    }
  ];

  const DEFAULT_CONFIG = {
    brand: 'La Gran Nuez',
    tagline: 'Postres caseros',
    announcement: 'Pedidos con 24 horas de anticipación · Delivery en Lima',
    whatsapp: '51922678663',
    phone: '922 678 663',
    hours: 'Lun a Sáb · 9:00 a 19:00',
    address: 'Lima, Perú',
    yape: '922 678 663',
    plin: '922 678 663',
    bankInfo: 'Coordina tu transferencia por WhatsApp',
    deliveryFee: 3,
    freeDeliveryFrom: 30,
    minAdvanceDays: 1,
    instagram: '',
    facebook: ''
  };

  /* ---------- Utilidades básicas ---------- */

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return clone(fallback);
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? clone(fallback) : parsed;
    } catch (err) {
      console.warn('[La Gran Nuez] No se pudo leer', key, err);
      return clone(fallback);
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[La Gran Nuez] No se pudo guardar', key, err);
      if (err && err.name === 'QuotaExceededError') {
        throw new Error('El almacenamiento del navegador está lleno. Usa imágenes más ligeras.');
      }
      throw new Error('No se pudo guardar la información en este navegador.');
    }
  }

  const money = (n) => 'S/ ' + (Number(n) || 0).toFixed(2);

  function uid(prefix) {
    const base = (prefix || 'id') + '-' + Date.now().toString(36);
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return base + '-' + global.crypto.randomUUID().slice(0, 8);
    }
    return base + '-' + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function parseISODate(iso) {
    const parts = String(iso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(iso, days) {
    const d = parseISODate(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + Number(days || 0));
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function formatDate(iso) {
    const d = parseISODate(iso);
    if (!d) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  }

  function formatDateTime(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  /* ---------- Productos ---------- */

  function getProducts() {
    const list = readJSON(KEYS.products, null);
    if (!Array.isArray(list)) return clone(SEED_PRODUCTS);
    return list;
  }

  function saveProducts(list) {
    if (!Array.isArray(list)) throw new Error('Lista de productos inválida.');
    writeJSON(KEYS.products, list);
  }

  function resetProducts() {
    writeJSON(KEYS.products, clone(SEED_PRODUCTS));
  }

  function categoryLabel(id) {
    const found = CATEGORIES.find((c) => c.id === id);
    return found ? found.label : 'Otros';
  }

  /* ---------- Configuración ---------- */

  function getConfig() {
    const saved = readJSON(KEYS.config, {});
    const cfg = Object.assign({}, DEFAULT_CONFIG, saved || {});
    ['deliveryFee', 'freeDeliveryFrom', 'minAdvanceDays'].forEach((k) => {
      const n = Number(cfg[k]);
      cfg[k] = isNaN(n) || n < 0 ? DEFAULT_CONFIG[k] : n;
    });
    return cfg;
  }

  function saveConfig(patch) {
    const cfg = Object.assign({}, getConfig(), patch || {});
    writeJSON(KEYS.config, cfg);
    return cfg;
  }

  /* ---------- Carrito ---------- */

  function getCart() {
    const cart = readJSON(KEYS.cart, []);
    if (!Array.isArray(cart)) return [];
    return cart
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({ id: item.id, qty: Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1)) }));
  }

  function saveCart(cart) {
    writeJSON(KEYS.cart, cart);
  }

  function addToCart(id, qty) {
    const amount = Math.max(1, parseInt(qty, 10) || 1);
    const cart = getCart();
    const found = cart.find((item) => item.id === id);
    if (found) {
      found.qty = Math.min(99, found.qty + amount);
    } else {
      cart.push({ id: id, qty: amount });
    }
    saveCart(cart);
    return cart;
  }

  function setCartQty(id, qty) {
    const amount = parseInt(qty, 10) || 0;
    let cart = getCart();
    if (amount <= 0) {
      cart = cart.filter((item) => item.id !== id);
    } else {
      const found = cart.find((item) => item.id === id);
      if (found) found.qty = Math.min(99, amount);
    }
    saveCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    const cart = getCart().filter((item) => item.id !== id);
    saveCart(cart);
    return cart;
  }

  function clearCart() {
    saveCart([]);
  }

  function cartCount(cart) {
    return (cart || getCart()).reduce((sum, item) => sum + item.qty, 0);
  }

  /* ---------- Pedidos ---------- */

  function getOrders() {
    const list = readJSON(KEYS.orders, []);
    return Array.isArray(list) ? list : [];
  }

  function saveOrders(list) {
    writeJSON(KEYS.orders, list);
  }

  function addOrder(order) {
    const list = getOrders();
    list.unshift(order);
    saveOrders(list);
    return order;
  }

  function updateOrder(id, patch) {
    const list = getOrders().map((order) =>
      order.id === id ? Object.assign({}, order, patch) : order
    );
    saveOrders(list);
    return list;
  }

  function removeOrder(id) {
    const list = getOrders().filter((order) => order.id !== id);
    saveOrders(list);
    return list;
  }

  function newOrderCode() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
    const rnd = Math.floor(Math.random() * 9000 + 1000);
    return 'LGN-' + stamp + '-' + rnd;
  }

  /* ---------- Seguridad del panel (PIN local) ---------- */

  function fallbackHash(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = (h1 ^ c) * 0x01000193;
      h2 = (h2 + c * (i + 1)) >>> 0;
      h1 >>>= 0;
    }
    return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
  }

  async function hashPin(pin) {
    const text = 'lgn::' + String(pin);
    if (global.crypto && global.crypto.subtle && global.TextEncoder) {
      const data = new TextEncoder().encode(text);
      const buffer = await global.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return fallbackHash(text);
  }

  async function ensurePin() {
    if (localStorage.getItem(KEYS.pin)) return;
    const hash = await hashPin('1234');
    localStorage.setItem(KEYS.pin, hash);
  }

  async function verifyPin(pin) {
    const stored = localStorage.getItem(KEYS.pin);
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
  }

  async function setPin(pin) {
    const value = String(pin || '');
    if (!/^\d{4,8}$/.test(value)) {
      throw new Error('El PIN debe tener entre 4 y 8 dígitos.');
    }
    localStorage.setItem(KEYS.pin, await hashPin(value));
  }

  function saveSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now() }));
    } catch (err) {
      /* sessionStorage puede no estar disponible; se ignora */
    }
  }

  function hasSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.at) return false;
      if (Date.now() - data.at > SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* noop */
    }
  }

  /* ---------- Backup ---------- */

  function exportData() {
    return {
      app: 'la-gran-nuez',
      version: 1,
      exportedAt: new Date().toISOString(),
      products: getProducts(),
      config: getConfig(),
      orders: getOrders(),
      pin: localStorage.getItem(KEYS.pin)
    };
  }

  function importData(data) {
    if (!data || data.app !== 'la-gran-nuez') {
      throw new Error('El archivo no es un respaldo válido de La Gran Nuez.');
    }
    if (!Array.isArray(data.products)) throw new Error('El respaldo no contiene productos válidos.');
    writeJSON(KEYS.products, data.products);
    if (data.config && typeof data.config === 'object') {
      writeJSON(KEYS.config, Object.assign({}, DEFAULT_CONFIG, data.config));
    }
    if (Array.isArray(data.orders)) writeJSON(KEYS.orders, data.orders);
    if (typeof data.pin === 'string' && data.pin) localStorage.setItem(KEYS.pin, data.pin);
  }

  function resetAll() {
    [KEYS.products, KEYS.cart, KEYS.orders, KEYS.config].forEach((key) => localStorage.removeItem(key));
  }

  global.Store = {
    KEYS: KEYS,
    SESSION_KEY: SESSION_KEY,
    CATEGORIES: CATEGORIES,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    SEED_PRODUCTS: SEED_PRODUCTS,
    money: money,
    uid: uid,
    todayISO: todayISO,
    addDays: addDays,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    getProducts: getProducts,
    saveProducts: saveProducts,
    resetProducts: resetProducts,
    categoryLabel: categoryLabel,
    getConfig: getConfig,
    saveConfig: saveConfig,
    getCart: getCart,
    saveCart: saveCart,
    addToCart: addToCart,
    setCartQty: setCartQty,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    cartCount: cartCount,
    getOrders: getOrders,
    addOrder: addOrder,
    updateOrder: updateOrder,
    removeOrder: removeOrder,
    newOrderCode: newOrderCode,
    hashPin: hashPin,
    ensurePin: ensurePin,
    verifyPin: verifyPin,
    setPin: setPin,
    saveSession: saveSession,
    hasSession: hasSession,
    clearSession: clearSession,
    exportData: exportData,
    importData: importData,
    resetAll: resetAll
  };
})(window);
