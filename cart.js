/* ─────────────────────────────────────────────
   cart.js  –  Shared cart utilities
   Used on: all pages
───────────────────────────────────────────── */

/* BB – Register Service Worker for PWA */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}

const CART_KEY = 'lakshmanna_cart';
let globalLastDiscountPct = -1;


function getCart() {
  return JSON.parse(localStorage.getItem('lakshmanna_cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('lakshmanna_cart', JSON.stringify(cart));
  // O – Sync to DB for logged-in users (debounced)
  clearTimeout(saveCart._dbTimer);
  saveCart._dbTimer = setTimeout(async () => {
    const userStr = localStorage.getItem('lakshmanna_current_user');
    if (!userStr) return;
    try {
      const { email } = JSON.parse(userStr);
      await fetch('/api/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cart })
      });
    } catch {}
  }, 1500); // wait 1.5s after last change
}

// O – On first load, merge DB cart into local if local is empty
async function loadCartFromDB() {
  const userStr = localStorage.getItem('lakshmanna_current_user');
  if (!userStr) return;

  // If an order was just placed this session, don't restore old cart from DB
  if (sessionStorage.getItem('lakshmanna_order_placed')) {
    sessionStorage.removeItem('lakshmanna_order_placed');
    // Also clear DB cart so it stays empty on next visit
    try {
      const { email } = JSON.parse(userStr);
      await fetch('/api/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cart: [] })
      });
    } catch {}
    return;
  }

  const local = getCart();
  if (local.length > 0) return; // already has items
  try {
    const { email } = JSON.parse(userStr);
    const res  = await fetch(`/api/load-cart?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data.cart && data.cart.length > 0) {
      localStorage.setItem('lakshmanna_cart', JSON.stringify(data.cart));
      updateBadge();
    }
  } catch {}
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

/* ─────────────────────────────────────────────
   Login-Guard Modal  –  used on all pages
   Shows when a guest tries to access a protected
   page (Profile, Checkout, etc.)
───────────────────────────────────────────── */
function injectLoginGuardModal() {
  if (document.getElementById('login-guard-modal')) return; // already injected

  // Styles
  const style = document.createElement('style');
  style.id = 'login-guard-styles';
  style.innerHTML = `
    #login-guard-modal {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden;
      transition: all 0.3s ease;
    }
    #login-guard-modal.show { opacity: 1; visibility: visible; }
    #login-guard-modal .lg-box {
      background: rgba(10,5,0,0.92);
      border: 1px solid rgba(197,151,58,0.45);
      border-radius: 18px;
      width: 90%; max-width: 400px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 12px 50px rgba(0,0,0,0.85);
      transform: translateY(24px);
      transition: transform 0.3s ease;
      font-family: 'Georgia', serif;
    }
    #login-guard-modal.show .lg-box { transform: translateY(0); }
    #login-guard-modal .lg-icon { font-size: 3.6rem; margin-bottom: 14px; }
    #login-guard-modal h2 {
      font-size: 1.25rem; color: #f5d08a;
      letter-spacing: 2px; text-transform: uppercase;
      margin-bottom: 10px;
    }
    #login-guard-modal p {
      font-size: 0.88rem; color: rgba(255,255,255,0.72);
      line-height: 1.6; margin-bottom: 26px;
    }
    #login-guard-modal .lg-login-btn {
      display: block; width: 100%;
      padding: 13px;
      background: linear-gradient(135deg,#f5d08a,#c9973a);
      color: #1a0a00; border: none; border-radius: 50px;
      font-size: 0.9rem; font-weight: 700;
      letter-spacing: 1.5px; text-transform: uppercase;
      cursor: pointer; margin-bottom: 12px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    #login-guard-modal .lg-login-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 22px rgba(197,151,58,0.45);
    }
    #login-guard-modal .lg-cancel-btn {
      display: block; width: 100%;
      padding: 12px;
      background: none;
      border: 1px solid rgba(197,151,58,0.3);
      color: rgba(255,255,255,0.6);
      border-radius: 50px; font-size: 0.85rem;
      letter-spacing: 1px; cursor: pointer;
      transition: all 0.2s ease;
    }
    #login-guard-modal .lg-cancel-btn:hover {
      border-color: rgba(197,151,58,0.65);
      color: #f5d08a;
    }
  `;
  document.head.appendChild(style);

  // Modal HTML
  const modal = document.createElement('div');
  modal.id = 'login-guard-modal';
  modal.innerHTML = `
    <div class="lg-box">
      <div class="lg-icon">🔒</div>
      <h2>Login Required</h2>
      <p id="login-guard-msg">Please login to your account to continue.</p>
      <button class="lg-login-btn" id="login-guard-btn" onclick="loginGuardProceed()">
        Login to Continue &rarr;
      </button>
      <button class="lg-cancel-btn" onclick="loginGuardClose()">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) loginGuardClose();
  });
}

