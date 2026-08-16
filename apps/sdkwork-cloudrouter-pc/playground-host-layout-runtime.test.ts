import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const playgroundSource = readFileSync(
  new URL('./packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx', import.meta.url),
  'utf8',
);

test('configures Agents overlays below the Playground host header', () => {
  assert.match(
    playgroundSource,
    /DEFAULT_PLAYGROUND_OVERLAY_TOP_INSET = 'var\(--sdkwork-portal-navbar-height, 4rem\)'/,
  );
  assert.match(playgroundSource, /overlayTopInset\?: string/);
  assert.match(playgroundSource, /overlayTopInset=\{overlayTopInset\}/);
});

test('hides the creative (生成) tab until the generations backend exists', () => {
  // The tab calls the generations app API (`/app/v3/api/generations*`), whose
  // backend is not implemented in any workspace repo; the host hides it
  // instead of surfacing 404s.
  assert.match(playgroundSource, /hiddenTabs=\{\[['"]creative['"]\]\}/);
});
