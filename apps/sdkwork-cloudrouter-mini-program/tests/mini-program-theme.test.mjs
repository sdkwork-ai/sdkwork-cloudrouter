import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('native console pages use the H5 light theme, not the dark shell', () => {
  const styles = [
    'src/pages/usage/index.wxss',
    'src/pages/api-keys/index.wxss',
    'src/pages/catalog/index.wxss',
  ];
  for (const file of styles) {
    const source = read(file);
    assert.ok(!source.includes('#0b1220'), `${file} has no dark page background`);
    assert.ok(
      !/background(?:-color)?:\s*#0f172a/iu.test(source),
      `${file} has no dark slate surface`,
    );
  }
  const appStyles = read('src/app.wxss');
  assert.ok(appStyles.includes('background-color: #f5f7fb'));
  assert.ok(appStyles.includes('.theme-dark'));
  assert.ok(read('src/pages/usage/index.wxss').includes('#2563eb'));
  assert.ok(read('src/pages/catalog/index.wxss').includes('#f5f7fb'));
  const env = JSON.parse(
    read('config/mini-program/runtime-env.standalone.development.json'),
  );
  assert.ok(
    env.SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL,
    'the H5 web ingress is materialized for the bridge',
  );
});

test('native pages apply appearance.theme through the shared dark override', () => {
  const app = read('src/app.js');
  assert.ok(app.includes('resolveTheme'));
  assert.ok(app.includes('applyChrome'));
  const styles = read('src/app.wxss');
  assert.ok(styles.includes('.theme-dark.cr-page'));
  assert.ok(styles.includes('.theme-dark.sdk-settings'));
  for (const page of [
    'dashboard',
    'profile',
    'catalog',
    'usage',
    'api-keys',
    'settings',
    'messages',
    'playground',
  ]) {
    const wxml = read(`src/pages/${page}/index.wxml`);
    assert.ok(wxml.includes('{{themeClass}}'), `${page} opts into the theme class`);
    const js = read(`src/pages/${page}/index.js`);
    assert.ok(js.includes('themeClass'), `${page} resolves the theme class`);
  }
});
