/**
 * 调试脚本：真实 Chromium 中复现 modal/drawer 的 click-outside bug。
 * 流程：UI 登录 uitest01 → 给已存会话注入 admin 权限 → 打开营销创建优惠券抽屉 →
 * 测试：普通点击表单控件、点击下拉、drag-across（遮罩按下→面板内松开）是否会关闭抽屉。
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const { chromium } = await import(pathToFileURL('E:/sdkwork-space/sdkwork-cloudrouter/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs').href);

const BASE = 'http://127.0.0.1:3901';
const results = [];
function report(name, ok, extra = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 300)));

try {
  // ---------- 1. UI 登录 uitest01 ----------
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const account = page.getByRole('textbox', { name: '账号' });
  const password = page.getByRole('textbox', { name: '密码' });
  if ((await account.count()) && (await password.count())) {
    await account.fill('uitest01');
    await password.fill('Test@12345');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForTimeout(4000);
    const afterLogin = page.url();
    report('登录成功并跳转', !afterLogin.includes('login'), afterLogin);
  } else {
    report('登录表单可见', false);
  }

  // ---------- 2. 注入 admin 权限到已存会话 ----------
  const patched = await page.evaluate(() => {
    const KEY = 'sdkwork.cloudRouter.appSession.v1';
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ok: false, why: 'no session' };
    const session = JSON.parse(raw);
    const scope = session.context?.permissionScope ?? [];
    for (const code of ['cloudrouter.admin.access', 'cloudrouter.system.read']) {
      if (!scope.includes(code)) scope.push(code);
    }
    session.context.permissionScope = scope;
    session.context.standardRoleCodes = ['admin'];
    session.expiresAt = (session.expiresAt ?? 0) + 86400 * 7;
    localStorage.setItem(KEY, JSON.stringify(session));
    return { ok: true, scope };
  });
  report('已存会话注入 admin 权限', patched.ok === true, JSON.stringify(patched));

  // ---------- 3. 打开营销优惠券页 ----------
  await page.goto(`${BASE}/admin/marketing/offers`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const url = page.url();
  report('进入营销优惠券页(非登录页)', !url.includes('login') && !url.includes('auth'), url);

  // ---------- 4. 打开创建优惠券抽屉 ----------
  const createBtn = page.getByRole('button', { name: /Create Coupon|创建优惠券/i });
  if (await createBtn.count()) {
    await createBtn.first().click();
    await page.waitForTimeout(1500);
    const drawerTitle = page.getByRole('heading', { name: /Create Coupon|创建优惠券/i });
    report('创建优惠券抽屉已打开', (await drawerTitle.count()) > 0);
  } else {
    report('创建优惠券按钮存在', false, '未找到按钮');
  }

  // ---------- 5. 普通点击表单输入框 ----------
  const couponNameInput = page.getByPlaceholder(/New User Welcome Coupon/i).first();
  if (await couponNameInput.count()) {
    await couponNameInput.click();
    await page.waitForTimeout(600);
    const stillOpen = (await page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).count()) > 0;
    report('点击文本输入框后抽屉保持打开', stillOpen);
  } else {
    report('优惠券名称输入框存在', false);
  }

  // ---------- 6. 点击原生下拉（Goods Scope） ----------
  const goodsScope = page.locator('select').first();
  if (await goodsScope.count()) {
    await goodsScope.click();
    await page.waitForTimeout(500);
    await goodsScope.selectOption({ index: 1 });
    await page.waitForTimeout(600);
    const stillOpen = (await page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).count()) > 0;
    report('选择下拉框后抽屉保持打开', stillOpen);
  } else {
    report('表单原生下拉存在', false);
  }

  // ---------- 7. 点击券类型卡片选择器 ----------
  const benefitCard = page.getByRole('button', { name: /Points/i }).first();
  if (await benefitCard.count()) {
    await benefitCard.click();
    await page.waitForTimeout(600);
    const stillOpen = (await page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).count()) > 0;
    report('点击券类型卡片后抽屉保持打开', stillOpen);
  } else {
    report('券类型卡片按钮存在', false);
  }

  // ---------- 8. drag-across：遮罩按下 -> 面板内松开 ----------
  {
    const overlay = page.locator('div.fixed.inset-0').first();
    const drawerTitle = page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).first();
    const box = await overlay.boundingBox().catch(() => null);
    const drawerBox = await drawerTitle.boundingBox().catch(() => null);
    if (box && drawerBox) {
      await page.mouse.move(box.x + 30, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(drawerBox.x + drawerBox.width / 2, drawerBox.y + 300, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const stillOpen = (await page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).count()) > 0;
      report('drag-across(遮罩按下→面板内松开)后抽屉保持打开', stillOpen);
    } else {
      report('drag-across 测试可执行', false, '未取到遮罩/抽屉位置');
    }
  }

  // ---------- 9. 点击遮罩本体关闭（期望行为） ----------
  {
    const overlay = page.locator('div.fixed.inset-0').first();
    const box = await overlay.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + 20, box.y + box.height / 2);
      await page.waitForTimeout(800);
      const stillOpen = (await page.getByRole('heading', { name: /Create Coupon|创建优惠券/i }).count()) > 0;
      report('点击遮罩本体后抽屉关闭(期望)', !stillOpen);
    }
  }
} catch (err) {
  console.log('SCRIPT ERROR:', String(err).slice(0, 500));
}

if (pageErrors.length) console.log('PAGE ERRORS:', pageErrors.slice(0, 5));
await browser.close();
const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n==== 结果：${results.length - failed.length}/${results.length} PASS ====`);
if (failed.length) process.exitCode = 1;
