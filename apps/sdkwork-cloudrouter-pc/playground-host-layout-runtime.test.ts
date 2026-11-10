import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const playgroundSource = readFileSync(
  new URL('./packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx', import.meta.url),
  'utf8',
);

const portalStyles = readFileSync(new URL('./src/index.css', import.meta.url), 'utf8');

test('configures Agents overlays below the Playground host header', () => {
  assert.match(
    playgroundSource,
    /DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET = 'var\(--sdkwork-portal-navbar-height, 4rem\)'/,
  );
  assert.match(playgroundSource, /overlayTopInset\?: string/);
  assert.match(playgroundSource, /overlayTopInset=\{overlayTopInset\}/);
});

test('keeps the embedded workbench on the portal color scheme', () => {
  // The workbench ThemeProvider rewrites <html>'s dark/light classes from its
  // own preference (default light). Embedded in the portal it must project the
  // host theme instead, otherwise /playground flips a dark portal to light.
  assert.match(playgroundSource, /WORKBENCH_THEME_STORAGE_KEY = 'sdkwork-agents-theme'/);
  assert.match(playgroundSource, /root\.classList\.contains\('dark'\)/);
  assert.match(playgroundSource, /root\.classList\.toggle\('dark', resolvedTheme === 'dark'\)/);
  assert.match(playgroundSource, /useLayoutEffect\(\(\) => \{\s*syncEmbeddedWorkbenchTheme\(\);/);
});

test('maps the playground onto the sdkwork-birdcoder2 design palette', () => {
  // Light and dark ramps of the design platform, projected onto the workbench
  // `--ag-*` contract instead of the retired navy/studio palette.
  assert.match(portalStyles, /\.sdkwork-playground-host \{\s*--sdkwork-birdcoder-bg-base:/);
  assert.match(portalStyles, /html\.dark \.sdkwork-playground-host \{/);
  assert.match(portalStyles, /--sdkwork-birdcoder-bg-base: #151517/);
  assert.match(portalStyles, /--ag-color-rail: var\(--sdkwork-birdcoder-bg-sidebar\)/);
  assert.match(portalStyles, /--ag-color-primary: var\(--sdkwork-birdcoder-primary-fill\)/);
  // The workbench hard-codes the navy chat sidebar; the bridge must translate it.
  assert.match(portalStyles, /\[class~="bg-\[#0A1B3D\]"\]/);
});

test('themes every playground tab, including the dark-only canvas and agents pages', () => {
  // Canvas ships with no `dark:` variants: light mode must translate the
  // `#0d0d0e` board and its inline white dot grid.
  assert.match(portalStyles, /html:not\(\.dark\) \.sdkwork-playground-host \[class~="bg-\[#0d0d0e\]"\]/);
  assert.match(portalStyles, /html:not\(\.dark\) \.sdkwork-playground-host \.canvas-background/);
  // Dark mode collapses the workbench's one-off greys onto the platform stack.
  assert.match(portalStyles, /html\.dark \.sdkwork-playground-host \[class~="dark:bg-\[#1e1e1e\]"\]/);
  assert.match(portalStyles, /html\.dark \.sdkwork-playground-host \[class~="dark:bg-\[#141414\]"\]/);
  // Agents page: tech-blue radial wash and accent literals are neutralized.
  assert.match(portalStyles, /bg-\[radial-gradient\(circle_at_20%_0%/);
  assert.match(portalStyles, /\[class~="text-\[#4080FF\]"\]/);
});

test('keeps the creative (生成) tab visible so inspiration submit opens the dedicated generation page', () => {
  // creative must NOT be hidden: inspiration submit dispatches switch-tab -> creative, and
  // hiding it makes the workbench fall back to the unified chat agent interface.
  assert.doesNotMatch(playgroundSource, /hiddenTabs=\{\[['"]creative/);
  // The workbench tab registry owns the composition; the host must not
  // reference a tab (such as the retired demo surface) by name.
  assert.doesNotMatch(playgroundSource, /presentation/);
});