let _loginGuardTarget = 'login.html';

function showLoginGuard(redirectTo, message) {
  injectLoginGuardModal();
  _loginGuardTarget = redirectTo || 'home.html';
  const msg = document.getElementById('login-guard-msg');
  if (msg) msg.textContent = message || 'Please login to your account to continue.';
  document.getElementById('login-guard-modal').classList.add('show');
}

function loginGuardClose() {
  const m = document.getElementById('login-guard-modal');
  if (m) m.classList.remove('show');
}

function loginGuardProceed() {
  localStorage.setItem('lakshmanna_redirect_after_login', _loginGuardTarget);
  window.location.href = 'login.html';
}

// Called from every Profile nav button
function checkProfileAccess(event) {
  event.preventDefault();
  const user = localStorage.getItem('lakshmanna_current_user');
  if (user) {
    window.location.href = 'profile.html';
  } else {
    showLoginGuard('home.html', 'Please login to view your profile, orders, and saved addresses.');
  }
}

/* ─────────────────────────────────────────────
   Navbar Profile Button  –  show user first name
───────────────────────────────────────────── */
function updateProfileNavLink() {
  const userStr = localStorage.getItem('lakshmanna_current_user');
  const link = document.querySelector('.profile-nav-link');
  if (!link) return;
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const firstName = (user.name || 'Profile').split(' ')[0];
      // Replace text node (last child) with the user's name
      const svgEl = link.querySelector('svg');
      link.innerHTML = '';
      if (svgEl) link.appendChild(svgEl);
      link.appendChild(document.createTextNode(' Hi, ' + firstName));
    } catch(e) {}
  }
}

