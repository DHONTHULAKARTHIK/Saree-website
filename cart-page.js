/* ─────────────────────────────────────────────
   cart-page.js  –  Cart page logic
   Used on: cart.html
───────────────────────────────────────────── */

function formatPrice(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function getDiscount(qty) {
  if (qty >= 25) return 30;
  if (qty >= 20) return 25;
  if (qty >= 15) return 20;
  if (qty >= 10) return 15;
  if (qty >= 5)  return 10;
  return 0;
}

function renderCart() {
  updateBadge();
  const cart     = getCart();
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  const emptyEl  = document.getElementById('cart-empty');
  const bodyEl   = document.getElementById('cart-body');
  const countTxt = document.getElementById('cart-count-text');

  if (cart.length === 0) {
    emptyEl.classList.add('show');
    bodyEl.classList.remove('show');
    countTxt.textContent = 'No items in cart';
    return;
  }

  emptyEl.classList.remove('show');
  bodyEl.classList.add('show');
  countTxt.textContent = totalQty + ' item' + (totalQty !== 1 ? 's' : '') + ' in your cart';

  // Build item list
  const list = document.getElementById('cart-items-list');
  list.innerHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}" class="cart-item-img" onerror="this.src='sarees/p1.jpg'">
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${formatPrice(item.price)} each</span>
        <span class="cart-item-subtotal">${formatPrice(item.price * item.qty)}</span>
      </div>
      <div class="cart-item-controls">
        <div class="cart-qty">
          <button class="cart-qty-btn" onclick="updateQty('${item.id}', -1)">&#8722;</button>
          <span class="cart-qty-count">${item.qty}</span>
          <button class="cart-qty-btn" onclick="updateQty('${item.id}', 1)">&#43;</button>
        </div>
        <button class="remove-btn" onclick="removeItem('${item.id}')">Remove</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Subtotal
  document.getElementById('summary-subtotal').textContent = formatPrice(subtotal);

  // Discount
  const discountPct = getDiscount(totalQty);
  const discountAmt = Math.round(subtotal * discountPct / 100);
  const finalTotal  = subtotal - discountAmt;

  const discountRow   = document.getElementById('discount-row');
  const discountLabel = document.getElementById('discount-label');
  const discountEl    = document.getElementById('summary-discount');

  if (discountPct > 0) {
    discountRow.style.display = '';
    discountLabel.textContent = `Discount (${discountPct}% off – ${totalQty} items)`;
    discountEl.textContent    = `- ${formatPrice(discountAmt)}`;
  } else {
    discountRow.style.display = 'none';
  }

  // Next tier hint
  const nextTiers = [5, 10, 15, 20, 25];
  const nextTier  = nextTiers.find(t => t > totalQty);
  const hintEl    = document.getElementById('discount-hint');
  if (hintEl) {
    if (nextTier) {
      const nextPct = getDiscount(nextTier);
      hintEl.textContent = `Add ${nextTier - totalQty} more saree(s) to get ${nextPct}% off!`;
      hintEl.style.display = '';
    } else {
      hintEl.textContent = '🎉 Maximum 30% discount applied!';
      hintEl.style.display = '';
    }
  }

  document.getElementById('summary-total').textContent = formatPrice(finalTotal);
}

function updateQty(id, delta) {
  let cart = getCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  renderCart();
}

function removeItem(id) {
  saveCart(getCart().filter(i => i.id !== id));
  renderCart();
}

let selectedAddressString = "";

