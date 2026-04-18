// admin.js

let currentAdminEmail = null;
let allOrders = [];

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
  await fetchOrders();
}

async function fetchOrders() {
  try {
    const res = await fetch(`/api/all-orders?adminEmail=${encodeURIComponent(currentAdminEmail)}`);
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
  renderOrders(status);
}

function renderOrders(filterStatus) {
  const grid = document.getElementById('admin-orders-grid');
  document.getElementById('loading-orders').style.display = 'none';
  
  let filtered = allOrders;
  if (filterStatus !== 'all') {
    filtered = allOrders.filter(o => o.status === filterStatus);
  }
  
  // Newest first
  filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

  grid.innerHTML = '';
  
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.5); grid-column: 1/-1;">No orders found for this filter.</p>';
    return;
  }

  filtered.forEach(order => {
    const dateObj = new Date(order.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    let itemsHTML = order.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('');
    
    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    const card = document.createElement('div');
    card.className = `admin-order-card ${statusClass}`;
    
    let actionsHTML = '';
    if (order.status === 'Awaiting Confirmation') {
      actionsHTML = `
        <div class="oc-actions">
          <button class="oc-btn oc-btn-accept" onclick="updateOrderStatus('${order.id}', 'Accepted')">Accept</button>
          <button class="oc-btn oc-btn-reject" onclick="updateOrderStatus('${order.id}', 'Rejected')">Reject</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="oc-header">
        <span class="oc-id">${order.id}</span>
        <span class="oc-date">${dateStr}</span>
      </div>
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
  if(!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
  
  try {
    const res = await fetch('/api/update-order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminEmail: currentAdminEmail, orderId, status: newStatus })
    });
    
    if (res.ok) {
      await fetchOrders(); // Refresh list automatically
    } else {
      alert("Failed to update status.");
    }
  } catch (err) {
    console.error(err);
    alert("Error updating order.");
  }
}
