/* profile.js - Logic for the dynamic user profile dashboard */

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('lakshmanna_current_user');
  
  if (!userStr) {
    window.location.href = "login.html";
    return;
  }

  try {
    currentUser = JSON.parse(userStr);
    
    // Sidebar info
    document.getElementById('sidebar-name').textContent = currentUser.name || "Valued Customer";
    document.getElementById('sidebar-email').textContent = currentUser.email || "No Email Provided";

    // Details tab
    document.getElementById('display-name').textContent = currentUser.name || "N/A";
    document.getElementById('display-email').textContent = currentUser.email || "N/A";

    renderAddresses();
    renderOrders();

  } catch (error) {
    console.error("Error parsing user data", error);
    window.location.href = "login.html";
  }
});

function switchTab(tabId, event) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

function logoutUser() {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem('lakshmanna_current_user');
    window.location.href = "index.html";
  }
}

// ── Password Change Logic ──
async function handlePasswordChange(event) {
  event.preventDefault();
  
  const oldPass = document.getElementById('old-pass').value;
  const newPass = document.getElementById('new-pass').value;
  const confirmPass = document.getElementById('confirm-pass').value;
  const msgEl = document.getElementById('pass-msg');
  const btn = document.getElementById('pass-submit-btn');

  msgEl.className = 'form-msg';
  msgEl.style.display = 'none';

  if (newPass !== confirmPass) {
    alert("New passwords do not match!");
    return;
  }

  btn.textContent = "Updating...";
  btn.style.opacity = '0.7';

  try {
    const response = await fetch('/api/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        oldPass: oldPass,
        newPass: newPass
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Failed to update password.");
    } else {
      alert("Password updated successfully!");
      document.querySelector('.password-form').reset();
    }
  } catch (err) {
    alert("Error communicating with server.");
  }

  btn.textContent = "Update Password";
  btn.style.opacity = '1';
}

// ── Address Logic (Mocked in LocalStorage) ──
function loadAddresses() {
  const store = localStorage.getItem('lakshmanna_addresses_' + currentUser.email);
  return store ? JSON.parse(store) : [];
}

function renderAddresses() {
  const list = document.getElementById('address-list');
  const addrs = loadAddresses();
  list.innerHTML = '';

  addrs.forEach((addr, idx) => {
    list.innerHTML += `
      <div class="address-card">
        <div>
          <h4>${addr.name}</h4>
          <p>${addr.street}</p>
          <p>${addr.city}, ${addr.state} - ${addr.pin}</p>
        </div>
        <button type="button" class="delete-addr-btn" onclick="deleteAddress(${idx})" title="Delete">✖</button>
      </div>
    `;
  });
}

function openAddressForm() {
  document.getElementById('address-form').classList.remove('hidden');
}

function closeAddressForm() {
  document.getElementById('address-form').classList.add('hidden');
  document.getElementById('address-form').reset();
}

function saveAddress(event) {
  event.preventDefault();
  const addr = {
    name: document.getElementById('addr-name').value,
    street: document.getElementById('addr-street').value,
    city: document.getElementById('addr-city').value,
    state: document.getElementById('addr-state').value,
    pin: document.getElementById('addr-pin').value
  };

  const addrs = loadAddresses();
  addrs.push(addr);
  localStorage.setItem('lakshmanna_addresses_' + currentUser.email, JSON.stringify(addrs));
  
  closeAddressForm();
  renderAddresses();
}

function deleteAddress(idx) {
  if (confirm("Remove this address?")) {
    const addrs = loadAddresses();
    addrs.splice(idx, 1);
    localStorage.setItem('lakshmanna_addresses_' + currentUser.email, JSON.stringify(addrs));
    renderAddresses();
  }
}

// ── Orders Logic (Fetched from Backend DB) ──
async function loadOrders() {
  try {
    const res = await fetch(`/api/my-orders?email=${encodeURIComponent(currentUser.email)}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (err) {
    console.error("Orders fetch error:", err);
    return [];
  }
}

async function renderOrders() {
  const list = document.getElementById('orders-list');
  const empty = document.getElementById('orders-empty');
  
  // Show a mini loading state
  list.innerHTML = '<p style="color: #f5d08a;">Loading orders...</p>';
  list.style.display = 'flex';
  list.style.gap = '15px';
  empty.style.display = 'none';

  const orders = await loadOrders();
  
  if (orders.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  list.innerHTML = '';
  list.style.flexDirection = 'column';

  // Reverse to show newest first
  orders.slice().reverse().forEach(order => {
    const dateObj = new Date(order.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    let itemsHTML = order.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('');
    
    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    list.innerHTML += `
      <div class="order-card box-shadow">
        <div class="order-header">
           <span class="order-date">${dateStr}</span>
           <span class="order-total">₹${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="order-status ${statusClass}">${order.status}</div>
        <ul class="order-items-list">${itemsHTML}</ul>
        <p class="order-address-sm"><strong>Shipped to:</strong> <br/>${order.address.replace(/\n/g, '<br/>')}</p>
      </div>
    `;
  });
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
