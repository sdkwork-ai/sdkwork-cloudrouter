import { describe, expect, it } from 'vitest';
import { toRuntimeRegionUpdateRequest } from './runtimeRegionService';

describe('runtime region update requests', () => {
  it('trims operator input without substituting a different region', () => {
    expect(toRuntimeRegionUpdateRequest({
      currentRegionCode: '  us-west  ',
      currentRegionName: '  US West  ',
      remark: '  Primary routing region  ',
    })).toEqual({
      currentRegionCode: 'us-west',
      currentRegionName: 'US West',
      remark: 'Primary routing region',
    });
  });

  it('keeps empty values empty so validation cannot be bypassed by defaults', () => {
    expect(toRuntimeRegionUpdateRequest({
      currentRegionCode: ' ',
      currentRegionName: ' ',
      remark: ' ',
    })).toEqual({
      currentRegionCode: '',
      currentRegionName: '',
      remark: '',
    });
  });
});
