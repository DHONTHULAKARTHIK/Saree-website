/* ─────────────────────────────────────────────
   shop.js  –  Add to cart & quantity counter
   Used on: home.html, products.html
───────────────────────────────────────────── */

function addToCart(btn) {
  const id    = btn.dataset.id;
  const name  = btn.dataset.name;
  const price = parseInt(btn.dataset.price);
  const img   = btn.dataset.img;

  const footer  = btn.parentElement;
  const counter = footer.querySelector('.qty-counter');

  let cart = getCart();
  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.qty += 1;
    counter.querySelector('.qty-count').textContent = existing.qty;
  } else {
    cart.push({ id, name, price, img, qty: 1 });
    counter.querySelector('.qty-count').textContent = '1';
  }

  saveCart(cart);
  updateBadge();
  showAddedToCartToast(name);

  btn.style.display = 'none';
  counter.classList.add('visible');
}

function changeQty(btn, delta) {
  const counter = btn.parentElement;
  const countEl = counter.querySelector('.qty-count');
  const addBtn  = counter.parentElement.querySelector('.add-btn');
  const id      = addBtn.dataset.id;
  let val = parseInt(countEl.textContent) + delta;

  let cart = getCart();
  const idx = cart.findIndex(i => i.id === id);

  if (val <= 0) {
    if (idx !== -1) cart.splice(idx, 1);
    saveCart(cart);
    updateBadge();
    counter.classList.remove('visible');
    addBtn.style.display = '';
  } else {
    if (idx !== -1) cart[idx].qty = val;
    saveCart(cart);
    updateBadge();
    countEl.textContent = val;
  }
}

