// Public home tab and PC-aligned theme contract for the H5 renderer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('H5 public home tab', () => {
  it('renders the public home composition for an anonymous overview visit', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('ConsoleHomeScreen'), 'the dashboard route mounts the public home');
    assert.ok(routes.includes('ConsoleDashboardScreen'), 'the dashboard route keeps the signed-in overview');
    assert.ok(routes.includes('authenticated ?'), 'the overview route branches on the session state');
    // The public home must not be wrapped in a session gate.
    const dashboardRoute = routes.slice(
      routes.indexOf('path={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path}'),
      routes.indexOf('path={CLOUDROUTER_CONSOLE_ROUTES.usage.path}'),
    );
    assert.ok(dashboardRoute.includes('ConsoleHomeScreen'));
    assert.ok(!dashboardRoute.includes('SessionRequiredState'), 'the home tab stays public');
  });

  it('keeps protected tabs gated in-canvas while the shell stays mounted', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('SessionRequiredState'), 'protected tabs use the in-canvas session state');
    assert.ok(routes.includes('<ConsoleShellLayout'), 'the shell wraps every tab root');
    assert.ok(
      routes.indexOf('<ConsoleShellLayout') < routes.indexOf('<Routes>'),
      'the shell renders around the tab routes, not inside a full-screen gate',
    );
  });

  it('mounts sign-in outside the tab shell as a dedicated screen', () => {
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/sign-in"'), 'the sign-in route is declared');
    assert.ok(app.includes('ConsoleSignInRoute'), 'the sign-in route mounts the dedicated page');
    const signInIndex = app.indexOf('path="/sign-in"');
    const catchAllIndex = app.indexOf('path="*"');
    assert.ok(signInIndex > 0 && signInIndex < catchAllIndex, 'sign-in is declared before the catch-all');
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(!routes.includes('path="/sign-in"'), 'the sign-in route never renders inside the tab shell');
  });

  it('ships the public home package export', () => {
    const dashboardIndex = read('packages/sdkwork-cloudrouter-h5-console-dashboard/src/index.ts');
    assert.ok(dashboardIndex.includes('ConsoleHomeScreen'), 'the dashboard package exports the public home');
    assert.ok(
      fs.existsSync(
        path.join(ROOT, 'packages/sdkwork-cloudrouter-h5-console-dashboard/src/ConsoleHomeScreen.tsx'),
      ),
    );
  });

  it('puts membership purchase and points recharge on the home', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes("case 'membership':"));
    assert.ok(routes.includes("navigate('/membership')"));
    assert.ok(routes.includes("case 'recharge':"));
    assert.ok(routes.includes("navigate('/recharge')"));
    assert.ok(routes.includes("case 'coupons':"));
    assert.ok(routes.includes("state: { tab: 'coupon' }"));
    const home = read(
      'packages/sdkwork-cloudrouter-h5-console-dashboard/src/ConsoleHomeScreen.tsx',
    );
    assert.ok(home.includes('ConsoleHomeDestination'), 'the home exposes typed destinations');
    assert.ok(home.includes('onNavigate'), 'the home is wired to the destination handler');
    assert.ok(home.includes("id: 'membership'"), 'membership is a primary home action');
    assert.ok(home.includes("id: 'recharge'"), 'recharge is a primary home action');
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/membership"'), 'the membership route is mounted');
    assert.ok(app.includes('path="/recharge"'), 'the recharge route is mounted');
    assert.ok(
      app.indexOf('path="/membership"') < app.indexOf('path="*"'),
      'membership renders outside the console catch-all',
    );
    assert.ok(
      app.indexOf('path="/recharge"') < app.indexOf('path="*"'),
      'recharge renders outside the console catch-all',
    );
  });

  it('renders a cloud-console home with search, service grid, and banners', () => {
    const home = read(
      'packages/sdkwork-cloudrouter-h5-console-dashboard/src/ConsoleHomeScreen.tsx',
    );
    assert.ok(home.includes('placeholder={labels.searchPlaceholder}'), 'the home has a product search');
    assert.ok(home.includes('grid-cols-5'), 'the service grid follows the cloud-console layout');
    assert.ok(home.includes("id: 'orders'"), 'the service grid includes orders');
    assert.ok(home.includes("id: 'help'"), 'the service grid includes help');
    assert.ok(home.includes('labels.announcement'), 'the announcement strip is rendered');
    assert.ok(home.includes('labels.promoTitle'), 'the promotion banner is rendered');
    assert.ok(home.includes('labels.experienceTitle'), 'the product experience center is rendered');
    assert.ok(home.includes('moreOpen'), 'the More sheet is available');
  });

  it('keeps operator branding for content surfaces without a brand navbar', () => {
    const branding = read('packages/sdkwork-cloudrouter-h5-core/src/branding/siteBranding.ts');
    assert.match(branding, /system\.site\.runtime\.retrieve/u, 'the shared site runtime is the brand authority');
    assert.match(branding, /shortName/u);
    assert.match(branding, /siteName/u);
    assert.match(branding, /logo/u);
    const layout = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx',
    );
    assert.ok(layout.includes('pageTitle'), 'the navbar renders only the current page title');
    assert.ok(!layout.includes('brandLogoUrl'), 'the navbar no longer renders the brand logo');
    assert.ok(!layout.includes('brandSubtitle'), 'the navbar no longer renders the brand subtitle');
    assert.ok(!layout.includes('themeToggleLabel'), 'the navbar no longer renders a theme switch');
    assert.ok(!layout.includes('onSignIn'), 'the navbar no longer renders a sign-in action');
    assert.ok(!layout.includes('onSignOut'), 'the navbar no longer renders a sign-out action');
    const providers = read('src/providers/AppProviders.tsx');
    assert.ok(providers.includes('useH5SiteBranding'), 'the runtime consumes the shared branding hook');
    assert.ok(providers.includes('brandName'), 'the runtime exposes the configured brand name');
  });
});

