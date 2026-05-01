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

  // Re-fetch orders every time the Orders tab is opened
  if (tabId === 'orders') {
    renderOrders();
  }
  // Re-fetch addresses every time the Addresses tab is opened
  if (tabId === 'addresses') {
    renderAddresses();
  }
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

// ── Address Logic (Fetched from Backend DB) ──
let cachedAddresses = [];

async function loadAddresses() {
  try {
    const res = await fetch(`/api/addresses?email=${encodeURIComponent(currentUser.email)}`);
    if (res.ok) {
      cachedAddresses = await res.json();
    } else {
      cachedAddresses = [];
    }
  } catch (err) {
    console.error("Failed to load addresses:", err);
    cachedAddresses = [];
  }
}

async function renderAddresses() {
  const list = document.getElementById('address-list');
  list.innerHTML = '<p style="color:#f5d08a;">Loading addresses...</p>';
  await loadAddresses();
  
  list.innerHTML = '';
  cachedAddresses.forEach((addr, idx) => {
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

async function saveAddress(event) {
  event.preventDefault();
  const addr = {
    name: document.getElementById('addr-name').value,
    street: document.getElementById('addr-street').value,
    city: document.getElementById('addr-city').value,
    state: document.getElementById('addr-state').value,
    pin: document.getElementById('addr-pin').value
  };

  const newAddrs = [...cachedAddresses, addr];
  
  try {
    const btn = document.querySelector('#address-form .action-btn');
    const oldText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, addresses: newAddrs })
    });
    
    btn.textContent = oldText;
    btn.disabled = false;
    
    closeAddressForm();
    renderAddresses();
  } catch (err) {
    console.error('Failed to save address:', err);
    alert('Failed to save address. Please try again.');
  }
}

async function deleteAddress(idx) {
  if (confirm("Remove this address?")) {
    const newAddrs = [...cachedAddresses];
    newAddrs.splice(idx, 1);
    
    try {
      await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, addresses: newAddrs })
      });
      renderAddresses();
    } catch (err) {
      console.error('Failed to delete address:', err);
      alert('Failed to delete address. Please try again.');
    }
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

  // Server already returns newest-first (sort: { date: -1 })
  orders.forEach(order => {
    const dateObj = new Date(order.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    let itemsHTML = order.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join('');
    
    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    // Payment badge
    const paymentBadge = order.paymentStatus === 'Paid'
      ? `<span style="background:rgba(100,200,100,0.15); border:1px solid rgba(100,200,100,0.3); color:#7ecb7e; font-size:0.72rem; padding:3px 10px; border-radius:50px; letter-spacing:1px;">💳 PAID</span>`
      : order.paymentStatus === 'COD'
      ? `<span style="background:rgba(197,151,58,0.1); border:1px solid rgba(197,151,58,0.3); color:#c9973a; font-size:0.72rem; padding:3px 10px; border-radius:50px; letter-spacing:1px;">🤝 COD</span>`
      : '';

    // E – Order status timeline
    if (!document.getElementById('timeline-glow-styles')) {
      const ts = document.createElement('style');
      ts.id = 'timeline-glow-styles';
      ts.textContent = `
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(197,151,58,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(197,151,58,0); }
          100% { box-shadow: 0 0 0 0 rgba(197,151,58,0); }
        }
        @keyframes fillLine {
          0% { background-size: 0% 100%; }
          100% { background-size: 100% 100%; }
        }
        .timeline-step-glow {
          animation: pulseGlow 2s infinite;
        }
        .timeline-line-fill {
          background: linear-gradient(90deg, #f5d08a, #c9973a) no-repeat left;
          background-size: 100% 100%;
          animation: fillLine 1s ease forwards;
          box-shadow: 0 0 8px rgba(197,151,58,0.5);
        }
      `;
      document.head.appendChild(ts);
    }

    const steps = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];
    const rejectedTimeline = order.status === 'Rejected';
    let currentStep = 0;
    if (order.status === 'Accepted')   currentStep = 1;
    if (order.status === 'Dispatched') currentStep = 2;
    if (order.status === 'Delivered')  currentStep = 3;

    const timelineHTML = rejectedTimeline
      ? `<div style="margin:14px 0 6px; padding:8px 14px; background:rgba(200,50,50,0.12); border:1px solid rgba(200,50,50,0.3); border-radius:8px; color:#ff9090; font-size:0.8rem;">❌ This order was rejected. Contact us for assistance.</div>`
      : `<div style="display:flex; align-items:center; gap:0; margin:14px 0 6px;">
          ${steps.map((step, i) => {
            const done  = i <= currentStep;
            const isCurrent = i === currentStep;
            const col   = done ? '#f5d08a' : 'rgba(255,255,255,0.2)';
            const txtCol= done ? '#f5d08a' : 'rgba(255,255,255,0.35)';
            const glowClass = isCurrent ? 'timeline-step-glow' : '';
            return `
              <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                <div class="${glowClass}" style="width:26px; height:26px; border-radius:50%; background:${done ? 'rgba(197,151,58,0.25)' : 'rgba(255,255,255,0.05)'}; border:2px solid ${col}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:${col}; margin-bottom:5px; transition: all 0.3s ease;">${done ? '✓' : (i+1)}</div>
                <span style="font-size:0.65rem; letter-spacing:1px; color:${txtCol}; text-transform:uppercase; text-align:center; font-weight:${isCurrent ? '700' : '400'};">${step}</span>
              </div>
              ${i < steps.length-1 ? `<div style="flex:1; height:2px; background:rgba(255,255,255,0.1); margin-bottom:22px;"><div class="${done && i < currentStep ? 'timeline-line-fill' : ''}" style="height:100%; width:${done && i < currentStep ? '100%' : '0%'}; border-radius:2px;"></div></div>` : ''}
            `;
          }).join('')}
        </div>`;

    let cancelBtnHTML = '';
    if (order.status === 'Awaiting Confirmation') {
      cancelBtnHTML = `<button onclick="cancelOrder('${order.id}')" style="background:rgba(200,50,50,0.1); border:1px solid rgba(200,50,50,0.3); color:#ff9090; padding:6px 12px; border-radius:50px; font-size:0.75rem; letter-spacing:1px; cursor:pointer; margin-top:10px; transition:all 0.2s ease;">❌ Cancel Order</button>`;
    }

    list.innerHTML += `
      <div class="order-card box-shadow">
        <div class="order-header">
           <span class="order-date">${dateStr}</span>
           <span class="order-total">₹${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <div class="order-status ${statusClass}">${order.status}</div>
          ${paymentBadge}
        </div>
        ${timelineHTML}
        <ul class="order-items-list">${itemsHTML}</ul>
        <p class="order-address-sm"><strong>Shipped to:</strong> <br/>${order.address ? order.address.replace(/\n/g, '<br/>') : 'N/A'}</p>
        ${cancelBtnHTML}
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

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  
  try {
    const res = await fetch('/api/cancel-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, orderId })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to cancel order.');
    } else {
      alert('Order cancelled successfully.');
      renderOrders();
    }
  } catch (err) {
    alert('Error cancelling order. Please try again later.');
  }
}