/* ── C: Product Detail Modal ── */
function openProductDetail(card) {
  const img   = card.querySelector('img')?.src || '';
  const name  = card.querySelector('h3')?.textContent || 'Saree';
  const desc  = card.querySelector('p')?.textContent || '';
  const priceRaw = card.querySelector('.add-btn')?.dataset.price || '0';
  const oldPriceEl = card.querySelector('.old-price');
  const oldPrice = oldPriceEl ? oldPriceEl.textContent : '';
  const badge = card.querySelector('.product-badge')?.textContent || '';
  const addBtn = card.querySelector('.add-btn');
  const id  = addBtn?.dataset.id  || '';
  const imgFile = addBtn?.dataset.img || '';

  let modal = document.getElementById('product-detail-modal');
  if (!modal) {
    const style = document.createElement('style');
    style.textContent = `
      #product-detail-modal {
        position:fixed; inset:0; z-index:9000; background:rgba(0,0,0,0.85);
        backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center;
        opacity:0; transition:opacity 0.3s ease; pointer-events:none; padding:20px;
      }
      #product-detail-modal.open { opacity:1; pointer-events:auto; }
      #product-detail-modal .pd-box {
        background:rgba(10,5,0,0.92); border:1px solid rgba(197,151,58,0.35);
        border-radius:20px; max-width:820px; width:100%;
        display:grid; grid-template-columns:1fr 1fr; overflow:hidden;
        box-shadow:0 20px 60px rgba(0,0,0,0.7);
        transform:translateY(30px); transition:transform 0.35s ease;
      }
      #product-detail-modal.open .pd-box { transform:translateY(0); }
      .pd-img { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; }
      .pd-info { padding:32px 28px; display:flex; flex-direction:column; gap:14px; overflow-y:auto; max-height:80vh; }
      .pd-badge { background:linear-gradient(135deg,#f5d08a,#c9973a); color:#1a0a00; font-size:0.7rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:4px 14px; border-radius:50px; display:inline-block; width:fit-content; }
      .pd-name { font-size:1.4rem; color:#f5d08a; letter-spacing:1px; line-height:1.3; }
      .pd-desc { font-size:0.88rem; color:rgba(255,255,255,0.8); line-height:1.7; }
      .pd-price { font-size:1.5rem; font-weight:700; color:#f5d08a; }
      .pd-old { font-size:0.9rem; color:rgba(255,255,255,0.45); text-decoration:line-through; margin-left:8px; }
      .pd-add-btn { padding:13px; background:linear-gradient(135deg,#f5d08a,#c9973a); color:#1a0a00; border:none; border-radius:50px; font-size:0.9rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; cursor:pointer; transition:transform 0.25s ease, box-shadow 0.25s ease; }
      .pd-add-btn:hover { transform:translateY(-2px); box-shadow:0 6px 22px rgba(197,151,58,0.5); }
      .pd-close { position:absolute; top:16px; right:16px; background:rgba(10,5,0,0.7); border:1px solid rgba(197,151,58,0.3); color:#f5d08a; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
      .pd-close:hover { background:rgba(197,151,58,0.2); }
      
      /* Reviews CSS */
      .pd-reviews-section { margin-top: 20px; border-top: 1px solid rgba(197,151,58,0.2); padding-top: 20px; }
      .pd-reviews-title { font-size: 1.1rem; color: #f5d08a; margin-bottom: 15px; letter-spacing: 1px; }
      .pd-review-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(197,151,58,0.15); border-radius: 12px; padding: 12px; margin-bottom: 10px; }
      .pd-review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .pd-review-user { font-size: 0.85rem; font-weight: 700; color: #f0d9a0; }
      .pd-review-date { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
      .pd-review-rating { color: #ffb800; font-size: 0.8rem; }
      .pd-review-text { font-size: 0.85rem; color: rgba(255,255,255,0.7); line-height: 1.5; }
      
      .pd-add-review-box { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 15px; margin-top: 20px; border: 1px solid rgba(197,151,58,0.2); }
      .pd-add-review-title { font-size: 0.95rem; color: #f5d08a; margin-bottom: 10px; }
      .pd-star-rating { display: flex; flex-direction: row-reverse; justify-content: flex-end; gap: 4px; margin-bottom: 10px; }
      .pd-star-rating input { display: none; }
      .pd-star-rating label { font-size: 1.5rem; color: rgba(255,255,255,0.2); cursor: pointer; transition: color 0.2s; }
      .pd-star-rating input:checked ~ label, .pd-star-rating label:hover, .pd-star-rating label:hover ~ label { color: #ffb800; }
      .pd-review-textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(197,151,58,0.3); border-radius: 8px; padding: 10px; color: #fff; font-family: inherit; font-size: 0.85rem; outline: none; resize: vertical; min-height: 60px; margin-bottom: 10px; }
      .pd-submit-review-btn { padding: 8px 16px; background: rgba(197,151,58,0.15); color: #f5d08a; border: 1px solid rgba(197,151,58,0.4); border-radius: 50px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
      .pd-submit-review-btn:hover { background: rgba(197,151,58,0.3); }

      @media (max-width:620px) { #product-detail-modal .pd-box { grid-template-columns:1fr; } .pd-img { aspect-ratio:16/9; } }
    `;
    document.head.appendChild(style);
    modal = document.createElement('div');
    modal.id = 'product-detail-modal';
    modal.innerHTML = `
      <div class="pd-box">
        <div class="pd-img-wrap" id="pd-img-wrap" style="position:relative; overflow:hidden; cursor:crosshair; width:100%; display:flex;">
          <img class="pd-img" id="pd-img" src="" alt="Saree" />
          <div id="pd-magnifier" style="position:absolute; pointer-events:none; border-radius:50%; width:160px; height:160px; border:2px solid rgba(197,151,58,0.4); box-shadow:0 0 20px rgba(0,0,0,0.8); opacity:0; transition:opacity 0.2s ease; background-repeat:no-repeat; background-color:#111; z-index:10; transform:translate(-50%, -50%);"></div>
        </div>
        <div class="pd-info">
          <span class="pd-badge" id="pd-badge"></span>
          <h2 class="pd-name" id="pd-name"></h2>
          <p class="pd-desc" id="pd-desc"></p>
          <div>
            <span class="pd-price" id="pd-price"></span>
            <span class="pd-old" id="pd-old"></span>
          </div>
          <button class="pd-add-btn" id="pd-add-btn" onclick="pdAddToCart()">Add to Cart</button>
          
          <!-- Reviews Section -->
          <div class="pd-reviews-section">
            <h3 class="pd-reviews-title">Customer Reviews</h3>
            <div id="pd-reviews-list">
              <div style="font-size:0.85rem; color:rgba(255,255,255,0.5);">Loading reviews...</div>
            </div>
            
            <div class="pd-add-review-box" id="pd-add-review-box" style="display: none;">
              <h4 class="pd-add-review-title">Write a Review</h4>
              <form id="pd-review-form" onsubmit="submitReview(event)">
                <div class="pd-star-rating">
                  <input type="radio" id="star5" name="rating" value="5" required /><label for="star5" title="5 stars">★</label>
                  <input type="radio" id="star4" name="rating" value="4" /><label for="star4" title="4 stars">★</label>
                  <input type="radio" id="star3" name="rating" value="3" /><label for="star3" title="3 stars">★</label>
                  <input type="radio" id="star2" name="rating" value="2" /><label for="star2" title="2 stars">★</label>
                  <input type="radio" id="star1" name="rating" value="1" /><label for="star1" title="1 star">★</label>
                </div>
                <textarea class="pd-review-textarea" id="pd-review-text" placeholder="Share your thoughts about this saree..." required></textarea>
                <button type="submit" class="pd-submit-review-btn">Submit Review</button>
              </form>
            </div>
            <div id="pd-login-prompt" style="font-size:0.85rem; color:rgba(255,255,255,0.5); margin-top:20px; display:none;">
              Please <a href="login.html" style="color:#f5d08a;">log in</a> to write a review.
            </div>
          </div>

        </div>
        <button class="pd-close" onclick="closeProductDetail()">✕</button>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeProductDetail(); });
    document.body.appendChild(modal);

    // Magnifier Logic
    const wrap = document.getElementById('pd-img-wrap');
    const imgEl = document.getElementById('pd-img');
    const mag = document.getElementById('pd-magnifier');
    const zoomLvl = 2.2;

    wrap.addEventListener('mouseenter', () => {
      mag.style.opacity = '1';
      mag.style.backgroundImage = `url(${imgEl.src})`;
      mag.style.backgroundSize = `${imgEl.width * zoomLvl}px ${imgEl.height * zoomLvl}px`;
    });
    wrap.addEventListener('mouseleave', () => mag.style.opacity = '0');
    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mag.style.left = x + 'px';
      mag.style.top = y + 'px';
      const bgX = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const bgY = Math.max(0, Math.min(100, (y / rect.height) * 100));
      mag.style.backgroundPosition = `${bgX}% ${bgY}%`;
    });
  }

  // Populate
  document.getElementById('pd-img').src   = img;
  document.getElementById('pd-name').textContent  = name;
  document.getElementById('pd-desc').textContent  = desc;
  document.getElementById('pd-price').textContent = '₹' + parseInt(priceRaw).toLocaleString('en-IN');
  document.getElementById('pd-old').textContent   = oldPrice;
  const badgeEl = document.getElementById('pd-badge');
  badgeEl.textContent = badge;
  badgeEl.style.display = badge ? 'inline-block' : 'none';

  // Store for pdAddToCart and Reviews
  modal._id = id; modal._name = name; modal._price = parseInt(priceRaw); modal._img = imgFile;

  // Load reviews and check login state
  loadProductReviews(id);
  const currentUser = JSON.parse(localStorage.getItem('lakshmanna_current_user') || 'null');
  if (currentUser) {
    document.getElementById('pd-add-review-box').style.display = 'block';
    document.getElementById('pd-login-prompt').style.display = 'none';
  } else {
    document.getElementById('pd-add-review-box').style.display = 'none';
    document.getElementById('pd-login-prompt').style.display = 'block';
  }

  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeProductDetail() {
  const m = document.getElementById('product-detail-modal');
  if (m) m.classList.remove('open');
}

function pdAddToCart() {
  const m = document.getElementById('product-detail-modal');
  if (!m) return;
  let cart = getCart();
  const existing = cart.find(i => i.id === m._id);
  if (existing) existing.qty += 1;
  else cart.push({ id: m._id, name: m._name, price: m._price, img: m._img, qty: 1 });
  saveCart(cart);
  updateBadge();
  showAddedToCartToast(m._name);
  closeProductDetail();
}

async function loadProductReviews(productId) {
  const list = document.getElementById('pd-reviews-list');
  list.innerHTML = '<div style="font-size:0.85rem; color:rgba(255,255,255,0.5);">Loading reviews...</div>';
  try {
    const res = await fetch(`/api/reviews/${productId}`);
    const reviews = await res.json();
    if (reviews.length === 0) {
      list.innerHTML = '<div style="font-size:0.85rem; color:rgba(255,255,255,0.5);">No reviews yet. Be the first to review!</div>';
      return;
    }
    
    list.innerHTML = reviews.map(r => {
      const date = new Date(r.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      return `
        <div class="pd-review-card">
          <div class="pd-review-header">
            <span class="pd-review-user">${r.userName}</span>
            <span class="pd-review-date">${date}</span>
          </div>
          <div class="pd-review-rating">${stars}</div>
          <div class="pd-review-text">${r.comment}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = '<div style="font-size:0.85rem; color:#ff9090;">Failed to load reviews.</div>';
  }
}

