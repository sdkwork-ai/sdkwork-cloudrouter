import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel).replace(/^\uFEFF/u, ''));
}

test('H5, Flutter, and mini program agree on the five-tab order', () => {
  const h5Navigation = read(
    'apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-shell/src/navigation/consoleNavigation.ts',
  );
  for (const route of ['dashboard', 'playground', 'catalog', 'messages', 'profile']) {
    assert.ok(h5Navigation.includes(route), `H5 has ${route}`);
  }
  assert.ok(h5Navigation.includes("'apiKeys'"), 'H5 keeps API Key as a route');
  assert.ok(h5Navigation.includes("'usage'"), 'H5 keeps usage as a route');

  const flutterTabs = read(
    'apps/sdkwork-cloudrouter-flutter-mobile/packages/sdkwork_cloudrouter_flutter_mobile_shell/lib/src/navigation/console_tab_descriptors.dart',
  );
  const flutterOrder = [...flutterTabs.matchAll(/routeKey: '([^']+)'/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual(flutterOrder, [
    'dashboard',
    'playground',
    'catalog',
    'messages',
    'profile',
  ]);

  const mini = readJson('apps/sdkwork-cloudrouter-mini-program/src/app.json');
  assert.deepEqual(
    mini.tabBar.list.map((entry) => entry.text),
    ['首页', '体验中心', '模型与定价', '消息', '我的'],
  );
  assert.deepEqual(
    mini.tabBar.list.map((entry) => entry.pagePath),
    [
      'pages/dashboard/index',
      'pages/playground/index',
      'pages/catalog/index',
      'pages/messages/index',
      'pages/profile/index',
    ],
  );
  assert.ok(mini.pages.includes('pages/usage/index'));
  assert.ok(mini.pages.includes('pages/api-keys/index'));
});

test('all three roots share the light tech-blue palette', () => {
  const h5Css = read('apps/sdkwork-cloudrouter-h5/src/index.css');
  assert.ok(h5Css.includes('--cr-brand'));
  assert.ok(h5Css.includes('#2563eb'));

  const flutterTokens = read(
    'apps/sdkwork-cloudrouter-flutter-mobile/packages/sdkwork_cloudrouter_flutter_mobile_commons/lib/src/theme/design_tokens.dart',
  );
  assert.ok(flutterTokens.includes('colorPrimary = 0xFF2563EB'));
  assert.ok(flutterTokens.includes('colorBackground = 0xFFF5F7FB'));

  const mini = readJson('apps/sdkwork-cloudrouter-mini-program/src/app.json');
  assert.equal(mini.tabBar.selectedColor, '#2563eb');
  assert.equal(mini.tabBar.backgroundColor, '#ffffff');
});

test('shared settings expose the voice section on every mobile root', () => {
  const settingsCore = read(
    '../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/defaults.ts',
  );
  assert.ok(settingsCore.includes('id: "voice.speaker"'));

  const h5Settings = read(
    'apps/sdkwork-cloudrouter-h5/packages/sdkwork-cloudrouter-h5-settings/src/SettingsScreen.tsx',
  );
  assert.ok(h5Settings.includes('voice'), 'H5 exposes voice');

  const flutterCatalog = read(
    'apps/sdkwork-cloudrouter-flutter-mobile/packages/sdkwork_cloudrouter_flutter_mobile_console_profile/lib/src/settings/localized_settings_catalog.dart',
  );
  assert.ok(flutterCatalog.includes('语音播报'));
  assert.ok(flutterCatalog.includes('语速'));

  const miniSettingsWxml = read(
    'apps/sdkwork-cloudrouter-mini-program/src/pages/settings/index.wxml',
  );
  assert.ok(miniSettingsWxml.includes("item.kind === 'slider'"));
});

test('H5 bridge pages use the materialized web ingress, not the API gateway', () => {
  const bridge = read(
    'apps/sdkwork-cloudrouter-mini-program/src/pages/h5/index.js',
  );
  assert.ok(bridge.includes('webPublicHttpUrl'), 'bridge uses the web ingress');
  for (const page of ['messages', 'playground']) {
    const source = read(
      `apps/sdkwork-cloudrouter-mini-program/src/pages/${page}/index.js`,
    );
    assert.ok(source.includes(`/pages/h5/index?route=${page}`));
  }
  const flutterClients = read(
    'apps/sdkwork-cloudrouter-flutter-mobile/lib/bootstrap/sdk_clients.dart',
  );
  assert.ok(flutterClients.includes('SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL'));
  assert.ok(flutterClients.includes('resolveCloudRouterWebPublicHttpUrl'));

  const flutterEnv = readJson(
    'apps/sdkwork-cloudrouter-flutter-mobile/env/sdkwork.standalone.development.json',
  );
  assert.ok(flutterEnv.SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL);
  const miniEnv = readJson(
    'apps/sdkwork-cloudrouter-mini-program/config/mini-program/runtime-env.standalone.development.json',
  );
  assert.ok(miniEnv.SDKWORK_CLOUDROUTER_ROUTER_WEB_PUBLIC_HTTP_URL);
});
