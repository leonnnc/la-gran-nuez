/* ============================================================
   La Gran Nuez — Capa de datos (Firebase: Auth + Firestore)
   Sin localStorage para datos de la aplicación.
   ============================================================ */
import { db, auth } from "./firebase.js";
import { ADMIN_EMAILS } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const CATEGORIES = [
  { id: "tortas", label: "Tortas" },
  { id: "postres", label: "Postres" },
  { id: "queques", label: "Queques" }
];

const SEED_PRODUCTS = [
  {
    id: "p-torta-chocolate",
    name: "Torta de Chocolate",
    category: "tortas",
    price: 8,
    description: "Bizcocho húmedo de cacao con cobertura de chocolate y chispas.",
    image: "assets/img/torta-chocolate.jpg",
    badge: "Más vendido",
    available: true,
    createdAt: "2026-11-01T09:00:00.000Z"
  },
  {
    id: "p-crema-volteada",
    name: "Crema Volteada",
    category: "postres",
    price: 7,
    description: "Clásico flan de caramelo, suave y con el punto justo de dulce.",
    image: "assets/img/crema-volteada.jpg",
    badge: "",
    available: true,
    createdAt: "2026-11-01T09:01:00.000Z"
  },
  {
    id: "p-budin",
    name: "Budín",
    category: "queques",
    price: 3.5,
    description: "Budín casero esponjoso, perfecto para acompañar el café de la tarde.",
    image: "assets/img/budin.jpg",
    badge: "",
    available: true,
    createdAt: "2026-11-01T09:02:00.000Z"
  },
  {
    id: "p-torta-red-velvet",
    name: "Torta Red Velvet",
    category: "tortas",
    price: 8,
    description: "Bizcocho red velvet con frosting de queso crema y lluvia de migas.",
    image: "assets/img/torta-red-velvet.jpg",
    badge: "Favorito",
    available: true,
    createdAt: "2026-11-01T09:03:00.000Z"
  },
  {
    id: "p-queque-naranja",
    name: "Queque de Naranja",
    category: "queques",
    price: 4,
    description: "Queque de naranja recién horneado, aromático y con jugo natural.",
    image: "assets/img/queque-naranja.jpg",
    badge: "",
    available: true,
    createdAt: "2026-11-01T09:04:00.000Z"
  },
  {
    id: "p-queque-vainilla",
    name: "Queque de Vainilla",
    category: "queques",
    price: 4,
    description: "Clásico queque de vainilla, esponjoso, tierno y aromático.",
    image: "assets/img/queque-vainilla.jpg",
    badge: "",
    available: true,
    createdAt: "2026-11-01T09:05:00.000Z"
  }
];

const DEFAULT_CONFIG = {
  brand: "La Gran Nuez",
  tagline: "Postres caseros",
  announcement: "Pedidos con 24 horas de anticipación · Delivery en Lima",
  whatsapp: "51922678663",
  phone: "922 678 663",
  hours: "Lun a Sáb · 9:00 a 19:00",
  address: "Lima, Perú",
  yape: "922 678 663",
  plin: "922 678 663",
  bankInfo: "Coordina tu transferencia por WhatsApp",
  deliveryFee: 3,
  freeDeliveryFrom: 30,
  minAdvanceDays: 1,
  instagram: "",
  facebook: ""
};

/* ---------- Utilidades puras ---------- */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const money = (n) => "S/ " + (Number(n) || 0).toFixed(2);

function uid(prefix) {
  const base = (prefix || "id") + "-" + Date.now().toString(36);
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return base + "-" + crypto.randomUUID().slice(0, 8);
  }
  return base + "-" + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function parseISODate(iso) {
  const parts = String(iso || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDays(iso, days) {
  const d = parseISODate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + Number(days || 0));
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function formatDate(iso) {
  const d = parseISODate(iso);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(d);
}

function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(d);
}

function categoryLabel(id) {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.label : "Otros";
}

function newOrderCode() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate());
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return "LGN-" + stamp + "-" + rnd;
}

