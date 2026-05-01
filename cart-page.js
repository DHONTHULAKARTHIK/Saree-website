/* ─────────────────────────────────────────────
   cart-page.js  –  Cart page logic with Razorpay
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

  // G – Apply coupon on top of tier discount
  let couponAmt = 0;
  if (activeCoupon) {
    if (activeCoupon.type === 'pct')  couponAmt = Math.round(finalTotal * activeCoupon.value / 100);
    if (activeCoupon.type === 'flat') couponAmt = Math.min(activeCoupon.value, finalTotal);
    const grandTotal = finalTotal - couponAmt;
    if (discountRow) {
      discountRow.style.display = '';
      discountLabel.textContent = discountPct > 0
        ? `Bulk Discount (${discountPct}%) + Coupon`
        : `Coupon (${activeCoupon.code})`;
      discountEl.textContent = `- ${formatPrice(discountAmt + couponAmt)}`;
    }
    document.getElementById('summary-total').textContent = formatPrice(grandTotal);
  } else {
    document.getElementById('summary-total').textContent = formatPrice(finalTotal);
  }
}

/* ── G: Coupon Code ── */
let activeCoupon = null; // { code, type:'pct'|'flat', value }

async function applyCoupon() {
  const code   = document.getElementById('coupon-input')?.value.trim().toUpperCase();
  const msgEl  = document.getElementById('coupon-msg');
  if (!code) return;

  msgEl.style.display = 'block';
  msgEl.style.color   = 'rgba(255,255,255,0.6)';
  msgEl.textContent   = 'Checking code...';

  try {
    const res  = await fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (!res.ok) {
      activeCoupon = null;
      msgEl.style.color = '#ff9090';
      msgEl.textContent = data.error || 'Invalid coupon code.';
    } else {
      activeCoupon = { code: data.code, type: data.type, value: data.value };
      msgEl.style.color = '#7ecb7e';
      const desc = data.type === 'pct' ? `${data.value}% off` : `₹${data.value} off`;
      msgEl.textContent = `✅ "${data.code}" applied – ${desc}!`;
    }
  } catch {
    msgEl.style.color = '#ff9090';
    msgEl.textContent = 'Could not verify coupon. Try again.';
  }
  renderCart(); // recalculate total
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

async function openAddressModal() {
  const cart = getCart();
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  // If not logged in, show the shared login-guard modal
  const userStr = localStorage.getItem('lakshmanna_current_user');
  if (!userStr) {
    showLoginGuard('cart.html', 'Please login to place your order. Your cart items will be saved!');
    return;
  }

  const modal = document.getElementById('address-modal');
  const listContainer = document.getElementById('saved-addresses-container');
  const list = document.getElementById('saved-addresses-list');
  
  list.innerHTML = '<p style="color:#f5d08a; padding:10px;">Loading your addresses...</p>';
  listContainer.style.display = 'block';
  selectedAddressString = "";
  document.getElementById('custom-address-input').value = "";
  if (document.getElementById('custom-name-input')) {
    document.getElementById('custom-name-input').value = "";
  }
  if (document.getElementById('custom-pin-input')) {
    document.getElementById('custom-pin-input').value = "";
  }
  document.getElementById('modal-msg').style.display = 'none';
  
  modal.classList.add('show');

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const res = await fetch(`/api/addresses?email=${encodeURIComponent(user.email)}`);
      
      if (res.ok) {
        const parsedAddrs = await res.json();
        list.innerHTML = ''; // Clear loading text
        
        if (parsedAddrs.length > 0) {
          listContainer.style.display = 'block';
          parsedAddrs.forEach((addr) => {
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
    } catch(err) {
      console.error("Failed to fetch addresses:", err);
      listContainer.style.display = 'none';
    }
  } else {
    listContainer.style.display = 'none';
  }
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

function selectPaymentMethod(method) {
  document.querySelectorAll('.payment-method-option').forEach(el => el.classList.remove('active'));
  document.getElementById('method-' + method).classList.add('active');
  document.querySelector(`input[name="payment_method"][value="${method}"]`).checked = true;

  const btn = document.getElementById('payment-btn');
  const trustBadges = document.getElementById('trust-badges');
  
  if (method === 'cod') {
    btn.textContent = 'Place Order (COD)';
    if (trustBadges) trustBadges.style.display = 'none';
  } else {
    btn.textContent = 'Proceed to Payment 🔒';
    if (trustBadges) trustBadges.style.display = 'block';
  }
}

async function confirmCheckout() {
  const nameInput   = document.getElementById('custom-name-input');
  const customName  = nameInput ? nameInput.value.trim() : '';
  const customStr   = document.getElementById('custom-address-input').value.trim();
  const pinInput    = document.getElementById('custom-pin-input');
  const customPin   = pinInput ? pinInput.value.trim() : '';

  let manualAddress = '';
  if (customStr) {
    manualAddress = (customName ? `${customName}\n` : '') + customStr + (customPin ? `\nPIN Code: ${customPin}` : '');
  }

  const finalAddr = manualAddress || selectedAddressString;
  const msgEl = document.getElementById('modal-msg');

  if (!finalAddr) {
    msgEl.textContent = 'Please select or enter a delivery address.';
    msgEl.style.display = 'block';
    return;
  }

  if (customStr && (!customPin || !customName)) {
    msgEl.textContent = 'Please provide your Full Name, Address, and PIN Code.';
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
  let userName  = 'Customer';
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      if (!parsed.email) {
        localStorage.removeItem('lakshmanna_current_user');
        alert('Your session is outdated. Please log in again.');
        window.location.href = 'login.html';
        return;
      }
      userEmail = parsed.email;
      userName  = parsed.name || 'Customer';
    } catch(e) {
      localStorage.removeItem('lakshmanna_current_user');
      window.location.href = 'login.html';
      return;
    }
  }

  // Get selected payment method
  const methodRadio = document.querySelector('input[name="payment_method"]:checked');
  const selectedMethod = methodRadio ? methodRadio.value : 'online';

  // Disable button while processing
  const submitBtn = document.querySelector('.checkout-submit-btn');
  if (submitBtn) { submitBtn.textContent = 'Processing…'; submitBtn.disabled = true; }

  try {
    if (selectedMethod === 'cod') {
      // ─── COD FLOW ───
      const orderPayload = {
        userEmail,
        order: {
          items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, img: i.img })),
          total,
          address: finalAddr
        }
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place COD order');

      // Clear cart and close modal
      saveCart([]);
      sessionStorage.setItem('lakshmanna_order_placed', '1');
      closeAddressModal();
      renderCart();

      // Show success overlay
      showOrderSuccess(data.orderId, total, 'Cash on Delivery');
      if (submitBtn) { submitBtn.textContent = 'Place Order (COD)'; submitBtn.disabled = false; }
      
    } else {
      // ─── RAZORPAY FLOW ───
      // Step 1: Create Razorpay order on server
      const createRes = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      });

    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.error || 'Could not initiate payment');

    // Step 2: Open Razorpay checkout popup
    const options = {
      key:         createData.keyId,
      amount:      createData.amount,
      currency:    createData.currency,
      name:        'Lakshmanna Pure Silk Sarees',
      description: `Order of ${totalQty} saree(s)`,
      image:       '/logo.jpg',
      order_id:    createData.orderId,
      prefill: {
        name:  userName,
        email: userEmail === 'Guest Customer' ? '' : userEmail
      },
      theme: { color: '#c9973a' },

      handler: async function(response) {
        // Step 3: Verify payment on backend and save order
        try {
          if (submitBtn) { submitBtn.textContent = 'Verifying Payment…'; submitBtn.disabled = true; }

          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              userEmail,
              order: {
                items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price, img: i.img })),
                total,
                address: finalAddr
              }
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

          // Clear cart and close modal
          saveCart([]);
          sessionStorage.setItem('lakshmanna_order_placed', '1');
          closeAddressModal();
          renderCart();

          // Show success overlay
          showOrderSuccess(verifyData.orderId, total, response.razorpay_payment_id);

        } catch (verifyErr) {
          console.error('Verification failed:', verifyErr);
          msgEl.textContent = '❌ Payment received but verification failed. Please contact us with your payment ID: ' + response.razorpay_payment_id;
          msgEl.style.display = 'block';
        } finally {
          if (submitBtn) { submitBtn.textContent = 'Proceed to Payment 🔒'; submitBtn.disabled = false; }
        }
      },

      modal: {
        ondismiss: function() {
          // User closed the Razorpay popup without paying
          if (submitBtn) { submitBtn.textContent = 'Proceed to Payment 🔒'; submitBtn.disabled = false; }
          msgEl.textContent = '⚠️ Payment was cancelled. You can try again.';
          msgEl.style.display = 'block';
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      msgEl.textContent = '❌ Payment failed: ' + (response.error.description || 'Unknown error');
      msgEl.style.display = 'block';
      if (submitBtn) { submitBtn.textContent = 'Proceed to Payment 🔒'; submitBtn.disabled = false; }
    });

    rzp.open();

    } // End of selectedMethod check

  } catch (err) {
    console.error('Checkout error:', err);
    msgEl.textContent = '❌ ' + (err.message || 'Failed to process order. Please try again.');
    msgEl.style.display = 'block';
    if (submitBtn) { 
      submitBtn.textContent = selectedMethod === 'cod' ? 'Place Order (COD)' : 'Proceed to Payment 🔒'; 
      submitBtn.disabled = false; 
    }
  }
}

function showOrderSuccess(orderId, total, paymentId) {
  // Remove existing overlay if any
  const existing = document.getElementById('order-success-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'order-success-overlay';
  overlay.innerHTML = `
    <div class="order-success-box">
      <div class="success-tick">✅</div>
      <h2>Payment Successful!</h2>
      <p>Your order has been placed and the owner has been notified.</p>
      <div class="success-details">
        <span>Order ID: <strong>${orderId}</strong></span>
        <span>Total Paid: <strong>${formatPrice(total)}</strong></span>
        <span style="font-size:0.8em; color:rgba(255,255,255,0.6);">Payment Ref: ${paymentId}</span>
      </div>
      <p class="success-note">You can track the status in <a href="profile.html">My Orders</a>.</p>
      <button onclick="document.getElementById('order-success-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  // Auto-remove after 15 seconds
  setTimeout(() => overlay.remove(), 15000);
}

// Init on page load
document.addEventListener('DOMContentLoaded', renderCart);
