import playwright from 'playwright';

async function main() {
    // print process.argv
    const url = process.argv[2];

    const browser = await playwright.firefox.launch({
      headless: false
    });

    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForTimeout(8000);
  }
  
  main();