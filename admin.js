// admin.js

let currentAdminEmail = null;
let allOrders = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  const adminStr = sessionStorage.getItem('lakshmanna_admin');
  if (adminStr) {
    currentAdminEmail = adminStr;
    showDashboard();
  } else {
    document.getElementById('admin-login-section').style.display = 'flex';
    document.getElementById('admin-dashboard-section').style.display = 'none';
  }
});

function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const pass = document.getElementById('admin-pass').value;
  const msgEl = document.getElementById('login-msg');

  // Validate against backend so the password is never exposed in client-side code
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass })
  })
  .then(res => res.json().then(data => ({ ok: res.ok, data })))
  .then(({ ok, data }) => {
    if (ok && email === 'kotha.madesh@gmail.com') {
      sessionStorage.setItem('lakshmanna_admin', email);
      currentAdminEmail = email;
      showDashboard();
    } else {
      msgEl.textContent = data.error || 'Invalid admin credentials.';
      msgEl.style.display = 'block';
    }
  })
  .catch(() => {
    msgEl.textContent = 'Could not connect to server.';
    msgEl.style.display = 'block';
  });
}

function logoutAdmin() {
  sessionStorage.removeItem('lakshmanna_admin');
  window.location.reload();
}

async function showDashboard() {
  document.getElementById('admin-login-section').style.display = 'none';
  document.getElementById('admin-dashboard-section').style.display = 'block';

  // L – Inject stats bar if not present
  if (!document.getElementById('admin-stats-bar')) {
    const stats = document.createElement('div');
    stats.id = 'admin-stats-bar';
    stats.style.cssText = `display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px;`;
    stats.innerHTML = `
      <div class="admin-stat-card" id="stat-total">
        <div class="stat-icon">📦</div>
        <div class="stat-value" id="stat-total-val">—</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="admin-stat-card" id="stat-revenue">
        <div class="stat-icon">💰</div>
        <div class="stat-value" id="stat-revenue-val">—</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="admin-stat-card" id="stat-pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-value" id="stat-pending-val">—</div>
        <div class="stat-label">Awaiting Confirmation</div>
      </div>
    `;

    // Style the stat cards
    const style = document.createElement('style');
    style.textContent = `
      .admin-stat-card {
        background: rgba(197,151,58,0.08); border: 1px solid rgba(197,151,58,0.25);
        border-radius: 16px; padding: 22px 16px; text-align: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .admin-stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,0,0,0.4); }
      .stat-icon { font-size: 1.8rem; margin-bottom: 10px; }
      .stat-value { font-size: 1.6rem; font-weight: 700; color: #f5d08a; margin-bottom: 4px; letter-spacing: 1px; }
      .stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.55); letter-spacing: 2px; text-transform: uppercase; }
      @media (max-width: 600px) { #admin-stats-bar { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);

    // Insert before filters
    const filters = document.querySelector('.dash-filters');
    filters.insertAdjacentElement('beforebegin', stats);
  }

  await fetchOrders();
}

async function fetchOrders() {
  try {
    const res = await fetch(`/api/all-orders?token=lakshmanna_admin_2026_secret`);
    if (!res.ok) throw new Error('Failed to fetch');
    allOrders = await res.json();
    renderOrders('all');
  } catch (err) {
    console.error(err);
    document.getElementById('loading-orders').textContent = 'Error fetching orders.';
  }
}

function filterOrders(status, event) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  currentFilter = status;
  renderOrders(status);
}

function applyAdminSearch() {
  renderOrders(currentFilter);
}

function renderOrders(filterStatus) {
  const grid = document.getElementById('admin-orders-grid');
  document.getElementById('loading-orders').style.display = 'none';

  // L – Update stats bar with all-orders totals (always uses full allOrders, not filtered)
  const totalEl   = document.getElementById('stat-total-val');
  const revenueEl = document.getElementById('stat-revenue-val');
  const pendingEl = document.getElementById('stat-pending-val');
  if (totalEl) {
    totalEl.textContent   = allOrders.length;
    const revenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    revenueEl.textContent = '₹' + revenue.toLocaleString('en-IN');
    pendingEl.textContent = allOrders.filter(o => o.status === 'Awaiting Confirmation').length;
  }

  let filtered = allOrders;
  if (filterStatus !== 'all') {
    filtered = allOrders.filter(o => o.status === filterStatus);
  }
  
  // Apply Search
  const searchInput = document.getElementById('admin-search-input');
  if (searchInput && searchInput.value.trim() !== '') {
    const q = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.userEmail.toLowerCase().includes(q)
    );
  }
  
  // Newest first
  filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

  grid.innerHTML = '';
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
        <div style="font-size:3rem; margin-bottom:14px; opacity:0.5;">📭</div>
        <p style="color:#f5d08a; font-size:1.1rem; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">No Orders Found</p>
        <p style="color:rgba(255,255,255,0.45); font-size:0.85rem;">
          ${filterStatus === 'all' ? 'No orders have been placed yet.' : `No orders with status "${filterStatus}".`}
        </p>
      </div>
    `;
    return;
  }

  filtered.forEach(order => {
    const dateObj = new Date(order.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    let itemsHTML = order.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('');
    
    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    // Payment badge
    const paymentBadge = order.paymentStatus === 'Paid'
      ? `<span class="oc-payment-badge oc-paid">💳 PAID ONLINE</span>`
      : order.paymentStatus === 'COD'
      ? `<span class="oc-payment-badge oc-cod">🤝 COD</span>`
      : `<span class="oc-payment-badge oc-pending-pay">⏳ PAYMENT PENDING</span>`;

    const paymentIdLine = order.paymentId
      ? `<div class="oc-payment-id">Payment ID: ${order.paymentId}</div>`
      : '';

    const card = document.createElement('div');
    card.className = `admin-order-card ${statusClass}`;
    
    let actionsHTML = '';
    if (order.status === 'Awaiting Confirmation') {
      actionsHTML = `
        <div class="oc-actions">
          <button class="oc-btn oc-btn-accept" onclick="updateOrderStatus('${order.id}', 'Accepted')">✅ Accept</button>
          <button class="oc-btn oc-btn-reject" onclick="updateOrderStatus('${order.id}', 'Rejected')">❌ Reject</button>
        </div>
      `;
    } else if (order.status === 'Accepted') {
      actionsHTML = `
        <div class="oc-actions">
          <button class="oc-btn" style="background:rgba(100,150,255,0.15);border-color:rgba(100,150,255,0.4);color:#a0c0ff;" onclick="updateOrderStatus('${order.id}', 'Dispatched')">🚚 Mark Dispatched</button>
        </div>
      `;
    } else if (order.status === 'Dispatched') {
      actionsHTML = `
        <div class="oc-actions">
          <button class="oc-btn" style="background:rgba(100,220,100,0.15);border-color:rgba(100,220,100,0.4);color:#7ecb7e;" onclick="updateOrderStatus('${order.id}', 'Delivered')">📦 Mark Delivered</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="oc-header">
        <span class="oc-id">${order.id}</span>
        <span class="oc-date">${dateStr}</span>
      </div>
      ${paymentBadge}
      ${paymentIdLine}
      <div class="oc-customer">
        <div class="oc-customer-email">👤 ${order.userEmail}</div>
        <div class="oc-address">📍 ${order.address.replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="oc-items">
        <ul>${itemsHTML}</ul>
        <div class="oc-total">₹${order.total.toLocaleString('en-IN')}</div>
      </div>
      <div class="oc-status ${statusClass}">${order.status}</div>
      ${actionsHTML}
    `;
    grid.appendChild(card);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  if(!confirm(`Mark this order as "${newStatus}"?`)) return;
  
  try {
    const res = await fetch('/api/update-order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'lakshmanna_admin_2026_secret', orderId, status: newStatus })
    });
    
    if (res.ok) {
      await fetchOrders();
    } else {
      alert('Failed to update status.');
    }
  } catch (err) {
    console.error(err);
    alert('Error updating order.');
  }
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
  }
}

/* ── T: Export Orders as CSV ── */
function exportOrdersCSV() {
  if (!allOrders.length) { alert('No orders to export.'); return; }

  const header = ['Order ID', 'Date', 'Customer Email', 'Items', 'Total (₹)', 'Status', 'Payment'];
  const rows = allOrders.map(o => {
    const date = new Date(o.date).toLocaleDateString('en-IN');
    const items = o.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
    return [
      o.id, date, o.userEmail, items,
      o.total, o.status, o.paymentStatus || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`);
  });

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url, download: `lakshmanna_orders_${Date.now()}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
}

/* ── U: Customer List ── */
async function showCustomerList() {
  const panel = document.getElementById('customer-list-panel');
  if (!panel) return;

  // Toggle off
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  panel.innerHTML = '<p style="color:#f5d08a; padding:12px;">Loading customers…</p>';

  try {
    const res  = await fetch(`/api/all-users?token=lakshmanna_admin_2026_secret`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const rows = data.map(u => `
      <tr>
        <td style="padding:10px 14px;">${u.name}</td>
        <td style="padding:10px 14px;">${u.email}</td>
        <td style="padding:10px 14px; text-align:center;">${new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
      </tr>`).join('');

    panel.innerHTML = `
      <div style="background:rgba(197,151,58,0.06); border:1px solid rgba(197,151,58,0.2); border-radius:16px; padding:20px; overflow-x:auto;">
        <h3 style="color:#f5d08a; margin:0 0 16px; letter-spacing:2px; font-size:0.95rem; text-transform:uppercase;">👥 Registered Customers (${data.length})</h3>
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem; color:rgba(255,255,255,0.85);">
          <thead>
            <tr style="border-bottom:1px solid rgba(197,151,58,0.3); color:#f5d08a;">
              <th style="padding:10px 14px; text-align:left; letter-spacing:1px;">Name</th>
              <th style="padding:10px 14px; text-align:left; letter-spacing:1px;">Email</th>
              <th style="padding:10px 14px; letter-spacing:1px;">Joined</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (err) {
    panel.innerHTML = `<p style="color:#ff9090; padding:12px;">Error: ${err.message}</p>`;
  }
}