/* ─────────────────────────────────────────────
   Add to Cart Toast  –  called from shop.js
───────────────────────────────────────────── */
function showAddedToCartToast(productName) {
  if (!document.getElementById('add-cart-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'add-cart-toast-styles';
    style.innerHTML = `
      #add-cart-toast {
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: rgba(10,5,0,0.95);
        border: 1px solid rgba(197,151,58,0.5); border-left: 5px solid #f5d08a;
        border-radius: 12px; padding: 13px 22px;
        display: flex; align-items: center; gap: 12px;
        z-index: 9998; backdrop-filter: blur(12px);
        font-family: 'Georgia', serif; font-size: 0.88rem; color: #fff;
        box-shadow: 0 8px 30px rgba(0,0,0,0.6);
        opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none; white-space: nowrap;
      }
      #add-cart-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      #add-cart-toast .act-icon { font-size: 1.4rem; }
      #add-cart-toast strong { color: #f5d08a; }
    `;
    document.head.appendChild(style);
  }

  let toast = document.getElementById('add-cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'add-cart-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span class="act-icon">🛒</span> <span>Added <strong>${productName}</strong> to cart!</span>`;
  toast.classList.add('show');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ─────────────────────────────────────────────
   I – Logout button injected next to Profile link
───────────────────────────────────────────── */
function injectLogoutButton() {
  const userStr = localStorage.getItem('lakshmanna_current_user');
  if (!userStr) return; // guests don't get a logout button

  // Avoid double-injecting
  if (document.getElementById('global-logout-btn')) return;

  const profileLink = document.querySelector('.profile-nav-link');
  if (!profileLink) return;

  const btn = document.createElement('button');
  btn.id = 'global-logout-btn';
  btn.title = 'Sign Out';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign Out`;
  btn.onclick = () => {
    if (confirm('Sign out of your account?')) {
      localStorage.removeItem('lakshmanna_current_user');
      window.location.href = 'login.html';
    }
  };
  btn.style.cssText = `
    background: rgba(220, 50, 50, 0.1); border: 1px solid rgba(220, 50, 50, 0.3);
    color: #ffb3b3; border-radius: 50px; padding: 8px 16px; height: 38px;
    display: inline-flex; align-items: center; gap: 6px; font-family: 'Georgia', serif; font-size: 0.8rem;
    letter-spacing: 1.5px; text-transform: uppercase;
    cursor: pointer; backdrop-filter: blur(6px);
    transition: all 0.3s ease; text-decoration: none; flex-shrink: 0;
    opacity: 0; transform: translateY(-10px); animation: slowFadeIn 0.8s ease forwards 0.3s;
  `;
  btn.onmouseover = () => { btn.style.background = 'rgba(220, 50, 50, 0.25)'; btn.style.borderColor = 'rgba(220, 50, 50, 0.6)'; btn.style.color = '#fff'; };
  btn.onmouseout  = () => { btn.style.background = 'rgba(220, 50, 50, 0.1)';  btn.style.borderColor = 'rgba(220, 50, 50, 0.3)'; btn.style.color = '#ffb3b3'; };

  // Insert right after the profile link
  profileLink.insertAdjacentElement('afterend', btn);
  
  // Inject the keyframes if not exists
  if (!document.getElementById('slow-fade-keyframes')) {
    const style = document.createElement('style');
    style.id = 'slow-fade-keyframes';
    style.textContent = `@keyframes slowFadeIn { to { opacity: 1; transform: translateY(0); } }`;
    document.head.appendChild(style);
  }
}

/* ─────────────────────────────────────────────
   J – Back to Top button (global)
───────────────────────────────────────────── */
function injectBackToTop() {
  if (document.getElementById('back-to-top')) return;

  const style = document.createElement('style');
  style.textContent = `
    #back-to-top {
      position: fixed; bottom: 90px; right: 24px; z-index: 998;
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(10,5,0,0.75); border: 1px solid rgba(197,151,58,0.5);
      color: #f5d08a; font-size: 1.2rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(10px);
      opacity: 0; transform: translateY(16px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    #back-to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
    #back-to-top:hover { background: rgba(197,151,58,0.25); border-color: rgba(197,151,58,0.8); }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.title = 'Back to top';
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
}

/* ─────────────────────────────────────────────
   D – WhatsApp Floating Inquiry Button
───────────────────────────────────────────── */
function injectWhatsAppButton() {
  if (document.getElementById('whatsapp-float')) return;

  const style = document.createElement('style');
  style.textContent = `
    #whatsapp-float {
      position: fixed; bottom: 26px; right: 24px; z-index: 997;
      width: 52px; height: 52px; border-radius: 50%;
      background: #25D366; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 24px rgba(37,211,102,0.45);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      text-decoration: none;
    }
    #whatsapp-float:hover { transform: scale(1.12); box-shadow: 0 10px 32px rgba(37,211,102,0.6); }
    #whatsapp-float svg { width: 28px; height: 28px; fill: #fff; }
    #whatsapp-tooltip {
      position: fixed; bottom: 38px; right: 84px; z-index: 997;
      background: rgba(10,5,0,0.9); color: #f5d08a;
      font-family: 'Georgia', serif; font-size: 0.78rem; letter-spacing: 1px;
      padding: 7px 14px; border-radius: 8px;
      border: 1px solid rgba(197,151,58,0.3); white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
    }
    #whatsapp-float:hover + #whatsapp-tooltip { opacity: 1; }
  `;
  document.head.appendChild(style);

  const wa = document.createElement('a');
  wa.id = 'whatsapp-float';
  wa.href = 'https://wa.me/917993882042?text=Hello%2C%20I%20am%20interested%20in%20your%20silk%20sarees.';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.title = 'Chat on WhatsApp';
  wa.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  document.body.appendChild(wa);

  const tip = document.createElement('div');
  tip.id = 'whatsapp-tooltip';
  tip.textContent = 'Chat with us on WhatsApp';
  document.body.appendChild(tip);
}

/* ─────────────────────────────────────────────
   CC – Newsletter Subscribe
───────────────────────────────────────────── */
async function subscribeNewsletter(e) {
  e.preventDefault();
  const emailEl = document.getElementById('newsletter-email');
  const msgEl   = document.getElementById('newsletter-msg');
  if (!emailEl || !msgEl) return;
  const email = emailEl.value.trim();

  msgEl.style.display = 'inline';
  msgEl.style.color   = 'rgba(255,255,255,0.6)';
  msgEl.textContent   = 'Subscribing…';

  try {
    const res = await fetch('/api/newsletter-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      msgEl.style.color = '#7ecb7e';
      msgEl.textContent = '✅ Subscribed! Thank you.';
      emailEl.value = '';
    } else {
      const d = await res.json();
      msgEl.style.color = '#ff9090';
      msgEl.textContent = d.error || 'Already subscribed.';
    }
  } catch {
    msgEl.style.color = '#ff9090';
    msgEl.textContent = 'Could not connect. Try again.';
  }
}

/* ─────────────────────────────────────────────
   Z – Skeleton loading cards for products grid
───────────────────────────────────────────── */
function injectSkeletonCards(containerId = 'products-grid', count = 6) {
  const grid = document.getElementById(containerId);
  if (!grid || grid.querySelector('.product-card')) return; // real cards already there

  if (!document.getElementById('skeleton-style')) {
    const s = document.createElement('style');
    s.id = 'skeleton-style';
    s.textContent = `
      .skeleton-card {
        background: rgba(255,255,255,0.05); border-radius: 16px;
        overflow: hidden; border: 1px solid rgba(197,151,58,0.1);
      }
      .skeleton-img { height: 220px; background: rgba(255,255,255,0.08); position:relative; overflow:hidden; }
      .skeleton-line {
        height: 14px; border-radius: 50px; margin: 10px 14px;
        background: rgba(255,255,255,0.08); position:relative; overflow:hidden;
      }
      .skeleton-line.short { width: 55%; }
      .skeleton-img::after, .skeleton-line::after {
        content:''; position:absolute; inset:0;
        background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
      @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    `;
    document.head.appendChild(s);
  }

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = `<div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line" style="width:40%; margin-bottom:16px;"></div>`;
    grid.appendChild(el);
  }
}

