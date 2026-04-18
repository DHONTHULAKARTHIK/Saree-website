/* ─────────────────────────────────────────────
   contact.js  –  Contact form handler
   Used on: contact.html
───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const interestSelect = document.getElementById('interest');
  const otherInterestGroup = document.getElementById('other-interest-group');
  
  if (interestSelect && otherInterestGroup) {
    interestSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Other') {
        otherInterestGroup.style.display = 'block';
      } else {
        otherInterestGroup.style.display = 'none';
        document.getElementById('other-interest').value = '';
      }
    });
  }
});

async function handleSubmit(e) {
  e.preventDefault();

  const submitBtn = document.querySelector('.submit-btn');
  const successMsg = document.getElementById('success-msg');

  // Read form values
  const name     = document.getElementById('name').value.trim();
  const phone    = document.getElementById('phone').value.trim();
  const email    = document.getElementById('email').value.trim();
  const interest = document.getElementById('interest').value;
  const otherEl  = document.getElementById('other-interest');
  const finalInterest = (interest === 'Other' && otherEl)
    ? (otherEl.value.trim() || 'Other')
    : interest;
  const message  = document.getElementById('message').value.trim();

  // Button loading state
  submitBtn.textContent = 'Sending…';
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.75';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, interest: finalInterest, message })
    });

    const data = await res.json();

    if (res.ok) {
      // Show success
      successMsg.textContent = '✅ Message sent! We\'ll get back to you shortly.';
      successMsg.style.color = '#7ecb7e';
      successMsg.classList.add('show');
      document.getElementById('contact-form').reset();
      // Hide the "other" field after reset
      const otherGroup = document.getElementById('other-interest-group');
      if (otherGroup) otherGroup.style.display = 'none';
    } else {
      successMsg.textContent = '❌ ' + (data.error || 'Something went wrong. Please try again.');
      successMsg.style.color = '#e07a7a';
      successMsg.classList.add('show');
    }
  } catch (err) {
    successMsg.textContent = '❌ Could not connect to server. Is it running?';
    successMsg.style.color = '#e07a7a';
    successMsg.classList.add('show');
  }

  // Reset button
  submitBtn.textContent = 'Send Message →';
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';

  // Auto-hide message after 6 seconds
  setTimeout(() => successMsg.classList.remove('show'), 6000);
}
