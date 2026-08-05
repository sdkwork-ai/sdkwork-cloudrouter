import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL('E:/sdkwork-space/sdkwork-cloudrouter/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs').href);
const BASE = 'http://127.0.0.1:3901';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 400)); });

await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.getByRole('textbox', { name: '账号' }).fill('uitest01');
await page.getByRole('textbox', { name: '密码' }).fill('Test@12345');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForTimeout(4000);

await page.goto(`${BASE}/console/api-keys`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.getByRole('button', { name: '创建令牌' }).click();
await page.waitForTimeout(2000);

const body = await page.evaluate(() => document.body.innerText.slice(0, 1200));
console.log('BODY AFTER CLICK:', body.replace(/\n/g, ' | '));
console.log('URL:', page.url());
console.log('ERRORS:', errs.slice(0, 5));
await browser.close();
