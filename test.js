const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:3000/login.html');
  
  await page.evaluate(() => {
    localStorage.setItem('lakshmanna_current_user', JSON.stringify({
      name: "Test User",
      email: "test@example.com"
    }));
  });

  await page.goto('http://localhost:3000/profile.html');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
