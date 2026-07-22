import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const playgroundSource = readFileSync(
  new URL('./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx', import.meta.url),
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
