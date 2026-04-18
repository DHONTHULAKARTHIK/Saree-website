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

// Restore qty-counter state from localStorage on page load
document.addEventListener('DOMContentLoaded', function () {
  const cart = getCart();
  document.querySelectorAll('.add-btn').forEach(btn => {
    const item = cart.find(i => i.id === btn.dataset.id);
    if (item) {
      const footer  = btn.parentElement;
      const counter = footer.querySelector('.qty-counter');
      counter.querySelector('.qty-count').textContent = item.qty;
      btn.style.display = 'none';
      counter.classList.add('visible');
    }
  });
});
