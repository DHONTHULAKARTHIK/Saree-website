const fs = require('fs');
let code = fs.readFileSync('profile.js', 'utf8');

const targetStr = `    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    list.innerHTML += \\`
      <div class="order-card box-shadow">
        <div class="order-header">
           <span class="order-date">\${dateStr}</span>
           <span class="order-total">₹\${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="order-status \${statusClass}">\${order.status}</div>
        <ul class="order-items-list">\${itemsHTML}</ul>
        <p class="order-address-sm"><strong>Shipped to:</strong> <br/>\${order.address.replace(/\\n/g, '<br/>')}</p>
      </div>
    \\`;`;

const replacementStr = `    let statusClass = 'status-pending';
    if (order.status === 'Accepted') statusClass = 'status-accepted';
    if (order.status === 'Rejected') statusClass = 'status-rejected';

    // Payment badge
    const paymentBadge = order.paymentStatus === 'Paid'
      ? \\\`<span style="background:rgba(100,200,100,0.15); border:1px solid rgba(100,200,100,0.3); color:#7ecb7e; font-size:0.72rem; padding:3px 10px; border-radius:50px; letter-spacing:1px;">💳 PAID</span>\\\`
      : order.paymentStatus === 'COD'
      ? \\\`<span style="background:rgba(197,151,58,0.1); border:1px solid rgba(197,151,58,0.3); color:#c9973a; font-size:0.72rem; padding:3px 10px; border-radius:50px; letter-spacing:1px;">🤝 COD</span>\\\`
      : '';

    // E – Order status timeline
    if (!document.getElementById('timeline-glow-styles')) {
      const ts = document.createElement('style');
      ts.id = 'timeline-glow-styles';
      ts.textContent = \\\`
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
      \\\`;
      document.head.appendChild(ts);
    }

    const steps = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];
    const rejectedTimeline = order.status === 'Rejected';
    let currentStep = 0;
    if (order.status === 'Accepted')   currentStep = 1;
    if (order.status === 'Dispatched') currentStep = 2;
    if (order.status === 'Delivered')  currentStep = 3;

    const timelineHTML = rejectedTimeline
      ? \\\`<div style="margin:14px 0 6px; padding:8px 14px; background:rgba(200,50,50,0.12); border:1px solid rgba(200,50,50,0.3); border-radius:8px; color:#ff9090; font-size:0.8rem;">❌ This order was rejected. Contact us for assistance.</div>\\\`
      : \\\`<div style="display:flex; align-items:center; gap:0; margin:14px 0 6px;">
          \${steps.map((step, i) => {
            const done  = i <= currentStep;
            const isCurrent = i === currentStep;
            const col   = done ? '#f5d08a' : 'rgba(255,255,255,0.2)';
            const txtCol= done ? '#f5d08a' : 'rgba(255,255,255,0.35)';
            const glowClass = isCurrent ? 'timeline-step-glow' : '';
            return \\\\\\`
              <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                <div class="\${glowClass}" style="width:26px; height:26px; border-radius:50%; background:\${done ? 'rgba(197,151,58,0.25)' : 'rgba(255,255,255,0.05)'}; border:2px solid \${col}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:\${col}; margin-bottom:5px; transition: all 0.3s ease;">\${done ? '✓' : (i+1)}</div>
                <span style="font-size:0.65rem; letter-spacing:1px; color:\${txtCol}; text-transform:uppercase; text-align:center; font-weight:\${isCurrent ? '700' : '400'};">\${step}</span>
              </div>
              \${i < steps.length-1 ? \\\\\\`<div style="flex:1; height:2px; background:rgba(255,255,255,0.1); margin-bottom:22px;"><div class="\${done && i < currentStep ? 'timeline-line-fill' : ''}" style="height:100%; width:\${done && i < currentStep ? '100%' : '0%'}; border-radius:2px;"></div></div>\\\\\\` : ''}
            \\\\\\`;
          }).join('')}
        </div>\\\`;

    list.innerHTML += \\\`
      <div class="order-card box-shadow">
        <div class="order-header">
           <span class="order-date">\${dateStr}</span>
           <span class="order-total">₹\${order.total.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <div class="order-status \${statusClass}">\${order.status}</div>
          \${paymentBadge}
        </div>
        \${timelineHTML}
        <ul class="order-items-list">\${itemsHTML}</ul>
        <p class="order-address-sm"><strong>Shipped to:</strong> <br/>\${order.address.replace(/\\n/g, '<br/>')}</p>
      </div>
    \\\`;`;

let t = code.includes(targetStr) ? targetStr : targetStr.replace(/\n/g, '\r\n');
if (code.includes(t)) {
  code = code.replace(t, replacementStr);
  fs.writeFileSync('profile.js', code);
  console.log("Successfully replaced");
} else {
  console.log("Target not found");
}
