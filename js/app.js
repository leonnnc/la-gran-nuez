/* ============================================================
   La Gran Nuez — Tienda (Firebase + carrito + checkout)
   ============================================================ */
import { Store } from "./store.js";

const $ = (selector, root) => (root || document).querySelector(selector);
const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

let cfg = Store.DEFAULT_CONFIG;
let products = [];
let cart = Store.getCart();
let filter = { category: "all", search: "" };
let checkoutOpening = false;

const els = {
  announce: $("#announceText"),
  productGrid: $("#productGrid"),
  productsCount: $("#productsCount"),
  catalogEmpty: $("#catalogEmpty"),
  search: $("#catalogSearch"),
  chips: $("#categoryChips"),
  cartCount: $("#cartCount"),
  openCart: $("#openCart"),
  cartDrawer: $("#cartDrawer"),
  cartBackdrop: $("#cartBackdrop"),
  closeCart: $("#closeCart"),
  cartItems: $("#cartItems"),
  cartEmpty: $("#cartEmpty"),
  cartEmptyCta: $("#cartEmptyCta"),
  cartFoot: $("#cartFoot"),
  cartSubtotal: $("#cartSubtotal"),
  cartHint: $("#cartHint"),
  goCheckout: $("#goCheckout"),
  checkoutDialog: $("#checkoutDialog"),
  checkoutForm: $("#checkoutForm"),
  checkoutItems: $("#checkoutItems"),
  sumSubtotal: $("#sumSubtotal"),
  sumDelivery: $("#sumDelivery"),
  sumTotal: $("#sumTotal"),
  deliveryRow: $("#deliveryRow"),
  freeShipNote: $("#freeShipNote"),
  addressField: $("#addressField"),
  customerAddress: $("#customerAddress"),
  orderDate: $("#orderDate"),
  deliveryDate: $("#deliveryDate"),
  deliveryHelp: $("#deliveryHelp"),
  payNote: $("#payNote"),
  successDialog: $("#successDialog"),
  successCode: $("#successCode"),
  successDetails: $("#successDetails"),
  sendWhatsapp: $("#sendWhatsapp"),
  keepShopping: $("#keepShopping"),
  toasts: $("#toasts")
};

/* ---------- Utilidades ---------- */

function escapeHTML(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function waist(text) {
  return "https://wa.me/" + String(cfg.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
}

function toast(message, type) {
  const el = document.createElement("div");
  el.className = "toast toast--" + (type || "info");
  const icon = type === "error" ? "⚠️" : type === "ok" ? "✅" : "🔔";
  el.innerHTML = '<span class="toast__icon" aria-hidden="true">' + icon + "</span><span>" + escapeHTML(message) + "</span>";
  els.toasts.appendChild(el);
  window.setTimeout(function () {
    el.classList.add("is-out");
    window.setTimeout(function () { el.remove(); }, 260);
  }, 3200);
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      area.remove();
    }
  });
}

function lockScroll() {
  const dialogOpen = els.checkoutDialog.open || els.successDialog.open;
  const cartOpen = els.cartDrawer.classList.contains("is-open");
  document.body.classList.toggle("no-scroll", dialogOpen || cartOpen);
}

function paymentLabel(id) {
  return { yape: "Yape", plin: "Plin", efectivo: "Efectivo", transferencia: "Transferencia" }[id] || "Por coordinar";
}

function productById(id) {
  return products.find(function (p) { return p.id === id; });
}

function setLoading(loading) {
  if (loading) {
    els.productGrid.innerHTML = '<p class="empty" style="grid-column:1/-1;border:0;background:transparent">Cargando productos…</p>';
  }
}

/* ---------- Configuración visible ---------- */

function waBaseMessage() {
  return "Hola " + cfg.brand + " 👋, quisiera hacer un pedido de postres. ¿Me ayudan, por favor?";
}

