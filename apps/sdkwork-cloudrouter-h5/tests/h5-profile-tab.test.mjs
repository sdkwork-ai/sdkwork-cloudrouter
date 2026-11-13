// The rightmost "My" tab and its account page.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('H5 profile tab', () => {
  it('appends the profile tab as the rightmost shell tab', () => {
    const navigation = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/navigation/consoleNavigation.ts',
    );
    assert.ok(navigation.includes("key: 'profile'"));
    assert.ok(navigation.includes("path: '/me'"));
    assert.ok(navigation.includes('profileTab'));
    // The profile entry is appended after the shared console tabs.
    assert.ok(
      navigation.indexOf('CONSOLE_TAB_ENTRIES') < navigation.indexOf("key: 'profile'"),
      'the profile tab comes after the shared console tabs',
    );
    const layout = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx',
    );
    assert.ok(layout.includes('grid-cols-5'), 'the tab bar has five columns');
    assert.ok(layout.includes('profile: UserRound'), 'the profile tab has an account glyph');
  });

  it('renders the cloud-console account page sections', () => {
    const screen = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/profile/ConsoleProfileScreen.tsx',
    );
    for (const token of [
      'labels.balance',
      'labels.recharge',
      'labels.autoRecharge',
      'labels.coupons',
      'labels.invoices',
      'labels.operationRecords',
      'labels.helpCenter',
      'labels.settings',
      'labels.other',
      'labels.privacy',
      'labels.signIn',
      'labels.signOut',
      'labels.verified',
    ]) {
      assert.ok(screen.includes(token), `profile screen renders ${token}`);
    }
    assert.ok(screen.includes('otherOpen'), 'the Other sheet is available');
    assert.ok(screen.includes("onNavigate('settings')"), 'the settings row opens the settings page');
  });

  it('mounts the profile root and wires its account destinations', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('path="/me"'), 'the profile root is mounted');
    assert.ok(routes.includes('ConsoleProfileScreen'));
    assert.ok(routes.includes('handleProfileNavigate'));
    for (const destination of [
      "case 'signIn':",
      "case 'signOut':",
      "case 'recharge':",
      "case 'membership':",
      "case 'coupons':",
      "case 'orders':",
      "case 'help':",
      "case 'settings':",
      "case 'privacy':",
    ]) {
      assert.ok(routes.includes(destination), `profile destination ${destination} is wired`);
    }
    assert.ok(routes.includes('CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path'));
  });
});
