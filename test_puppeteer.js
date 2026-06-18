const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', response => console.log('PAGE RESPONSE:', response.status(), response.url()));
  await page.goto('http://localhost:8080/inmortal/index.html', { waitUntil: 'networkidle0' });
  await browser.close();
})();