async function submitReview(event) {
  event.preventDefault();
  const currentUser = JSON.parse(localStorage.getItem('lakshmanna_current_user') || 'null');
  if (!currentUser) {
    alert('Please log in to submit a review.');
    return;
  }
  
  const m = document.getElementById('product-detail-modal');
  const productId = m._id;
  const rating = document.querySelector('input[name="rating"]:checked')?.value;
  const comment = document.getElementById('pd-review-text').value.trim();
  
  if (!rating) {
    alert('Please select a star rating.');
    return;
  }
  if (!comment) {
    alert('Please write a review comment.');
    return;
  }
  
  const btn = event.target.querySelector('button[type="submit"]');
  btn.textContent = 'Submitting...';
  btn.disabled = true;
  
  try {
    const res = await fetch('/api/add-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        userEmail: currentUser.email,
        userName: currentUser.name,
        rating: parseInt(rating),
        comment
      })
    });
    
    if (res.ok) {
      document.getElementById('pd-review-form').reset();
      await loadProductReviews(productId);
      alert('Review submitted successfully!');
    } else {
      alert('Failed to submit review.');
    }
  } catch (err) {
    alert('Error connecting to server.');
  } finally {
    btn.textContent = 'Submit Review';
    btn.disabled = false;
  }
}



/* ── M: WhatsApp Share  +  F: Wishlist Heart ── */
function getWishlist() { return JSON.parse(localStorage.getItem('lakshmanna_wishlist') || '[]'); }
function saveWishlist(w) { localStorage.setItem('lakshmanna_wishlist', JSON.stringify(w)); }

