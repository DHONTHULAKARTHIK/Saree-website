/* ─────────────────────────────────────────────
   cart.js  –  Shared cart utilities
   Used on: all pages
───────────────────────────────────────────── */

const CART_KEY = 'lakshmanna_cart';
let globalLastDiscountPct = -1;

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getGlobalDiscount(qty) {
  if (qty >= 25) return 30;
  if (qty >= 20) return 25;
  if (qty >= 15) return 20;
  if (qty >= 10) return 15;
  if (qty >= 5)  return 10;
  return 0;
}

function formatPriceGlobal(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function showGlobalDiscountNotification(pct, amt) {
  // Inject global styles dynamically if they don't exist
  if (!document.getElementById('discount-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'discount-toast-styles';
    style.innerHTML = `
      .global-discount-toast {
        position: fixed; top: 90px; right: 40px;
        background: rgba(10, 5, 0, 0.95);
        border: 1px solid rgba(197, 151, 58, 0.5); border-left: 6px solid #f5d08a;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(197,151,58,0.3);
        border-radius: 12px; padding: 16px 24px;
        display: flex; align-items: center; gap: 18px;
        z-index: 9999; backdrop-filter: blur(12px); font-family: 'Georgia', serif;
        animation: toastSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      .global-discount-toast.hide { animation: toastSlideOut 0.4s ease forwards; }
      .global-discount-toast .toast-icon { font-size: 2.2rem; animation: toastPop 1.5s infinite alternate ease-in-out; }
      .global-discount-toast h4 { font-size: 1.05rem; color: #f5d08a; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px; }
      .global-discount-toast p { font-size: 0.9rem; color: rgba(255,255,255,0.9); margin: 0; }
      .global-discount-toast span { color: #7ecb7e; font-weight: 800; font-size: 0.95rem; }
      @keyframes toastSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes toastSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
      @keyframes toastPop { 0% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.15) rotate(5deg); } 100% { transform: scale(1) rotate(-5deg); } }
    `;
    document.head.appendChild(style);
  }

  const existing = document.getElementById('global-discount-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'global-discount-toast';
  toast.className = 'global-discount-toast';
  toast.innerHTML = `
    <div class="toast-icon">✨</div>
    <div class="toast-content">
      <h4>Discount Unlocked!</h4>
      <p>Enjoy <strong>${pct}% off</strong>! You just saved <span>${formatPriceGlobal(amt)}</span>.</p>
    </div>
  `;
  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}

function updateBadge() {
  const cart = getCart();
  const qty = cart.reduce((s, i) => s + i.qty, 0);

  // Navbar badge
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = qty;

  // Floating cart bar (home & products pages)
  const floatCart  = document.getElementById('float-cart');
  const floatCount = document.getElementById('float-cart-count');
  if (floatCart) {
    if (floatCount) floatCount.textContent = qty;
    floatCart.classList.toggle('show', qty > 0);
  }

  // Monitor Global Discount and Animate
  const discountPct = getGlobalDiscount(qty);
  if (globalLastDiscountPct === -1) {
    globalLastDiscountPct = discountPct; // initialize
  } else if (discountPct > globalLastDiscountPct) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmt = Math.round(subtotal * discountPct / 100);
    showGlobalDiscountNotification(discountPct, discountAmt);
    globalLastDiscountPct = discountPct;
  } else if (discountPct < globalLastDiscountPct) {
    globalLastDiscountPct = discountPct; // handle reductions
  }
}

// Run on every page load
document.addEventListener('DOMContentLoaded', updateBadge);