function normalizeConfig(raw) {
  const cfg = Object.assign({}, DEFAULT_CONFIG, raw || {});
  ["deliveryFee", "freeDeliveryFrom", "minAdvanceDays"].forEach((k) => {
    const n = Number(cfg[k]);
    cfg[k] = isNaN(n) || n < 0 ? DEFAULT_CONFIG[k] : n;
  });
  return cfg;
}

function friendlyError(err, fallback) {
  if (!err) return fallback || "Ocurrió un error inesperado.";
  const code = err.code || "";
  if (code === "permission-denied") return "No tienes permiso para realizar esta acción.";
  if (code === "unavailable" || code === "failed-precondition") return "No hay conexión con Firebase. Revisa tu internet.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email") return "Correo o contraseña incorrectos.";
  if (code === "auth/too-many-requests") return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  if (code === "auth/network-request-failed") return "No se pudo conectar con Firebase. Revisa tu conexión.";
  if (code === "auth/operation-not-allowed") return "El inicio de sesión por correo no está habilitado en Firebase.";
  return fallback || err.message || "Ocurrió un error inesperado.";
}

/* ---------- Auth ---------- */

function isAdminEmail(email) {
  return ADMIN_EMAILS.indexOf(String(email || "").toLowerCase()) !== -1;
}

function onAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user && !isAdminEmail(user.email)) {
      signOut(auth);
      callback(null);
      return;
    }
    callback(user);
  });
}

async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
  if (!isAdminEmail(cred.user.email)) {
    await signOut(auth);
    const e = new Error("Este correo no tiene permisos de administrador.");
    e.code = "auth/not-admin";
    throw e;
  }
  return cred.user;
}

function logout() {
  return signOut(auth);
}

/* ---------- Configuración ---------- */

async function getConfig() {
  const snap = await getDoc(doc(db, "config", "store"));
  return normalizeConfig(snap.exists() ? snap.data() : {});
}

function subscribeConfig(callback, onError) {
  return onSnapshot(doc(db, "config", "store"), (snap) => {
    callback(normalizeConfig(snap.exists() ? snap.data() : {}));
  }, onError || console.error);
}

async function saveConfig(patch) {
  const current = await getConfig();
  const cfg = normalizeConfig(Object.assign({}, current, patch || {}));
  await setDoc(doc(db, "config", "store"), cfg, { merge: true });
  return cfg;
}

/* ---------- Productos ---------- */

function sortProducts(list) {
  return list.slice().sort((a, b) => {
    const ta = Date.parse(a.createdAt || 0) || 0;
    const tb = Date.parse(b.createdAt || 0) || 0;
    return ta - tb;
  });
}

async function getProducts() {
  const snap = await getDocs(collection(db, "products"));
  return sortProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function subscribeProducts(callback, onError) {
  const q = query(collection(db, "products"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError || console.error);
}

async function saveProduct(product) {
  const id = product.id || uid("p");
  const data = Object.assign({}, product, { id: id, createdAt: product.createdAt || new Date().toISOString() });
  await setDoc(doc(db, "products", id), data, { merge: false });
  return data;
}

async function updateProduct(id, patch) {
  await updateDoc(doc(db, "products", id), patch);
}

async function deleteProduct(id) {
  await deleteDoc(doc(db, "products", id));
}

async function seedProducts() {
  const batch = writeBatch(db);
  SEED_PRODUCTS.forEach((p) => {
    batch.set(doc(db, "products", p.id), clone(p));
  });
  await batch.commit();
}

/* ---------- Pedidos ---------- */

async function getOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function subscribeOrders(callback, onError) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError || console.error);
}

async function addOrder(order) {
  const data = Object.assign({}, order);
  delete data.id; // Firestore genera el id del documento
  const ref = await addDoc(collection(db, "orders"), data);
  return { id: ref.id, ...data };
}

async function updateOrder(id, patch) {
  await updateDoc(doc(db, "orders", id), patch);
}

async function deleteOrder(id) {
  await deleteDoc(doc(db, "orders", id));
}

/* ---------- Bootstrap / respaldo ---------- */