function toggleWishlist(btn) {
  const card  = btn.closest('.product-card');
  const id    = card.dataset.id || card.querySelector('.add-btn')?.dataset.id;
  const name  = card.dataset.name || card.querySelector('.add-btn')?.dataset.name || 'Saree';
  const price = card.dataset.price || card.querySelector('.add-btn')?.dataset.price || '';
  const img   = card.querySelector('img')?.src || '';

  let wishlist = getWishlist();
  const idx = wishlist.findIndex(w => w.id === id);
  if (idx === -1) {
    wishlist.push({ id, name, price, img });
    btn.textContent = '❤️';
    btn.title = 'Remove from Wishlist';
    showAddedToCartToast('Added to Wishlist ❤️');
  } else {
    wishlist.splice(idx, 1);
    btn.textContent = '🤍';
    btn.title = 'Add to Wishlist';
  }
  saveWishlist(wishlist);
  updateWishlistBadge();
}

function updateWishlistBadge() {
  const count = getWishlist().length;
  document.querySelectorAll('.wishlist-nav-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

function shareOnWhatsApp(btn) {
  const card  = btn.closest('.product-card');
  const name  = card.dataset.name || card.querySelector('h3')?.textContent || 'Silk Saree';
  const price = card.dataset.price || card.querySelector('.add-btn')?.dataset.price || '';
  const priceText = price ? ` – ₹${parseInt(price).toLocaleString('en-IN')}` : '';
  const text = `Check out this beautiful saree from Lakshmanna Pure Silk Sarees!\n\n*${name}*${priceText}\n\nVisit: http://localhost:3000/products.html`;
  window.open(`https://wa.me/917993882042?text=${encodeURIComponent(text)}`, '_blank');
}

// Restore qty-counter state from localStorage on page load
document.addEventListener('DOMContentLoaded', function () {
  const cart = getCart();
  const wishlist = getWishlist();

  // Inject styles once
  if (!document.getElementById('shop-extra-styles')) {
    const s = document.createElement('style');
    s.id = 'shop-extra-styles';
    s.textContent = `
      .card-actions { display:flex; gap:6px; margin-top:8px; }
      .card-action-btn {
        flex:1; padding:6px 0; border-radius:50px; border:1px solid rgba(197,151,58,0.3);
        background:rgba(10,5,0,0.4); color:#f0d9a0; font-size:0.75rem; letter-spacing:1px;
        cursor:pointer; transition:all 0.2s ease; text-align:center;
        backdrop-filter:blur(6px);
      }
      .card-action-btn:hover { background:rgba(197,151,58,0.2); border-color:rgba(197,151,58,0.6); }
      .wishlist-btn.active { background:rgba(200,50,80,0.15); border-color:rgba(200,50,80,0.4); }
    `;
    document.head.appendChild(s);
  }

  document.querySelectorAll('.add-btn').forEach(btn => {
    // Restore cart state
    const item = cart.find(i => i.id === btn.dataset.id);
    if (item) {
      const footer  = btn.parentElement;
      const counter = footer.querySelector('.qty-counter');
      counter.querySelector('.qty-count').textContent = item.qty;
      btn.style.display = 'none';
      counter.classList.add('visible');
    }

    // Inject M + F buttons below the product footer
    const card = btn.closest('.product-card');
    if (card && !card.querySelector('.card-actions')) {
      const id = btn.dataset.id;
      const inWishlist = wishlist.some(w => w.id === id);
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <button class="card-action-btn wishlist-btn${inWishlist ? ' active' : ''}"
          onclick="toggleWishlist(this)" title="${inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}">
          ${inWishlist ? '❤️' : '🤍'} Wishlist
        </button>
        <button class="card-action-btn" onclick="shareOnWhatsApp(this)" title="Share on WhatsApp">
          📲 Share
        </button>
      `;
      const info = card.querySelector('.product-info');
      if (info) info.appendChild(actions);
    }

    // C – Make product image clickable to open detail modal
    const imgWrap = card.querySelector('.product-img-wrap');
    if (imgWrap && !imgWrap.dataset.detailBound) {
      imgWrap.dataset.detailBound = '1';
      imgWrap.style.cursor = 'pointer';
      imgWrap.title = 'Click to view details';
      imgWrap.addEventListener('click', () => {
        trackRecentlyViewed(
          btn.dataset.id,
          btn.dataset.name || card.querySelector('h3')?.textContent || 'Saree',
          card.querySelector('img')?.src || ''
        );
        openProductDetail(card);
      });
    }

    // S – Stock badge above product name
    if (!card.querySelector('.stock-badge')) {
      const n = parseInt((btn.dataset.id || '').replace(/\D/g, '').slice(-1)) || 0;
      const pick = n < 7 ? 'in-stock' : n < 9 ? 'limited' : 'sold-out';
      const labels = { 'in-stock': '✓ In Stock', 'limited': '⚡ Limited', 'sold-out': '✕ Sold Out' };
      const badge = document.createElement('span');
      badge.className = `stock-badge ${pick}`;
      badge.textContent = labels[pick];
      const h3 = card.querySelector('h3');
      if (h3 && h3.parentElement) h3.parentElement.insertBefore(badge, h3);
    }
  });

  updateWishlistBadge();
  injectPriceFilter();    // X
  renderRecentlyViewed(); // Y
});

/* ── Y: Recently Viewed ── */
function trackRecentlyViewed(id, name, img) {
  let rv = JSON.parse(localStorage.getItem('lakshmanna_rv') || '[]');
  rv = rv.filter(i => i.id !== id);
  rv.unshift({ id, name, img });
  if (rv.length > 10) rv.pop();
  localStorage.setItem('lakshmanna_rv', JSON.stringify(rv));
}

function renderRecentlyViewed() {
  const rv = JSON.parse(localStorage.getItem('lakshmanna_rv') || '[]');
  if (rv.length < 2 || document.getElementById('rv-section')) return;
  const anchor = document.querySelector('.products-section') || document.querySelector('main');
  if (!anchor) return;
  const sec = document.createElement('div');
  sec.id = 'rv-section';
  sec.style.cssText = 'margin:40px 0 20px;padding-top:28px;border-top:1px solid rgba(197,151,58,0.15);';
  sec.innerHTML = `
    <h3 style="color:#f5d08a;font-size:0.9rem;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:16px;">🕐 Recently Viewed</h3>
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;">
      ${rv.map(item => `
        <div onclick="scrollToProduct('${item.id}')" style="flex:0 0 100px;background:rgba(10,5,0,0.4);border:1px solid rgba(197,151,58,0.2);border-radius:10px;overflow:hidden;cursor:pointer;">
          <img src="${item.img}" alt="${item.name}" onerror="this.src='sarees/p1.jpg'" style="width:100%;height:75px;object-fit:cover;display:block;">
          <div style="font-size:0.62rem;color:#f0d9a0;padding:5px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
        </div>`).join('')}
    </div>`;
  anchor.appendChild(sec);
}

function scrollToProduct(id) {
  const btn = document.querySelector(`.add-btn[data-id="${id}"]`);
  if (btn) btn.closest('.product-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ── X: Price Range Filter ── */
function injectPriceFilter() {
  const filterBar = document.querySelector('.filter-bar') || document.querySelector('.search-filter-bar');
  if (!filterBar || document.getElementById('price-filter-row')) return;
  let maxPrice = 0;
  document.querySelectorAll('.add-btn').forEach(b => {
    const p = parseInt(b.dataset.price || 0);
    if (p > maxPrice) maxPrice = p;
  });
  if (!maxPrice) return;
  maxPrice = Math.ceil(maxPrice / 1000) * 1000;
  const row = document.createElement('div');
  row.id = 'price-filter-row';
  row.className = 'price-filter-row';
  row.innerHTML = `
    <label>💰 Up to</label>
    <input type="range" class="price-slider" id="price-slider"
      min="0" max="${maxPrice}" step="500" value="${maxPrice}"
      oninput="updatePriceFilter(this)">
    <span class="price-value-tag" id="price-tag">₹${maxPrice.toLocaleString('en-IN')}</span>`;
  filterBar.appendChild(row);
}

function updatePriceFilter(slider) {
  const val = parseInt(slider.value);
  const max = parseInt(slider.max);
  const pct = Math.round((val / max) * 100);
  slider.style.background = `linear-gradient(to right,#c9973a 0%,#c9973a ${pct}%,rgba(255,255,255,0.15) ${pct}%)`;
  document.getElementById('price-tag').textContent = '₹' + val.toLocaleString('en-IN');
  document.querySelectorAll('.product-card').forEach(card => {
    const b = card.querySelector('.add-btn');
    card.style.display = parseInt(b?.dataset.price || 0) <= val ? '' : 'none';
  });
}


