let cart = [];
let stripeKey = null;

fetch('/api/stripe-key').then(r => r.json()).then(d => { stripeKey = d.key; });

function parsePrice(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[€\s]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function cartTotal() {
  return cart.reduce((s, i) => s + parsePrice(i.precio) * i.cantidad, 0);
}

function addToCart(nombre, precio) {
  const existing = cart.find(i => i.nombre === nombre);
  if (existing) existing.cantidad++;
  else cart.push({ nombre, precio, cantidad: 1 });
  renderCart();
  updateBadge();
}

function removeFromCart(nombre) {
  cart = cart.filter(i => i.nombre !== nombre);
  renderCart();
  updateBadge();
}

function changeQty(nombre, delta) {
  const item = cart.find(i => i.nombre === nombre);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) removeFromCart(nombre);
  else { renderCart(); updateBadge(); }
}

function updateBadge() {
  const total = cart.reduce((s, i) => s + i.cantidad, 0);
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = total;
  badge.classList.toggle('visible', total > 0);
}

function toggleCart() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer.classList.toggle('open');
  overlay.classList.toggle('visible');
}

function renderCart() {
  const list = document.getElementById('cart-items');
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>';
    document.querySelector('#cart-drawer .cart-footer').style.visibility = 'hidden';
    return;
  }

  document.querySelector('#cart-drawer .cart-footer').style.visibility = 'visible';
  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span class="cart-item-name">${item.nombre}</span>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty('${item.nombre.replace(/'/g, "\\'")}', -1)">−</button>
        <span class="qty-display">${item.cantidad}</span>
        <button class="qty-btn" onclick="changeQty('${item.nombre.replace(/'/g, "\\'")}', 1)">+</button>
      </div>
      <span class="cart-item-price">${(parsePrice(item.precio) * item.cantidad).toFixed(2)}€</span>
      <button class="btn-remove-item" onclick="removeFromCart('${item.nombre.replace(/'/g, "\\'")}')">✕</button>
    </div>
  `).join('');

  document.getElementById('cart-total-amount').textContent = cartTotal().toFixed(2) + '€';
}

function openCheckout() {
  if (!cart.length) return;
  toggleCart();
  document.getElementById('checkout-modal').classList.add('open');

  const list = document.getElementById('checkout-items-list');
  list.innerHTML = cart.map(i =>
    `<div class="checkout-item-row"><span>${i.nombre} ×${i.cantidad}</span><span>${(parsePrice(i.precio) * i.cantidad).toFixed(2)}€</span></div>`
  ).join('');
  document.getElementById('checkout-total').textContent = cartTotal().toFixed(2) + '€';

  // Stripe option
  const opts = document.getElementById('payment-options');
  const existing = opts.querySelector('[data-stripe]');
  if (stripeKey && !existing) {
    const label = document.createElement('label');
    label.className = 'payment-option';
    label.dataset.stripe = '1';
    label.innerHTML = `<input type="radio" name="pago" value="stripe" /><label>💳 Pagar online (tarjeta)</label>`;
    opts.appendChild(label);
  }
}

function closeCheckout() {
  document.getElementById('checkout-modal').classList.remove('open');
}

function toggleDireccion() {
  const tipo = document.getElementById('checkout-tipo').value;
  document.getElementById('checkout-direccion-group').style.display = tipo === 'domicilio' ? 'flex' : 'none';
}

async function submitPedido() {
  const nombre = document.getElementById('checkout-nombre').value.trim();
  const email = document.getElementById('checkout-email').value.trim();
  const telefono = document.getElementById('checkout-telefono').value.trim();
  const tipo = document.getElementById('checkout-tipo').value;
  const direccion = document.getElementById('checkout-direccion').value.trim();
  const pago = document.querySelector('input[name="pago"]:checked')?.value;

  if (!nombre || !email) return showToast('Nombre y email son obligatorios');
  if (tipo === 'domicilio' && !direccion) return showToast('Introduce tu dirección de entrega');
  if (!pago) return showToast('Selecciona una forma de pago');

  const btn = document.querySelector('#checkout-modal .btn-checkout');
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const res = await fetch('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nombre: nombre,
        cliente_email: email,
        cliente_telefono: telefono || undefined,
        tipo,
        direccion: tipo === 'domicilio' ? direccion : undefined,
        pago,
        items: cart,
        total: cartTotal(),
      }),
    });
    const data = await res.json();

    if (!res.ok) { showToast(data.error || 'Error al procesar el pedido'); btn.disabled = false; btn.textContent = 'Confirmar pedido →'; return; }
    if (data.url) { window.location.href = data.url; return; }

    cart = [];
    renderCart();
    updateBadge();
    closeCheckout();
    showToast('✅ ¡Pedido recibido! Te contactaremos en breve.');
  } catch {
    showToast('Error de conexión. Inténtalo de nuevo.');
    btn.disabled = false;
    btn.textContent = 'Confirmar pedido →';
  }
}

function showToast(msg) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 4000);
}

async function submitSuscripcion() {
  const email = document.getElementById('suscribir-email').value.trim();
  if (!email) return;
  const res = await fetch('/api/suscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const msg = document.getElementById('suscribir-msg');
  msg.style.display = 'block';
  if (res.ok) {
    msg.textContent = '✓ ¡Apuntado! Pronto recibirás nuestras novedades.';
    msg.style.color = '#6dc47b';
  } else {
    msg.textContent = 'Error al suscribir. Inténtalo de nuevo.';
  }
}

// Stripe return
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('pedido') === 'ok') { showToast('✅ ¡Pago completado! Tu pedido está en camino.'); history.replaceState({}, '', '/'); }
  if (params.get('pedido') === 'cancelado') { showToast('❌ Pago cancelado.'); history.replaceState({}, '', '/'); }
});