async function ensureBootstrap() {
  const [cfgSnap, prodSnap] = await Promise.all([
    getDoc(doc(db, "config", "store")),
    getDocs(collection(db, "products"))
  ]);
  const tasks = [];
  if (!cfgSnap.exists()) tasks.push(setDoc(doc(db, "config", "store"), clone(DEFAULT_CONFIG)));
  if (prodSnap.empty) tasks.push(seedProducts());
  if (tasks.length) await Promise.all(tasks);
}

async function importData(data) {
  if (!data || data.app !== "la-gran-nuez") {
    throw new Error("El archivo no es un respaldo válido de La Gran Nuez.");
  }
  if (!Array.isArray(data.products)) throw new Error("El respaldo no contiene productos válidos.");

  const existing = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "orders"))
  ]);
  const toDelete = [...existing[0].docs, ...existing[1].docs];

  // Firestore limita a 500 operaciones por batch
  for (let i = 0; i < toDelete.length; i += 450) {
    const batch = writeBatch(db);
    toDelete.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const ops = [];
  if (data.config && typeof data.config === "object") {
    ops.push(setDoc(doc(db, "config", "store"), normalizeConfig(data.config)));
  }
  for (let i = 0; i < data.products.length; i += 450) {
    const batch = writeBatch(db);
    data.products.slice(i, i + 450).forEach((p) => {
      const id = p.id || uid("p");
      batch.set(doc(db, "products", id), Object.assign({}, p, { id }));
    });
    ops.push(batch.commit());
  }
  if (Array.isArray(data.orders)) {
    for (let i = 0; i < data.orders.length; i += 450) {
      const batch = writeBatch(db);
      data.orders.slice(i, i + 450).forEach((o) => {
        const id = o.id || uid("order");
        batch.set(doc(db, "orders", id), Object.assign({}, o, { id }));
      });
      ops.push(batch.commit());
    }
  }
  await Promise.all(ops);
}

async function resetAll() {
  const [prodSnap, orderSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "orders"))
  ]);
  const toDelete = [...prodSnap.docs, ...orderSnap.docs];
  for (let i = 0; i < toDelete.length; i += 450) {
    const batch = writeBatch(db);
    toDelete.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await Promise.all([
    setDoc(doc(db, "config", "store"), clone(DEFAULT_CONFIG)),
    seedProducts()
  ]);
}

/* ---------- Carrito (en memoria, sin localStorage) ---------- */

let _cart = [];

function getCart() { return clone(_cart); }
function cartCount(cart) { return (cart || _cart).reduce((sum, item) => sum + item.qty, 0); }
function clearCart() { _cart = []; return _cart; }

function addToCart(id, qty) {
  const amount = Math.max(1, parseInt(qty, 10) || 1);
  const found = _cart.find((item) => item.id === id);
  if (found) found.qty = Math.min(99, found.qty + amount);
  else _cart.push({ id, qty: amount });
  return getCart();
}

function setCartQty(id, qty) {
  const amount = parseInt(qty, 10) || 0;
  if (amount <= 0) _cart = _cart.filter((item) => item.id !== id);
  else {
    const found = _cart.find((item) => item.id === id);
    if (found) found.qty = Math.min(99, amount);
  }
  return getCart();
}

function removeFromCart(id) {
  _cart = _cart.filter((item) => item.id !== id);
  return getCart();
}

/* ---------- Export ---------- */

export const Store = {
  CATEGORIES, SEED_PRODUCTS, DEFAULT_CONFIG, ADMIN_EMAILS,
  money, uid, todayISO, addDays, formatDate, formatDateTime, categoryLabel, newOrderCode,
  friendlyError, isAdminEmail, onAuth, login, logout,
  getConfig, subscribeConfig, saveConfig,
  getProducts, subscribeProducts, saveProduct, updateProduct, deleteProduct, seedProducts,
  getOrders, subscribeOrders, addOrder, updateOrder, deleteOrder,
  ensureBootstrap, importData, resetAll,
  getCart, cartCount, clearCart, addToCart, setCartQty, removeFromCart
};

if (typeof window !== "undefined") window.Store = Store;