function openAddressModal() {
  const cart = getCart();
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  
  const modal = document.getElementById('address-modal');
  const userStr = localStorage.getItem('lakshmanna_current_user');
  const listContainer = document.getElementById('saved-addresses-container');
  const list = document.getElementById('saved-addresses-list');
  
  list.innerHTML = '';
  selectedAddressString = "";
  document.getElementById('custom-address-input').value = "";
  document.getElementById('modal-msg').style.display = 'none';

  if (userStr) {
    const user = JSON.parse(userStr);
    const addrs = localStorage.getItem('lakshmanna_addresses_' + user.email);
    if (addrs) {
      const parsedAddrs = JSON.parse(addrs);
      if (parsedAddrs.length > 0) {
        listContainer.style.display = 'block';
        parsedAddrs.forEach((addr, idx) => {
          const addrStr = `${addr.name}\n${addr.street}, ${addr.city}\n${addr.state} - ${addr.pin}`;
          const div = document.createElement('div');
          div.className = 'modal-addr-card';
          div.innerHTML = `<h4>${addr.name}</h4><p>${addr.street}, ${addr.city}</p>`;
          div.onclick = () => selectAddress(div, addrStr);
          list.appendChild(div);
        });
      } else {
        listContainer.style.display = 'none';
      }
    } else {
      listContainer.style.display = 'none';
    }
  } else {
    listContainer.style.display = 'none';
  }
  
  modal.classList.add('show');
}

function closeAddressModal() {
  document.getElementById('address-modal').classList.remove('show');
}

function selectAddress(element, addrStr) {
  document.querySelectorAll('.modal-addr-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  selectedAddressString = addrStr;
  document.getElementById('custom-address-input').value = ""; // clear custom input
  if (document.getElementById('custom-pin-input')) {
    document.getElementById('custom-pin-input').value = "";
  }
}

async function confirmCheckout() {
  const customStr = document.getElementById('custom-address-input').value.trim();
  const pinInput  = document.getElementById('custom-pin-input');
  const customPin = pinInput ? pinInput.value.trim() : '';

  let manualAddress = '';
  if (customStr) {
    manualAddress = customStr + (customPin ? `\nPIN Code: ${customPin}` : '');
  }

  const finalAddr = manualAddress || selectedAddressString;
  const msgEl = document.getElementById('modal-msg');

  if (!finalAddr) {
    msgEl.textContent = 'Please select or enter a delivery address.';
    msgEl.style.display = 'block';
    return;
  }

  if (customStr && !customPin && pinInput) {
    msgEl.textContent = 'Please provide your PIN Code as well.';
    msgEl.style.display = 'block';
    return;
  }

  msgEl.style.display = 'none';

  // Collect cart totals
  const cart     = getCart();
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = Math.round(subtotal * getDiscount(totalQty) / 100);
  const total    = subtotal - discount;

  // Identify user
  const userStr = localStorage.getItem('lakshmanna_current_user');
  let userEmail = 'Guest Customer';
  if (userStr) {
    try { userEmail = JSON.parse(userStr).email; } catch(e) {}
  }

  // Disable button while processing
  const submitBtn = document.querySelector('.checkout-submit-btn');
  if (submitBtn) { submitBtn.textContent = 'Placing Order…'; submitBtn.disabled = true; }

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        order: {
          items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, img: i.img })),
          total,
          address: finalAddr
        }
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');

    // Clear cart and close modal
    localStorage.removeItem(CART_KEY);
    closeAddressModal();
    renderCart();

    // Show success overlay
    showOrderSuccess(data.orderId, total);

  } catch (err) {
    console.error('Order failed:', err);
    msgEl.textContent = '❌ Failed to place order. Please try again.';
    msgEl.style.display = 'block';
  } finally {
    if (submitBtn) { submitBtn.textContent = 'Proceed to Checkout'; submitBtn.disabled = false; }
  }
}

function showOrderSuccess(orderId, total) {
  // Remove existing overlay if any
  const existing = document.getElementById('order-success-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'order-success-overlay';
  overlay.innerHTML = `
    <div class="order-success-box">
      <div class="success-tick">✅</div>
      <h2>Order Placed!</h2>
      <p>Your order has been received and the owner has been notified.</p>
      <div class="success-details">
        <span>Order ID: <strong>${orderId}</strong></span>
        <span>Total: <strong>${formatPrice(total)}</strong></span>
      </div>
      <p class="success-note">You can track the status in <a href="profile.html">My Orders</a>.</p>
      <button onclick="document.getElementById('order-success-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  // Auto-remove after 12 seconds
  setTimeout(() => overlay.remove(), 12000);
}

// Init on page load
document.addEventListener('DOMContentLoaded', renderCart);
