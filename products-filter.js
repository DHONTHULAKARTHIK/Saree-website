let activeFilter = 'all';
let activeSort   = 'default';
let activeSearch = '';

function applyFilter(filter) {
  activeFilter = filter;
  renderFiltered();
}

function applySearch(query) {
  activeSearch = query;
  renderFiltered();
}

function applySort(sortValue) {
  activeSort = sortValue;
  renderFiltered();
}

function renderFiltered() {
  const grid  = document.getElementById('products-grid');
  const cards = Array.from(grid.querySelectorAll('.product-card'));

  // 1. Filter
  let filtered = cards.filter(card => {
    let matchesDropdown = (activeFilter === 'all') || (card.dataset.badge === activeFilter);
    let matchesSearch = true;
    
    if (activeSearch.trim() !== '') {
      const searchTerms = activeSearch.toLowerCase().trim();
      const name = (card.dataset.name || '').toLowerCase();
      const desc = card.querySelector('.product-info p').textContent.toLowerCase();
      matchesSearch = name.includes(searchTerms) || desc.includes(searchTerms);
    }
    
    return matchesDropdown && matchesSearch;
  });

  // 2. Sort
  filtered.sort((a, b) => {
    const pa = parseInt(a.dataset.price);
    const pb = parseInt(b.dataset.price);
    const na = a.dataset.name || '';
    const nb = b.dataset.name || '';
    if (activeSort === 'price-asc')  return pa - pb;
    if (activeSort === 'price-desc') return pb - pa;
    if (activeSort === 'name-asc')   return na.localeCompare(nb);
    if (activeSort === 'name-desc')  return nb.localeCompare(na);
    return 0; // default: original order
  });

  // 3. Hide all first
  cards.forEach(c => {
    c.style.display = 'none';
    c.classList.remove('card-visible');
  });

  // 4. Append filtered cards in sorted order & show with animation
  filtered.forEach((card, i) => {
    grid.appendChild(card); // re-order in DOM
    card.style.display = '';
    setTimeout(() => card.classList.add('card-visible'), i * 40);
  });

  // 5. Empty state check
  const noMsg = document.getElementById('no-products-msg');
  if (filtered.length === 0) {
    grid.style.display = 'none';
    if (noMsg) noMsg.style.display = 'block';
  } else {
    grid.style.display = 'grid'; // Ensure grid is visible
    if (noMsg) noMsg.style.display = 'none';
  }

  // 6. Update count text
  const countEl = document.getElementById('products-count');
  if (countEl) {
    if (filtered.length === 0) {
      countEl.textContent = '0 sarees found';
    } else {
      countEl.textContent = filtered.length === cards.length
        ? `Showing all ${cards.length} sarees`
        : `Showing ${filtered.length} of ${cards.length} sarees`;
    }
  }
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  renderFiltered();
});
