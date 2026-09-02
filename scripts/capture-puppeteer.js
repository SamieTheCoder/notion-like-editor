const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000/editor', { waitUntil: 'networkidle2' });
  
  // Wait for the editor to render
  await page.waitForSelector('.ProseMirror');
  
  // Type something
  await page.type('.ProseMirror', 'Welcome to Notion-like Editor!');
  await page.keyboard.press('Enter');
  await page.type('.ProseMirror', '/');
  
  // Wait for slash menu
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'public/screenshot.png' });
  await browser.close();
})();
