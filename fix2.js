const fs = require('fs');
let code = fs.readFileSync('profile.js', 'utf8');

const target1 = "    // E – Order status timeline\r\n    const steps = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];";
const replace1 = `    // E – Order status timeline
    if (!document.getElementById('timeline-glow-styles')) {
      const ts = document.createElement('style');
      ts.id = 'timeline-glow-styles';
      ts.textContent = '@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(197,151,58,0.6); } 70% { box-shadow: 0 0 0 12px rgba(197,151,58,0); } 100% { box-shadow: 0 0 0 0 rgba(197,151,58,0); } } @keyframes fillLine { 0% { background-size: 0% 100%; } 100% { background-size: 100% 100%; } } .timeline-step-glow { animation: pulseGlow 2s infinite; } .timeline-line-fill { background: linear-gradient(90deg, #f5d08a, #c9973a) no-repeat left; background-size: 100% 100%; animation: fillLine 1s ease forwards; box-shadow: 0 0 8px rgba(197,151,58,0.5); }';
      document.head.appendChild(ts);
    }
    const steps = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];`;

const target2 = "            const done  = i <= currentStep;\r\n            const col   = done ? '#f5d08a' : 'rgba(255,255,255,0.2)';\r\n            const txtCol= done ? '#f5d08a' : 'rgba(255,255,255,0.35)';";
const replace2 = `            const done  = i <= currentStep;
            const isCurrent = i === currentStep;
            const col   = done ? '#f5d08a' : 'rgba(255,255,255,0.2)';
            const txtCol= done ? '#f5d08a' : 'rgba(255,255,255,0.35)';
            const glowClass = isCurrent ? 'timeline-step-glow' : '';`;

const target3 = "                <div style=\"width:26px; height:26px; border-radius:50%; background:${done ? 'rgba(197,151,58,0.25)' : 'rgba(255,255,255,0.05)'}; border:2px solid ${col}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:${col}; margin-bottom:5px;\">${done ? '✓' : (i+1)}</div>\r\n                <span style=\"font-size:0.65rem; letter-spacing:1px; color:${txtCol}; text-transform:uppercase; text-align:center;\">${step}</span>\r\n              </div>\r\n              ${i < steps.length-1 ? `<div style=\"flex:1; height:2px; background:${done && i < currentStep ? 'rgba(197,151,58,0.5)' : 'rgba(255,255,255,0.1)'}; margin-bottom:22px;\"></div>` : ''}";

const replace3 = "                <div class=\"${glowClass}\" style=\"width:26px; height:26px; border-radius:50%; background:${done ? 'rgba(197,151,58,0.25)' : 'rgba(255,255,255,0.05)'}; border:2px solid ${col}; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:${col}; margin-bottom:5px; transition: all 0.3s ease;\">${done ? '✓' : (i+1)}</div>\n                <span style=\"font-size:0.65rem; letter-spacing:1px; color:${txtCol}; text-transform:uppercase; text-align:center; font-weight:${isCurrent ? '700' : '400'};\">${step}</span>\n              </div>\n              ${i < steps.length-1 ? `<div style=\"flex:1; height:2px; background:rgba(255,255,255,0.1); margin-bottom:22px;\"><div class=\"${done && i < currentStep ? 'timeline-line-fill' : ''}\" style=\"height:100%; width:${done && i < currentStep ? '100%' : '0%'}; border-radius:2px;\"></div></div>` : ''}";


// Try to normalize to LF if CRLF is not found
let t1 = code.includes(target1) ? target1 : target1.replace(/\r\n/g, '\n');
let t2 = code.includes(target2) ? target2 : target2.replace(/\r\n/g, '\n');
let t3 = code.includes(target3) ? target3 : target3.replace(/\r\n/g, '\n');

if (code.includes(t1) && code.includes(t2) && code.includes(t3)) {
  code = code.replace(t1, replace1);
  code = code.replace(t2, replace2);
  code = code.replace(t3, replace3);
  fs.writeFileSync('profile.js', code);
  console.log("Successfully patched profile.js");
} else {
  console.log("Targets not found:");
  console.log("t1: ", code.includes(t1));
  console.log("t2: ", code.includes(t2));
  console.log("t3: ", code.includes(t3));
}