function paintConfig() {
  els.announce.textContent = cfg.announcement || "";
  $("#yapeNumber").textContent = cfg.yape;
  $("#plinNumber").textContent = cfg.plin;
  $("#contactPhone").textContent = cfg.phone;
  $("#contactHours").textContent = cfg.hours;
  $("#contactAddress").textContent = cfg.address;
  $("#footerHours").textContent = cfg.hours;
  $("#footerAddress").textContent = cfg.address;
  $("#year").textContent = new Date().getFullYear();
  $$("[data-wa-link]").forEach(function (link) {
    link.href = waist(waBaseMessage());
  });
  els.cartHint.textContent = cfg.freeDeliveryFrom > 0
    ? "Delivery " + Store.money(cfg.deliveryFee) + " · Gratis desde " + Store.money(cfg.freeDeliveryFrom) + "."
    : "Delivery " + Store.money(cfg.deliveryFee) + ".";
}

/* ---------- Catálogo ---------- */

function cardHTML(product) {
  const out = product.available === false;
  return "" +
    '<article class="product-card' + (out ? " is-out" : "") + '">' +
      '<div class="product-card__media">' +
        '<img src="' + escapeHTML(product.image) + '" alt="' + escapeHTML(product.name) + '" loading="lazy" width="600" height="375">' +
        (product.badge ? '<span class="product-card__badge">' + escapeHTML(product.badge) + "</span>" : "") +
        (out ? '<span class="product-card__badge product-card__badge--out">Agotado</span>' : "") +
        '<span class="product-card__cat">' + escapeHTML(Store.categoryLabel(product.category)) + "</span>" +
      "</div>" +
      '<div class="product-card__body">' +
        "<h3>" + escapeHTML(product.name) + "</h3>" +
        "<p>" + escapeHTML(product.description || "Preparado de forma casera y con ingredientes frescos.") + "</p>" +
        '<div class="product-card__foot">' +
          '<span class="price">' + Store.money(product.price) + "<small>por porción</small></span>" +
          '<button type="button" class="btn-add" data-add="' + escapeHTML(product.id) + '"' + (out ? " disabled" : "") + ">" +
            (out
              ? "Agotado"
              : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg> Agregar') +
          "</button>" +
        "</div>" +
      "</div>" +
    "</article>";
}

function visibleProducts() {
  const q = filter.search.trim().toLowerCase();
  return products.filter(function (product) {
    const matchCategory = filter.category === "all" || product.category === filter.category;
    const haystack = (product.name + " " + (product.description || "") + " " + Store.categoryLabel(product.category)).toLowerCase();
    return matchCategory && (!q || haystack.indexOf(q) !== -1);
  });
}

function paintProducts() {
  const list = visibleProducts();
  els.productGrid.innerHTML = list.map(cardHTML).join("");
  els.catalogEmpty.hidden = list.length > 0;

  const total = products.length;
  els.productsCount.textContent = total + (total === 1 ? " producto" : " productos");

  if (!products.length) {
    els.catalogEmpty.hidden = false;
    els.catalogEmpty.querySelector("h3").textContent = "Aún no hay productos";
    els.catalogEmpty.querySelector("p").textContent = "Muy pronto tendremos novedades. Escríbenos por WhatsApp para pedir algo especial.";
  } else if (!list.length) {
    els.catalogEmpty.querySelector("h3").textContent = "No encontramos ese postre";
    els.catalogEmpty.querySelector("p").textContent = "Prueba con otra palabra o revisa todas las categorías.";
  }
}

/* ---------- Carrito ---------- */

function paintCart() {
  cart = Store.getCart();
  const lines = cart
    .map(function (item) {
      const product = productById(item.id);
      return product ? { product: product, qty: item.qty } : null;
    })
    .filter(Boolean);

  if (lines.length !== cart.length) {
    // limpiar productos que ya no existen
    cart = lines.map(function (line) { return { id: line.product.id, qty: line.qty }; });
    Store.clearCart();
    cart.forEach(function (item) { Store.addToCart(item.id, item.qty); });
    cart = Store.getCart();
  }

  const count = Store.cartCount(cart);
  els.cartCount.textContent = count;

  if (!lines.length) {
    els.cartItems.innerHTML = "";
    els.cartItems.hidden = true;
    els.cartEmpty.hidden = false;
    els.cartFoot.hidden = true;
    return;
  }

  els.cartItems.hidden = false;
  els.cartEmpty.hidden = true;
  els.cartFoot.hidden = false;

  let subtotal = 0;
  els.cartItems.innerHTML = lines.map(function (line) {
    const p = line.product;
    const lineTotal = Number(p.price) * line.qty;
    subtotal += lineTotal;
    return "" +
      '<article class="cart-item" data-id="' + escapeHTML(p.id) + '">' +
        '<img class="cart-item__img" src="' + escapeHTML(p.image) + '" alt="" width="72" height="64">' +
        '<div class="cart-item__info">' +
          "<h3>" + escapeHTML(p.name) + "</h3>" +
          "<small>" + Store.money(p.price) + " c/u</small>" +
          '<div class="cart-item__actions">' +
            '<div class="qty">' +
              '<button type="button" data-qty="-1" aria-label="Quitar una unidad de ' + escapeHTML(p.name) + '">−</button>' +
              '<span aria-live="polite">' + line.qty + "</span>" +
              '<button type="button" data-qty="1" aria-label="Agregar una unidad de ' + escapeHTML(p.name) + '">+</button>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="cart-item__right">' +
          "<strong>" + Store.money(lineTotal) + "</strong>" +
          '<button type="button" class="remove-btn" data-remove>Quitar</button>' +
        "</div>" +
      "</article>";
  }).join("");

  els.cartSubtotal.textContent = Store.money(subtotal);
}

function bumpCart() {
  els.cartCount.classList.remove("is-bump");
  void els.cartCount.offsetWidth;
  els.cartCount.classList.add("is-bump");
}

function openCart() {
  paintCart();
  els.cartBackdrop.hidden = false;
  els.cartDrawer.classList.add("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  window.requestAnimationFrame(function () { els.cartBackdrop.classList.add("is-visible"); });
  lockScroll();
  window.setTimeout(function () { els.closeCart.focus(); }, 120);
}

function closeCart() {
  els.cartDrawer.classList.remove("is-open");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  els.cartBackdrop.classList.remove("is-visible");
  window.setTimeout(function () {
    if (!els.cartDrawer.classList.contains("is-open")) els.cartBackdrop.hidden = true;
  }, 260);
  lockScroll();
  els.openCart.focus();
}

function addProduct(id) {
  const product = productById(id);
  if (!product || product.available === false) {
    toast("Ese producto no está disponible ahora.", "error");
    return;
  }
  Store.addToCart(id, 1);
  paintCart();
  bumpCart();
  toast(product.name + " se agregó al carrito.", "ok");
}

/* ---------- Checkout ---------- */

function currentFulfillment() {
  const checked = els.checkoutForm.querySelector('input[name="fulfillment"]:checked');
  return checked ? checked.value : "delivery";
}

function currentPayment() {
  const checked = els.checkoutForm.querySelector('input[name="payment"]:checked');
  return checked ? checked.value : "yape";
}

function checkoutLines() {
  cart = Store.getCart();
  return cart
    .map(function (item) {
      const product = productById(item.id);
      return product ? { product: product, qty: item.qty } : null;
    })
    .filter(Boolean);
}

function totals() {
  const lines = checkoutLines();
  const subtotal = lines.reduce(function (sum, line) {
    return sum + Number(line.product.price) * line.qty;
  }, 0);
  const fee = Number(cfg.deliveryFee) || 0;
  const freeFrom = Number(cfg.freeDeliveryFrom) || 0;
  let delivery = 0;
  if (currentFulfillment() === "delivery") {
    delivery = freeFrom > 0 && subtotal >= freeFrom ? 0 : fee;
  }
  return { subtotal: subtotal, delivery: delivery, total: subtotal + delivery, fee: fee, freeFrom: freeFrom };
}

function paintCheckout() {
  const lines = checkoutLines();
  els.checkoutItems.innerHTML = lines.map(function (line) {
    return "<li><span><b>" + line.qty + "×</b> " + escapeHTML(line.product.name) + "</span><span>" +
      Store.money(Number(line.product.price) * line.qty) + "</span></li>";
  }).join("");

  const t = totals();
  els.sumSubtotal.textContent = Store.money(t.subtotal);
  els.sumDelivery.textContent = t.delivery === 0 ? "Gratis" : Store.money(t.delivery);
  els.sumTotal.textContent = Store.money(t.total);
  els.deliveryRow.hidden = currentFulfillment() !== "delivery";

  if (currentFulfillment() === "pickup") {
    els.freeShipNote.textContent = "Recojo sin costo de delivery.";
  } else if (t.freeFrom > 0 && t.subtotal >= t.freeFrom) {
    els.freeShipNote.textContent = "¡Delivery gratis por tu compra!";
  } else if (t.freeFrom > 0 && t.fee > 0) {
    els.freeShipNote.textContent = "Te faltan " + Store.money(Math.max(0, t.freeFrom - t.subtotal)) + " para el delivery gratis.";
  } else if (t.fee === 0) {
    els.freeShipNote.textContent = "Delivery sin costo.";
  } else {
    els.freeShipNote.textContent = "";
  }

  const pay = currentPayment();
  if (pay === "yape") {
    els.payNote.textContent = "Yapea al " + cfg.yape + " y envíanos la captura por WhatsApp.";
  } else if (pay === "plin") {
    els.payNote.textContent = "Plin al " + cfg.plin + ". Envíanos la captura para confirmar.";
  } else if (pay === "efectivo") {
    els.payNote.textContent = "Paga en efectivo al recibir tu pedido o al recogerlo.";
  } else {
    els.payNote.textContent = cfg.bankInfo;
  }

  els.deliveryHelp.textContent = cfg.minAdvanceDays > 0
    ? "Mínimo " + cfg.minAdvanceDays + " día" + (cfg.minAdvanceDays === 1 ? "" : "s") + " de anticipación."
    : "Puedes pedir para hoy.";
}

function syncDates() {
  const advance = Math.max(0, Number(cfg.minAdvanceDays) || 0);
  const today = Store.todayISO();
  els.orderDate.min = today;

  if (!els.orderDate.value || els.orderDate.value < today) {
    els.orderDate.value = today;
  }

  const minDelivery = Store.addDays(els.orderDate.value, advance);
  els.deliveryDate.min = minDelivery;
  if (!els.deliveryDate.value || els.deliveryDate.value < minDelivery) {
    els.deliveryDate.value = minDelivery;
  }
}

function openCheckout() {
  if (!Store.getCart().length) {
    toast("Tu carrito está vacío. Agrega un postre primero.", "error");
    return;
  }
  closeCart();
  checkoutOpening = true;
  clearErrors();
  els.checkoutForm.reset();
  const deliveryRadio = els.checkoutForm.querySelector('input[name="fulfillment"][value="delivery"]');
  if (deliveryRadio) deliveryRadio.checked = true;
  const yapeRadio = els.checkoutForm.querySelector('input[name="payment"][value="yape"]');
  if (yapeRadio) yapeRadio.checked = true;

  syncDates();
  paintCheckout();
  toggleAddress();
  els.checkoutDialog.showModal();
  lockScroll();
  checkoutOpening = false;
  window.setTimeout(function () { $("#customerName").focus(); }, 150);
}

function toggleAddress() {
  const isDelivery = currentFulfillment() === "delivery";
  els.addressField.hidden = !isDelivery;
  els.customerAddress.required = isDelivery;
  if (!isDelivery) {
    els.customerAddress.value = "";
    clearError("customerAddress");
  }
}

function setError(name, message) {
  const slot = els.checkoutForm.querySelector('[data-error-for="' + name + '"]');
  if (slot) {
    slot.textContent = message;
    slot.classList.add("is-visible");
  }
  const field = els.checkoutForm.querySelector('[name="' + name + '"]');
  if (field) field.setAttribute("aria-invalid", "true");
}

function clearError(name) {
  const slot = els.checkoutForm.querySelector('[data-error-for="' + name + '"]');
  if (slot) {
    slot.textContent = "";
    slot.classList.remove("is-visible");
  }
  const field = els.checkoutForm.querySelector('[name="' + name + '"]');
  if (field) field.removeAttribute("aria-invalid");
}

function clearErrors() {
  $$("[data-error-for]", els.checkoutForm).forEach(function (slot) {
    slot.textContent = "";
    slot.classList.remove("is-visible");
  });
  $$("[aria-invalid]", els.checkoutForm).forEach(function (field) {
    field.removeAttribute("aria-invalid");
  });
}

function validateCheckout() {
  clearErrors();
  const name = $("#customerName").value.trim();
  const phoneRaw = $("#customerPhone").value.replace(/\D/g, "");
  const fulfillment = currentFulfillment();
  const address = $("#customerAddress").value.trim();
  const orderDate = els.orderDate.value;
  const deliveryDate = els.deliveryDate.value;
  const terms = $("#acceptTerms").checked;
  const advance = Math.max(0, Number(cfg.minAdvanceDays) || 0);
  const today = Store.todayISO();
  const minDelivery = Store.addDays(orderDate || today, advance);
  let firstError = null;

  if (name.length < 3) {
    setError("customerName", "Escribe tu nombre completo.");
    firstError = firstError || "customerName";
  }
  if (phoneRaw.length !== 9 || phoneRaw.charAt(0) !== "9") {
    setError("customerPhone", "Ingresa un celular peruano de 9 dígitos (empieza con 9).");
    firstError = firstError || "customerPhone";
  }
  if (fulfillment === "delivery" && address.length < 6) {
    setError("customerAddress", "Indica calle, número y distrito para la entrega.");
    firstError = firstError || "customerAddress";
  }
  if (!orderDate) {
    setError("orderDate", "Elige la fecha de tu pedido.");
    firstError = firstError || "orderDate";
  } else if (orderDate < today) {
    setError("orderDate", "La fecha de pedido no puede ser anterior a hoy.");
    firstError = firstError || "orderDate";
  }
  if (!deliveryDate) {
    setError("deliveryDate", "Elige la fecha de entrega.");
    firstError = firstError || "deliveryDate";
  } else if (orderDate && deliveryDate < minDelivery) {
    setError("deliveryDate", "La entrega debe ser desde el " + Store.formatDate(minDelivery) + ".");
    firstError = firstError || "deliveryDate";
  }
  if (!terms) {
    setError("acceptTerms", "Marca la casilla para continuar.");
    firstError = firstError || "acceptTerms";
  }

  if (firstError) {
    const el = els.checkoutForm.querySelector('[name="' + firstError + '"]');
    if (el && el.focus) el.focus();
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return null;
  }

  return {
    name: name,
    phone: phoneRaw,
    fulfillment: fulfillment,
    address: fulfillment === "delivery" ? address : "",
    orderDate: orderDate,
    deliveryDate: deliveryDate,
    payment: currentPayment(),
    notes: $("#orderNotes").value.trim(),
    terms: terms
  };
}

function buildOrder(data) {
  const lines = checkoutLines();
  const t = totals();
  return {
    code: Store.newOrderCode(),
    createdAt: new Date().toISOString(),
    customer: { name: data.name, phone: data.phone },
    fulfillment: data.fulfillment,
    address: data.address,
    orderDate: data.orderDate,
    deliveryDate: data.deliveryDate,
    payment: data.payment,
    paymentLabel: paymentLabel(data.payment),
    notes: data.notes,
    items: lines.map(function (line) {
      return {
        id: line.product.id,
        name: line.product.name,
        price: Number(line.product.price),
        qty: line.qty
      };
    }),
    subtotal: t.subtotal,
    deliveryFee: t.delivery,
    total: t.total,
    status: "pendiente"
  };
}

function orderMessage(order) {
  const lines = order.items.map(function (item) {
    return "• " + item.qty + " × " + item.name + " — " + Store.money(item.price * item.qty);
  }).join("\n");

  const entrega = order.fulfillment === "delivery"
    ? "Delivery" + (order.address ? "\nDirección: " + order.address : "")
    : "Recojo coordinado";

  return [
    "*NUEVO PEDIDO · " + cfg.brand + "*",
    "Código: " + order.code,
    "",
    "Cliente: " + order.customer.name,
    "Celular: " + order.customer.phone,
    entrega,
    "Fecha de pedido: " + Store.formatDate(order.orderDate),
    "Fecha de entrega: " + Store.formatDate(order.deliveryDate),
    "Método de pago: " + order.paymentLabel,
    "",
    "*Productos*",
    lines,
    "",
    "Subtotal: " + Store.money(order.subtotal),
    "Delivery: " + (order.deliveryFee === 0 ? "Gratis" : Store.money(order.deliveryFee)),
    "*Total: " + Store.money(order.total) + "*",
    order.notes ? "\nNotas: " + order.notes : "",
    "",
    "Pedido enviado desde la web de " + cfg.brand + "."
  ].filter(function (line) { return line !== null; }).join("\n").replace(/\n{3,}/g, "\n\n");
}

function paintSuccess(order) {
  els.successCode.textContent = order.code;
  els.successDetails.innerHTML = [
    ["Entrega", order.fulfillment === "delivery" ? "Delivery" : "Recojo"],
    ["Fecha de entrega", Store.formatDate(order.deliveryDate)],
    ["Método de pago", order.paymentLabel],
    ["Productos", String(order.items.reduce(function (s, i) { return s + i.qty; }, 0))],
    ["Total", Store.money(order.total)]
  ].map(function (row) {
    return "<div><span>" + escapeHTML(row[0]) + "</span><strong>" + escapeHTML(row[1]) + "</strong></div>";
  }).join("");
  els.sendWhatsapp.href = waist(orderMessage(order));
}

async function submitOrder(event) {
  event.preventDefault();
  if (!checkoutLines().length) {
    toast("Tu carrito quedó vacío. Vuelve a elegir tus postres.", "error");
    return;
  }
  const data = validateCheckout();
  if (!data) {
    toast("Revisa los campos marcados.", "error");
    return;
  }

  const btn = $("#confirmOrder");
  btn.disabled = true;
  btn.textContent = "Enviando pedido…";

  try {
    const order = buildOrder(data);
    const saved = await Store.addOrder(order);
    Store.clearCart();
    cart = [];
    paintCart();
    paintSuccess(saved);

    els.checkoutDialog.close();
    lockScroll();
    els.successDialog.showModal();
    lockScroll();
    window.setTimeout(function () { $("#sendWhatsapp").focus(); }, 160);
  } catch (err) {
    console.error(err);
    toast(Store.friendlyError(err, "No se pudo registrar el pedido. Inténtalo de nuevo."), "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Confirmar pedido <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  }
}

/* ---------- Eventos ---------- */

function bindEvents() {
  els.openCart.addEventListener("click", openCart);
  els.closeCart.addEventListener("click", closeCart);
  els.cartBackdrop.addEventListener("click", closeCart);
  els.cartEmptyCta.addEventListener("click", function () {
    closeCart();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  });

  els.productGrid.addEventListener("click", function (event) {
    const button = event.target.closest("[data-add]");
    if (button) addProduct(button.getAttribute("data-add"));
  });

  els.search.addEventListener("input", function () {
    filter.search = els.search.value;
    paintProducts();
  });

  els.chips.addEventListener("click", function (event) {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    filter.category = chip.getAttribute("data-category");
    $$(".chip", els.chips).forEach(function (c) { c.classList.toggle("is-active", c === chip); });
    paintProducts();
  });

  $("#resetFilters").addEventListener("click", function () {
    filter = { category: "all", search: "" };
    els.search.value = "";
    $$(".chip", els.chips).forEach(function (c) {
      c.classList.toggle("is-active", c.getAttribute("data-category") === "all");
    });
    paintProducts();
  });

  els.cartItems.addEventListener("click", function (event) {
    const row = event.target.closest(".cart-item");
    if (!row) return;
    const id = row.getAttribute("data-id");
    const qtyButton = event.target.closest("[data-qty]");
    const removeButton = event.target.closest("[data-remove]");

    if (qtyButton) {
      const current = Store.getCart().find(function (item) { return item.id === id; });
      const next = (current ? current.qty : 0) + Number(qtyButton.getAttribute("data-qty"));
      Store.setCartQty(id, next);
      paintCart();
      if (next > 0) bumpCart();
    } else if (removeButton) {
      Store.removeFromCart(id);
      paintCart();
      toast("Producto eliminado del carrito.");
    }
  });

  els.goCheckout.addEventListener("click", openCheckout);

  $$("[data-close-checkout]").forEach(function (button) {
    button.addEventListener("click", function () { els.checkoutDialog.close(); });
  });

  els.checkoutDialog.addEventListener("close", lockScroll);
  els.checkoutDialog.addEventListener("cancel", function () { window.setTimeout(lockScroll, 0); });
  els.successDialog.addEventListener("close", lockScroll);

  els.checkoutForm.addEventListener("change", function (event) {
    if (event.target.name === "fulfillment") { toggleAddress(); paintCheckout(); }
    if (event.target.name === "payment") paintCheckout();
  });

  els.orderDate.addEventListener("change", function () { syncDates(); paintCheckout(); });
  els.deliveryDate.addEventListener("change", function () { clearError("deliveryDate"); });

  ["customerName", "customerPhone", "customerAddress"].forEach(function (id) {
    const field = document.getElementById(id);
    if (field) field.addEventListener("input", function () { clearError(id); });
  });

  $("#acceptTerms").addEventListener("change", function () { clearError("acceptTerms"); });
  els.checkoutForm.addEventListener("submit", submitOrder);

  els.keepShopping.addEventListener("click", function () {
    els.successDialog.close();
    lockScroll();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  });

  $$("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      const kind = button.getAttribute("data-copy");
      const value = kind === "plin" ? cfg.plin : cfg.yape;
      copyText(value).then(function () {
        toast("Número copiado: " + value, "ok");
      }).catch(function () {
        toast("No se pudo copiar. Número: " + value, "error");
      });
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && els.cartDrawer.classList.contains("is-open")) closeCart();
  });

  window.addEventListener("scroll", function () {
    $("#siteHeader").classList.toggle("is-scrolled", window.scrollY > 8);
  }, { passive: true });
}

/* ---------- Inicio ---------- */

async function init() {
  paintConfig();
  setLoading(true);
  paintCart();
  bindEvents();
  syncDates();

  try {
    const [cfgData, prodData] = await Promise.all([Store.getConfig(), Store.getProducts()]);
    cfg = cfgData;
    products = prodData;
    paintConfig();
    paintProducts();
    paintCart();
  } catch (err) {
    console.error(err);
    els.productGrid.innerHTML = "";
    els.catalogEmpty.hidden = false;
    els.catalogEmpty.querySelector("h3").textContent = "No se pudo cargar el menú";
    els.catalogEmpty.querySelector("p").textContent = Store.friendlyError(err, "Revisa tu conexión e inténtalo de nuevo.");
  }

  // Suscripciones en tiempo real
  Store.subscribeConfig((next) => {
    cfg = next;
    paintConfig();
    paintCheckout();
  }, (err) => console.warn("Config:", err));

  Store.subscribeProducts((next) => {
    products = next;
    paintProducts();
    paintCart();
  }, (err) => console.warn("Productos:", err));
}

init();
