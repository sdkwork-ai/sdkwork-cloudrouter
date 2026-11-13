// Mobile title-only navbar and the shared settings center.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('H5 mobile navbar', () => {
  it('renders only the centered page title', () => {
    const layout = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx',
    );
    assert.ok(layout.includes('pageTitle'));
    assert.ok(layout.includes('justify-center'), 'the title is centered');
    for (const forbidden of [
      'brandLogoUrl',
      'brandSubtitle',
      'themeToggleLabel',
      'onToggleTheme',
      'onSignIn',
      'onSignOut',
    ]) {
      assert.ok(!layout.includes(forbidden), `the navbar does not render ${forbidden}`);
    }
  });
});

describe('H5 settings page', () => {
  it('adds a settings entry to 我的 and mounts a stacked settings route', () => {
    const profile = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/profile/ConsoleProfileScreen.tsx',
    );
    assert.ok(profile.includes("onNavigate('settings')"));
    assert.ok(profile.includes('labels.settings'));
    assert.ok(profile.includes('Settings'));
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('SettingsRoute'));
    assert.ok(routes.includes("case 'settings':"));
    assert.ok(routes.includes("navigate('/settings')"));
    const app = read('src/App.tsx');
    const settingsRoute = app.indexOf('path="/settings"');
    assert.ok(settingsRoute > 0);
    assert.ok(settingsRoute < app.indexOf('path="*"'), 'settings renders outside the tab shell');
  });

  it('integrates the shared settings-mobile component and settings-core runtime', () => {
    const settings = read(
      'packages/sdkwork-cloudrouter-h5-settings/src/SettingsScreen.tsx',
    );
    assert.ok(settings.includes('@sdkwork/settings-mobile-react'));
    assert.ok(settings.includes('SdkworkMobileSettingsProvider'));
    assert.ok(settings.includes('SdkworkSettingsMobile'));
    assert.ok(settings.includes('@sdkwork/settings-core'));
    assert.ok(settings.includes('createDefaultSdkworkSettingsCatalog'));
    assert.ok(settings.includes('createSdkworkSettingsRuntime'));
    assert.ok(settings.includes('createSdkworkBrowserSettingsStore'));
    assert.ok(settings.includes('appearance.theme'));
    assert.ok(settings.includes('"voice"'), 'the shared voice section is exposed');
    assert.ok(settings.includes('onThemeChange'));
    assert.ok(settings.includes('onBack'));
    const appbaseDefaults = read(
      '../../../sdkwork-appbase/packages/common/system/sdkwork-settings-core/src/defaults.ts',
    );
    assert.ok(appbaseDefaults.includes('id: "voice.speaker"'), 'voice settings live in appbase');
    assert.ok(appbaseDefaults.includes('id: "voice.rate"'));
    const flutterCatalog = read(
      '../../../sdkwork-appbase/packages/mobile-flutter/system/sdkwork_settings_flutter/lib/src/settings/settings_catalog.dart',
    );
    assert.ok(flutterCatalog.includes("id: 'voice.speaker'"), 'Flutter inherits the voice section');
    const css = read('src/index.css');
    assert.match(css, /\.sdk-mobile-settings\s*\{[^}]*--sdk-color-surface-canvas/u);
  });

  it('registers the shared settings packages in the workspace', () => {
    const workspace = read('../../pnpm-workspace.yaml');
    assert.ok(workspace.includes('sdkwork-settings-core'));
    assert.ok(workspace.includes('sdkwork-settings-mobile-react'));
    const manifest = JSON.parse(read('package.json'));
    assert.equal(manifest.dependencies['@sdkwork/cloudrouter-h5-settings'], 'workspace:*');
    const settingsManifest = JSON.parse(
      read('packages/sdkwork-cloudrouter-h5-settings/package.json'),
    );
    assert.equal(settingsManifest.dependencies['@sdkwork/settings-core'], 'workspace:*');
    assert.equal(
      settingsManifest.dependencies['@sdkwork/settings-mobile-react'],
      'workspace:*',
    );
  });
});