/* ─────────────────────────────────────────────
   W – Global Navbar Search
───────────────────────────────────────────── */
function injectNavSearch() {
  if (document.getElementById('nav-search-form')) return;

  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const style = document.createElement('style');
  style.textContent = `
    #nav-search-form {
      display: flex; align-items: center; gap: 4px;
      background: rgba(10,5,0,0.4); border: 1px solid rgba(197,151,58,0.4);
      border-radius: 50px; overflow: hidden; backdrop-filter: blur(8px);
      transition: all 0.3s ease; margin-right: 20px; height: 38px;
      opacity: 0; transform: translateY(-10px); animation: slowFadeIn 0.8s ease forwards 0.4s;
    }
    #nav-search-form:focus-within { 
      border-color: rgba(197,151,58,0.9);
      background: rgba(10,5,0,0.6);
      box-shadow: 0 0 12px rgba(197,151,58,0.25);
    }
    #nav-search-input {
      background: none; border: none; outline: none;
      color: #f0d9a0; font-family: 'Georgia', serif; font-size: 0.85rem;
      letter-spacing: 1px; padding: 0 5px 0 16px; width: 300px;
      transition: width 0.3s ease;
    }
    #nav-search-input:focus { width: 380px; }
    #nav-search-input::placeholder { color: rgba(240,217,160,0.6); font-style: italic; }
    #nav-search-btn {
      background: none; border: none; color: rgba(240,217,160,0.8);
      padding: 0 14px 0 8px; cursor: pointer; font-size: 1.1rem;
      transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
    }
    #nav-search-btn:hover { color: #f5d08a; transform: scale(1.1); }
    .profile-nav-link {
      opacity: 0; transform: translateY(-10px); animation: slowFadeIn 0.8s ease forwards 0.2s;
    }
    @media (max-width: 850px) {
      #nav-search-form { display: none; }
    }
    @keyframes slowFadeIn { 
      to { opacity: 1; transform: translateY(0); } 
    }
  `;
  document.head.appendChild(style);

  const form = document.createElement('form');
  form.id = 'nav-search-form';
  form.role = 'search';
  form.innerHTML = `
    <input id="nav-search-input" type="text" placeholder="Search sarees…" autocomplete="off" />
    <button id="nav-search-btn" type="submit" title="Search">🔍</button>
  `;
  form.onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('nav-search-input').value.trim();
    if (!q) return;
    const onProducts = window.location.pathname.endsWith('products.html');
    if (onProducts && typeof applySearch === 'function') {
      applySearch(q);
      const inp = document.getElementById('search-input');
      if (inp) inp.value = q;
    } else {
      window.location.href = `products.html?search=${encodeURIComponent(q)}`;
    }
  };

  // Insert before the nav-links list
  navLinks.insertAdjacentElement('beforebegin', form);

  // If landing on products.html with ?search=, trigger it
  if (window.location.pathname.endsWith('products.html')) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    if (q) {
      setTimeout(() => {
        if (typeof applySearch === 'function') applySearch(q);
        const inp = document.getElementById('search-input');
        if (inp) inp.value = q;
        document.getElementById('nav-search-input').value = q;
      }, 200);
    }
  }
}

