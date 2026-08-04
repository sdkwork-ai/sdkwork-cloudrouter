import assert from 'node:assert/strict';
import test from 'node:test';
import { measureModelPickerMenuContent, resolveModelPickerMenuLayout } from '../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-picker/src/modelPickerMenuLayout.ts';

test('model picker auto placement opens upward when bottom space is tight', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 680, right: 420, bottom: 744, left: 220, width: 200 },
    menuWidth: 392,
    menuHeight: 420,
    preferredPlacement: 'auto',
    viewportWidth: 1280,
    viewportHeight: 800,
    maxPreferredHeight: 420,
  });

  assert.equal(layout.placement, 'top');
  assert.ok(layout.top < 680);
  assert.ok(layout.maxHeight <= 420);
});

test('model picker auto placement opens downward when space allows', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 120, right: 420, bottom: 184, left: 220, width: 200 },
    menuWidth: 512,
    menuHeight: 460,
    preferredPlacement: 'auto',
    viewportWidth: 1280,
    viewportHeight: 900,
    maxPreferredHeight: 460,
  });

  assert.equal(layout.placement, 'bottom');
  assert.equal(layout.top, 192);
});

test('model picker clamps horizontal position inside viewport', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 200, right: 1264, bottom: 264, left: 1104, width: 160 },
    menuWidth: 512,
    menuHeight: 420,
    preferredPlacement: 'bottom',
    viewportWidth: 1280,
    viewportHeight: 900,
    maxPreferredHeight: 420,
  });

  assert.ok(layout.left >= 16);
  assert.ok(layout.left + layout.width <= 1280 - 16);
});

test('model picker menu width matches trigger width for sidebar picker', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 120, right: 500, bottom: 184, left: 32, width: 468 },
    menuWidth: 468,
    menuHeight: 460,
    preferredPlacement: 'bottom',
    viewportWidth: 1280,
    viewportHeight: 900,
    maxPreferredHeight: 460,
  });

  assert.equal(layout.width, 468);
  assert.equal(layout.left, 32);
});

test('model picker flat menu keeps preferred width wider than trigger', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 640, right: 252, bottom: 678, left: 32, width: 220 },
    menuWidth: 392,
    menuHeight: 420,
    preferredPlacement: 'top',
    viewportWidth: 1280,
    viewportHeight: 800,
    maxPreferredHeight: 420,
  });

  assert.equal(layout.width, 392);
});

test('model picker caps menu height when model list is taller than viewport budget', () => {
  const layout = resolveModelPickerMenuLayout({
    triggerRect: { top: 120, right: 500, bottom: 184, left: 32, width: 468 },
    menuWidth: 468,
    menuHeight: 1200,
    preferredPlacement: 'bottom',
    viewportWidth: 1280,
    viewportHeight: 900,
    maxPreferredHeight: 460,
  });

  assert.equal(layout.height, 460);
  assert.equal(layout.maxHeight, 460);
});

test('model picker content measure keeps vendors visible without scroll in normal cases', () => {
  const measure = measureModelPickerMenuContent({
    vendorHeight: 220,
    modelsHeight: 480,
    maxPreferredHeight: 400,
  });

  assert.equal(measure.menuHeight, 400);
  assert.equal(measure.vendorsScrollable, false);
  assert.equal(measure.modelsScrollable, true);
});

test('model picker content measure only enables vendor scroll when vendors exceed menu cap', () => {
  const measure = measureModelPickerMenuContent({
    vendorHeight: 520,
    modelsHeight: 180,
    maxPreferredHeight: 400,
  });

  assert.equal(measure.menuHeight, 400);
  assert.equal(measure.vendorsScrollable, true);
  assert.equal(measure.modelsScrollable, false);
});
