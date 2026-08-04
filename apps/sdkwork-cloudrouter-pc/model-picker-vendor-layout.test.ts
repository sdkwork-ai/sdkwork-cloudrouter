import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveModelPickerMenuGridTemplate,
  resolveModelPickerMenuWidth,
  resolveModelPickerVendorColumnWidth,
} from '../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-picker/src/modelPickerVendorLayout.ts';

test('model picker vendor column widens for longer vendor names', () => {
  const short = resolveModelPickerVendorColumnWidth({
    vendorNames: ['OpenAI'],
    variant: 'default',
  });
  const long = resolveModelPickerVendorColumnWidth({
    vendorNames: ['Stability AI', 'Black Forest Labs'],
    variant: 'default',
  });

  assert.ok(long > short);
});

test('model picker vendor column respects sidebar menu width caps', () => {
  const width = resolveModelPickerVendorColumnWidth({
    vendorNames: ['Very Long Provider Name International'],
    variant: 'default',
    menuWidth: 320,
  });

  assert.ok(width <= Math.floor(320 * 0.44));
  assert.ok(width >= 132);
});

test('model picker vendor grid template uses fixed vendor column width', () => {
  assert.equal(resolveModelPickerMenuGridTemplate(168), '168px minmax(0, 1fr)');
});

test('model picker flat menu expands when vendors need more space', () => {
  const width = resolveModelPickerMenuWidth({
    vendorColumnWidth: 180,
    variant: 'flat',
    matchTriggerWidth: false,
  });

  assert.ok(width >= 460);
});

test('model picker flat vendor column allows wider single-line labels', () => {
  const width = resolveModelPickerVendorColumnWidth({
    vendorNames: ['Black Forest Labs', 'Stability AI'],
    variant: 'flat',
  });

  assert.ok(width >= 160);
  assert.ok(width <= 252);
});