// Run on every page load

document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
  updateProfileNavLink();
  injectLogoutButton();
  injectBackToTop();
  injectWhatsAppButton();
  injectNavSearch();     // W – global search
  injectSkeletonCards(); // Z – skeleton loading for product grids
  loadCartFromDB(); // O – restore DB cart for logged-in users

  // H – Show "Welcome back!" toast if just logged in
  const welcomeMsg = sessionStorage.getItem('lakshmanna_welcome_msg');
  if (welcomeMsg) {
    sessionStorage.removeItem('lakshmanna_welcome_msg');
    // Small delay so page renders first
    setTimeout(() => {
      // Inject welcome toast style if not done yet
      if (!document.getElementById('welcome-toast-style')) {
        const ws = document.createElement('style');
        ws.id = 'welcome-toast-style';
        ws.textContent = `
          #welcome-toast {
            position: fixed; top: 88px; left: 50%; transform: translateX(-50%) translateY(-20px);
            z-index: 9999; background: linear-gradient(135deg, #1a0a00, #2d1200);
            border: 1px solid rgba(197,151,58,0.5); border-radius: 50px;
            padding: 12px 28px; color: #f5d08a;
            font-family: 'Georgia', serif; font-size: 0.88rem; letter-spacing: 1px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            opacity: 0; transition: opacity 0.4s ease, transform 0.4s ease;
            white-space: nowrap;
          }
          #welcome-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        `;
        document.head.appendChild(ws);
      }
      let wt = document.getElementById('welcome-toast');
      if (!wt) {
        wt = document.createElement('div');
        wt.id = 'welcome-toast';
        document.body.appendChild(wt);
      }
      wt.textContent = welcomeMsg;
      requestAnimationFrame(() => wt.classList.add('show'));
      setTimeout(() => wt.classList.remove('show'), 3500);
    }, 300);
  }

  // Hide profile button text on very small screens to prevent overflow
  if (!document.getElementById('profile-mobile-style')) {
    const s = document.createElement('style');
    s.id = 'profile-mobile-style';
    s.textContent = `@media (max-width: 380px) { .profile-nav-link span, .profile-nav-link { font-size: 0 !important; padding: 9px 12px !important; } .profile-nav-link svg { font-size: 18px; width:20px; height:20px; } }`;
    document.head.appendChild(s);
  }
});

/* ── Page Transitions ── */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.createElement('div');
  overlay.id = 'page-transition-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; background:#0a0500; z-index:9999; pointer-events:none; transition:opacity 0.4s ease; opacity:1;';
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '0';
  });

  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', e => {
      if (link.hostname === window.location.hostname && !link.hash && link.target !== '_blank' && !link.href.includes('javascript:')) {
        e.preventDefault();
        const href = link.href;
        overlay.style.opacity = '1';
        setTimeout(() => {
          window.location.href = href;
        }, 400);
      }
    });
  });
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    const overlay = document.getElementById('page-transition-overlay');
    if (overlay) overlay.style.opacity = '0';
  }
});