describe('H5 theme alignment with the PC portal', () => {
  it('declares the shared semantic color tokens for light and dark', () => {
    const css = read('src/index.css');
    for (const token of [
      '--cr-canvas',
      '--cr-surface',
      '--cr-surface-elevated',
      '--cr-line',
      '--cr-ink',
      '--cr-ink-muted',
      '--cr-brand',
      '--color-canvas',
      '--color-brand',
    ]) {
      assert.ok(css.includes(token), `index.css declares ${token}`);
    }
    assert.match(css, /:root\s*\{[^}]*--cr-brand:\s*#2563eb/u, 'the light accent is CloudRouter blue');
    assert.match(css, /:root\.dark\s*\{[^}]*--cr-canvas:\s*#121212/u, 'dark mode follows the PC canvas');
    assert.match(css, /@media \(prefers-color-scheme: dark\)/u, 'the system default is honored before hydration');
  });

  it('shares the PC theme preference key and applies the class before render', () => {
    const theme = read('src/themePreference.ts');
    assert.ok(theme.includes("CLOUD_ROUTER_THEME_STORAGE_KEY = 'cloud-router-theme'"));
    assert.match(theme, /classList\.toggle\('dark'/u);
    assert.match(theme, /classList\.toggle\('light'/u);
    const main = read('src/main.tsx');
    assert.ok(main.includes('initializeThemePreferences()'));
    assert.ok(
      main.indexOf('initializeThemePreferences()') < main.indexOf('createRoot('),
      'the persisted theme applies before the first render',
    );
  });

  it('moves the theme control into the shared settings page', () => {
    const layout = read('packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx');
    assert.ok(!layout.includes('themeToggleLabel'), 'the shell no longer owns a theme switch');
    assert.ok(!layout.includes('onToggleTheme'), 'the shell no longer owns the theme action');
    assert.ok(!layout.includes('onSignIn'), 'the header no longer exposes sign-in');
    const settings = read(
      'packages/sdkwork-cloudrouter-h5-settings/src/SettingsScreen.tsx',
    );
    assert.ok(settings.includes('SdkworkSettingsMobile'), 'the shared settings component renders the page');
    assert.ok(settings.includes('appearance.theme'), 'the appearance catalog owns the theme setting');
    assert.ok(settings.includes('onThemeChange'), 'the host theme system receives the selection');
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('SettingsRoute'), 'the settings route is wired');
    assert.ok(routes.includes('onThemeChange={runtime.setTheme}'), 'the runtime theme setter is injected');
    assert.ok(!routes.includes('toggleTheme'), 'the shell no longer receives a theme toggle');
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/settings"'), 'settings is a stacked route outside the tab shell');
  });
});
