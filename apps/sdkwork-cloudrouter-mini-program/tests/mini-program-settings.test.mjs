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

test('registers the profile and settings pages with the host profile tab', () => {
  const appJson = readJson('src/app.json');
  assert.ok(appJson.pages.includes('pages/profile/index'));
  assert.ok(appJson.pages.includes('pages/settings/index'));
  const profileTab = appJson.tabBar.list.find(
    (entry) => entry.pagePath === 'pages/profile/index',
  );
  assert.ok(profileTab, '我的 is a tab');
  assert.equal(profileTab.text, '我的');
  const profile = read('src/pages/profile/index.js');
  assert.ok(profile.includes('/pages/h5/index?route=signIn'));
  assert.ok(read('src/pages/h5/index.js').includes('signIn'));
});

test('bootstraps the shared settings binding with the voice section', () => {
  const runtime = read('src/bootstrap/runtime.ts');
  assert.ok(runtime.includes('createSdkworkMiniProgramSettingsBinding'));
  assert.ok(runtime.includes('settingsBinding'));
  assert.ok(runtime.includes("'voice'"), 'voice is in the filtered catalog');
  assert.ok(runtime.includes('createDefaultSdkworkSettingsCatalog'));
  const app = read('src/app.js');
  assert.ok(app.includes('runtime.settingsBinding'));
  assert.ok(app.includes('runtime.settingsRuntime'));
});

test('settings page renders voice sliders and forwards intents to the binding', () => {
  const wxml = read('src/pages/settings/index.wxml');
  assert.ok(wxml.includes("item.kind === 'slider'"));
  assert.ok(wxml.includes('bindchange="onChoice"'));
  const page = read('src/pages/settings/index.js');
  assert.ok(page.includes('settingsBinding'));
  assert.ok(page.includes('binding.attach'));
  assert.ok(page.includes('onToggle'));
  assert.ok(page.includes('onSave'));
});
