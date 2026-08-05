/**
 * 调试脚本：console 侧抽屉/对话框的 click-outside 行为测试（uitest01 可访问）。
 */
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL('E:/sdkwork-space/sdkwork-cloudrouter/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs').href);
const BASE = 'http://127.0.0.1:3901';
const results = [];
const report = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));

// 登录 uitest01
await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.getByRole('textbox', { name: '账号' }).fill('uitest01');
await page.getByRole('textbox', { name: '密码' }).fill('Test@12345');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForTimeout(4000);
report('登录成功', !page.url().includes('login'), page.url());

// ---- 测试1: api-keys 创建令牌抽屉 ----
await page.goto(`${BASE}/console/api-keys`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const createBtn = page.getByRole('button', { name: '创建令牌' });
report('创建令牌按钮可见', (await createBtn.count()) > 0);
if (await createBtn.count()) {
  await createBtn.click();
  await page.waitForTimeout(1500);
  const drawerHeading = page.getByRole('heading', { name: /创建 API 令牌|Create API Key|API 令牌|创建令牌/i }).first();
  const drawerVisible = (await drawerHeading.count()) > 0;
  report('创建令牌抽屉已打开', drawerVisible);
  if (drawerVisible) {
    const inputs = page.locator('input[type="text"], input:not([type])');
    const ic = await inputs.count();
    report('抽屉内文本输入框存在', ic > 0, `count=${ic}`);
    if (ic > 0) {
      await inputs.first().click();
      await page.waitForTimeout(500);
      report('点击抽屉内输入框后抽屉保持打开', (await drawerHeading.count()) > 0);
    }
    const selects = page.locator('select');
    const sc = await selects.count();
    report('抽屉内原生下拉数量', sc >= 0, `count=${sc}`);
    if (sc > 0) {
      await selects.first().click();
      await page.waitForTimeout(400);
      await selects.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);
      report('选择下拉后抽屉保持打开', (await drawerHeading.count()) > 0);
    }
    // 分组选择按钮（GroupPicker trigger）
    const groupPicker = page.locator('[data-sdk-group-picker] button').first();
    if (await groupPicker.count()) {
      await groupPicker.click();
      await page.waitForTimeout(1200);
      const dialogOpen = (await page.getByRole('dialog', { name: /Select groups|选择分组/i }).count()) > 0;
      report('GroupPicker 对话框已打开', dialogOpen);
      if (dialogOpen) {
        // 点击对话框内部（搜索框）
        const search = page.getByPlaceholder(/Search|搜索/i).first();
        if (await search.count()) {
          await search.click();
          await page.waitForTimeout(500);
          report('点击 GroupPicker 内部搜索框后对话框保持打开', (await page.getByRole('dialog', { name: /Select groups|选择分组/i }).count()) > 0);
        }
      }
    }
  }
}

await browser.close();
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n==== 结果：${results.length - failed.length}/${results.length} PASS ====`);
if (errs.length) console.log('PAGE ERRORS:', errs.slice(0, 4));
