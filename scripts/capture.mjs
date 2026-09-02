import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2
  });
  await page.goto('http://localhost:3000/editor');
  // wait for editor to render
  await page.waitForTimeout(3000);
  
  // optionally, interact to add some text
  // but it seems there's standard content in localstorage or it's empty
  await page.type('.ProseMirror', 'Welcome to Notion-like Editor!');
  await page.keyboard.press('Enter');
  await page.type('.ProseMirror', '/');
  
  // wait for slash menu
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'public/screenshot.png' });
  await browser.close();
})();
