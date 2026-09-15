// Resolved through the package-manager coordinate, not a hardcoded store path:
// the `.pnpm/<pkg>@<version>/` directory name embeds the resolved version and
// moving the workspace invalidates any absolute reference to it. `@playwright/test`
// is the declared devDependency of this package and re-exports `chromium`; the
// bare `playwright` runtime package is not declared anywhere.
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const responses = [];
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('ui-pc-react') && u.endsWith('.js')) responses.push(u);
});
await page.goto('http://127.0.0.1:3901/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
console.log('ui-pc-react chunks loaded:');
for (const u of responses.slice(0, 8)) console.log(' ', u.split('/').slice(-2).join('/'));
// 检查 popover chunk 内容是否含 z-[200]
const popChunk = responses.find((u) => u.includes('popover'));
if (popChunk) {
  const resp = await page.evaluate(async (url) => {
    const r = await fetch(url);
    const text = await r.text();
    return { hasZ200: text.includes('z-[200]'), len: text.length };
  }, popChunk);
  console.log('popover chunk:', JSON.stringify(resp));
}
await browser.close();
