const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('request', request => {
    if (request.url().includes('v1')) {
      console.log(`REQ: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('v1')) {
      console.log(`RES: ${response.status()} ${response.url()}`);
    }
  });

  page.on('console', msg => {
    console.log(`CONSOLE: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err}`);
  });

  try {
    await page.goto('https://cloud.phoxtra.com/console/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);
  } catch(e) {
    console.log(e);
  }
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
