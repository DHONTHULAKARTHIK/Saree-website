/* ─────────────────────────────────────────────
   login.js  –  Authentication handler
   Used on: login.html
───────────────────────────────────────────── */

function switchTab(tab) {
  // Update buttons
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  const buttons = document.querySelectorAll('.toggle-btn');
  if (tab === 'login') buttons[0].classList.add('active');
  else buttons[1].classList.add('active');

  // Update forms
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.getElementById('form-' + tab).classList.add('active');
}

async function handleAuth(event, type) {
  event.preventDefault();
  
  const btn = event.submitter;
  btn.textContent = "Processing...";
  btn.style.opacity = "0.8";
  
  try {
    let payload = {};
    let endpoint = '';

    if (type === 'signup') {
      endpoint = '/api/signup';
      payload = {
        name: document.getElementById('signup-name').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        pass: document.getElementById('signup-pass').value
      };
    } else if (type === 'login') {
      endpoint = '/api/login';
      payload = {
        email: document.getElementById('login-email').value.trim(),
        pass: document.getElementById('login-pass').value
      };
    }

    // Call the server
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      // Show failure alert and reset button
      alert(result.error);
      btn.textContent = type === 'signup' ? 'Create Account' : 'Login to Account';
      btn.style.opacity = "1";
      return;
    }

    // On Success: Keep track of logged in state client-side
    localStorage.setItem('lakshmanna_current_user', JSON.stringify(result.user));

    // Wait slightly for visual UX processing
    setTimeout(() => {
      window.location.href = "home.html";
    }, 500);

  } catch (error) {
    console.error("Auth Error:", error);
    alert('Failed to connect to the server. Is server.js running?');
    btn.textContent = type === 'signup' ? 'Create Account' : 'Login to Account';
    btn.style.opacity = "1";
  }
}
