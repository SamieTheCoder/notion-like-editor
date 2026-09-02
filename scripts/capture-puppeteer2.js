const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/editor', { waitUntil: 'networkidle2' });
  
  // wait 5 seconds just to make sure everything loads
  await new Promise(r => setTimeout(r, 5000));
  
  await page.screenshot({ path: 'public/screenshot.png' });
  await browser.close();
})();
