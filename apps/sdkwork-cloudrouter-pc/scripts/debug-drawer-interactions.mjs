/**
 * 调试脚本：CreateKeyDrawer 内交互测试（真实 Chromium）。
 * 测试：点击输入框/模态按钮/分组选择器/过期时间按钮后抽屉是否保持打开；drag-across；遮罩点击。
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

const drawerOpen = async () => {
  // 抽屉面板：overlay 的直接子级（flex col panel）
  const panel = page.locator('div.fixed.inset-0 > div.flex.h-full').first();
  return (await panel.count()) > 0;
};

// 登录
await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.getByRole('textbox', { name: '账号' }).fill('uitest01');
await page.getByRole('textbox', { name: '密码' }).fill('Test@12345');
await page.getByRole('button', { name: '登录' }).click();
await page.waitForTimeout(4000);

// 打开创建令牌抽屉
await page.goto(`${BASE}/console/api-keys`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.getByRole('button', { name: '创建令牌' }).click();
await page.waitForTimeout(1500);
report('创建令牌抽屉已打开', await drawerOpen());

const panelSel = 'div.fixed.inset-0 > div.flex.h-full';

// 1. 点击名称输入框（抽屉内）
const nameInput = page.locator(`${panelSel} input[type="text"]`).first();
if (await nameInput.count()) {
  await nameInput.click();
  await page.waitForTimeout(400);
  report('点击名称输入框后抽屉保持打开', await drawerOpen());
}

// 2. 点击模态按钮（文本）
const modalTextBtn = page.getByRole('button', { name: '文本' }).first();
if (await modalTextBtn.count()) {
  await modalTextBtn.click();
  await page.waitForTimeout(400);
  report('点击模态按钮(文本)后抽屉保持打开', await drawerOpen());
}

// 3. 点击分组选择器（GroupPicker trigger，抽屉内）
const groupPickerTrigger = page.locator('[data-sdk-group-picker] button').first();
if (await groupPickerTrigger.count()) {
  await groupPickerTrigger.click();
  await page.waitForTimeout(1200);
  const gpDialog = page.locator('[role="dialog"]').filter({ hasText: /分组|group/i }).first();
  const gpOpen = (await gpDialog.count()) > 0 || (await page.getByRole('dialog').count()) > 0;
  report('GroupPicker 对话框已打开', gpOpen);
  report('GroupPicker 打开后抽屉仍保持打开', await drawerOpen());
  if (gpOpen) {
    // 点击 GroupPicker 内部搜索框
    const search = page.locator('[role="dialog"] input[type="text"]').first();
    if (await search.count()) {
      await search.click();
      await page.waitForTimeout(500);
      const gpStillOpen = (await page.getByRole('dialog').count()) > 0;
      report('点击 GroupPicker 内部搜索框后对话框保持打开', gpStillOpen);
      report('GroupPicker 内部点击后抽屉保持打开', await drawerOpen());
    }
    // 关闭 GroupPicker（Esc）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
}

// 4. 点击过期时间按钮（永不）
const neverBtn = page.getByRole('button', { name: '永不' }).first();
if (await neverBtn.count()) {
  await neverBtn.click();
  await page.waitForTimeout(400);
  report('点击过期时间(永不)后抽屉保持打开', await drawerOpen());
}

// 5. drag-across：遮罩按下 -> 抽屉内松开
{
  const overlay = page.locator('div.fixed.inset-0').first();
  const box = await overlay.boundingBox().catch(() => null);
  const panel = page.locator('div.fixed.inset-0 > div.flex.h-full').first();
  const hbox = await panel.boundingBox().catch(() => null);
  if (box && hbox) {
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + 300, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    report('drag-across(遮罩按下→抽屉内松开)后抽屉保持打开', await drawerOpen());
  } else {
    report('drag-across 测试可执行', false, '未取到遮罩/面板位置');
  }
}

// 6. 点击遮罩本体（抽屉外）→ 应关闭
{
  const overlay = page.locator('div.fixed.inset-0').first();
  const box = await overlay.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + 25, box.y + box.height / 2);
    await page.waitForTimeout(800);
    report('点击遮罩本体后抽屉关闭(期望)', !(await drawerOpen()));
  }
}

console.log('PAGE ERRORS:', errs.slice(0, 5));
await browser.close();
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n==== 结果：${results.length - failed.length}/${results.length} PASS ====`);
