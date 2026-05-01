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

    // Store welcome message for destination page to pick up
    const firstName = (result.user.name || 'back').split(' ')[0];
    const welcomeMsg = type === 'signup'
      ? `✨ Account created! Welcome, ${firstName}!`
      : `👋 Welcome back, ${firstName}!`;
    sessionStorage.setItem('lakshmanna_welcome_msg', welcomeMsg);

    // Redirect back to where the user came from (e.g. cart), or default to home
    const redirectTo = localStorage.getItem('lakshmanna_redirect_after_login') || 'home.html';
    localStorage.removeItem('lakshmanna_redirect_after_login');

    // Wait slightly for visual UX processing
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 500);

  } catch (error) {
    console.error("Auth Error:", error);
    alert('Failed to connect to the server. Is server.js running?');
    btn.textContent = type === 'signup' ? 'Create Account' : 'Login to Account';
    btn.style.opacity = "1";
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

function continueAsGuest(event) {
  event.preventDefault();
  // Clear any previous user session and cart data so guest always starts fresh
  localStorage.removeItem('lakshmanna_current_user');
  localStorage.removeItem('lakshmanna_cart');
  window.location.href = 'home.html';
}

/* ─────────────────────────────────────────────
   Forgot Password Flow
───────────────────────────────────────────── */
let _fpEmail = ''; // store email across steps

function _showForm(formId, titleText, showToggle = false, showSkip = true) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(formId).classList.add('active');
  document.getElementById('auth-title').textContent = titleText;
  document.getElementById('auth-toggle').style.display = showToggle ? 'flex' : 'none';
  const skip = document.getElementById('skip-link');
  if (skip) skip.style.display = showSkip ? 'block' : 'none';
}

function showForgotStep1(event) {
  if (event) event.preventDefault();
  document.getElementById('fp-email').value = '';
  document.getElementById('fp-msg-1').style.display = 'none';
  _showForm('form-forgot-1', 'Reset Password', false, false);
}

function showLoginTab() {
  _showForm('form-login', 'Welcome', true, true);
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.toggle-btn')[0].classList.add('active');
}

async function sendResetCode(event) {
  event.preventDefault();
  const email = document.getElementById('fp-email').value.trim();
  const btn   = document.getElementById('fp-send-btn');
  const msg   = document.getElementById('fp-msg-1');

  btn.textContent = 'Sending...';
  btn.style.opacity = '0.7';
  msg.style.display = 'none';

  try {
    const res  = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = '❌ ' + (data.error || 'Something went wrong.');
      msg.className = 'fp-msg error';
      msg.style.display = 'block';
    } else {
      _fpEmail = email;
      document.getElementById('fp-sent-to').textContent = email;
      document.getElementById('fp-code').value = '';
      document.getElementById('fp-msg-2').style.display = 'none';
      _showForm('form-forgot-2', 'Enter Your Code', false, false);
    }
  } catch(e) {
    msg.textContent = '❌ Could not connect to server.';
    msg.className = 'fp-msg error';
    msg.style.display = 'block';
  }

  btn.textContent = 'Send Reset Code';
  btn.style.opacity = '1';
}

async function verifyResetCode(event) {
  event.preventDefault();
  const code = document.getElementById('fp-code').value.trim();
  const btn  = document.getElementById('fp-verify-btn');
  const msg  = document.getElementById('fp-msg-2');

  btn.textContent = 'Verifying...';
  btn.style.opacity = '0.7';
  msg.style.display = 'none';

  try {
    const res  = await fetch('/api/verify-reset-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _fpEmail, code })
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = '❌ ' + (data.error || 'Invalid or expired code.');
      msg.className = 'fp-msg error';
      msg.style.display = 'block';
    } else {
      document.getElementById('fp-newpass').value    = '';
      document.getElementById('fp-confirmpass').value = '';
      document.getElementById('fp-msg-3').style.display = 'none';
      _showForm('form-forgot-3', 'New Password', false, false);
    }
  } catch(e) {
    msg.textContent = '❌ Could not connect to server.';
    msg.className = 'fp-msg error';
    msg.style.display = 'block';
  }

  btn.textContent = 'Verify Code';
  btn.style.opacity = '1';
}

async function resetPassword(event) {
  event.preventDefault();
  const newPass     = document.getElementById('fp-newpass').value;
  const confirmPass = document.getElementById('fp-confirmpass').value;
  const btn = document.getElementById('fp-reset-btn');
  const msg = document.getElementById('fp-msg-3');

  if (newPass !== confirmPass) {
    msg.textContent = '❌ Passwords do not match.';
    msg.className = 'fp-msg error';
    msg.style.display = 'block';
    return;
  }
  if (newPass.length < 6) {
    msg.textContent = '❌ Password must be at least 6 characters.';
    msg.className = 'fp-msg error';
    msg.style.display = 'block';
    return;
  }

  btn.textContent = 'Resetting...';
  btn.style.opacity = '0.7';
  msg.style.display = 'none';

  try {
    const res  = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _fpEmail, newPass })
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = '❌ ' + (data.error || 'Failed to reset password.');
      msg.className = 'fp-msg error';
      msg.style.display = 'block';
    } else {
      msg.textContent = '✅ Password reset successfully! Redirecting to login...';
      msg.className = 'fp-msg success';
      msg.style.display = 'block';
      setTimeout(() => showLoginTab(), 2000);
    }
  } catch(e) {
    msg.textContent = '❌ Could not connect to server.';
    msg.className = 'fp-msg error';
    msg.style.display = 'block';
  }

  btn.textContent = 'Reset Password';
  btn.style.opacity = '1';
}
