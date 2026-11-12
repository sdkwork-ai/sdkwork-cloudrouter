import { describe, expect, it } from 'vitest';
import { SUPPLIER_NAME_MAX_LENGTH, uniqueSupplierCopyName } from './supplierCopy';

/**
 * Guards the "复制为新建" prefill naming the supplier drawer depends on.
 *
 * The copy action opens the create form with the source content pre-filled, so
 * the default name must (a) stay recognisable as a copy, (b) never collide with
 * an existing record, and (c) fit the backend `supplierName.maxLength` bound.
 * A silent collision is the failure mode that matters: the operator sees two
 * identical supplier names and edits the wrong record.
 */
describe('supplier copy naming', () => {
  it('suffixes the source name with -copy', () => {
    expect(uniqueSupplierCopyName({ supplierName: 'SDKWork Relay (Global)' }, [])).toBe('SDKWork Relay (Global)-copy');
  });

  it('increments past names already taken in the list', () => {
    const existing = [
      { supplierName: 'SDKWork Relay (Global)' },
      { supplierName: 'SDKWork Relay (Global)-copy' },
      { supplierName: 'SDKWork Relay (Global)-copy-2' },
    ];
    expect(uniqueSupplierCopyName({ supplierName: 'SDKWork Relay (Global)' }, existing)).toBe('SDKWork Relay (Global)-copy-3');
  });

  it('falls back to the supplier code when the name is blank', () => {
    expect(uniqueSupplierCopyName({ supplierName: '   ', supplierCode: 'sdkwork-global' }, [])).toBe('sdkwork-global-copy');
  });

  it('truncates the source name so the suffix still fits the backend limit', () => {
    const longName = 'a'.repeat(SUPPLIER_NAME_MAX_LENGTH);
    const copyName = uniqueSupplierCopyName({ supplierName: longName }, []);
    expect(copyName.endsWith('-copy')).toBe(true);
    expect(copyName.length).toBeLessThanOrEqual(SUPPLIER_NAME_MAX_LENGTH);
  });
});
