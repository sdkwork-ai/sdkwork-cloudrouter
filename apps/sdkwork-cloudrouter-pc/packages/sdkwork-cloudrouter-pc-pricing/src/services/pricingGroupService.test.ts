import { describe, expect, it } from 'vitest';
import { normalizePricingGroups } from './pricingGroupService';

describe('normalizePricingGroups', () => {
  it('keeps enabled groups with tags, modalities and multipliers', () => {
    const groups = normalizePricingGroups([
      {
        groupCode: 'openai.text',
        groupName: 'OpenAI 文本',
        status: 'enabled',
        tags: ['stable', 'hot'],
        modalities: ['text'],
        vendorCode: 'OpenAI',
        saleMultiplier: '1.50',
      },
    ]);
    expect(groups).toEqual([
      {
        code: 'openai.text',
        name: 'OpenAI 文本',
        tags: ['stable', 'hot'],
        saleMultiplier: '1.50',
        vendorCode: 'openai',
        modalities: ['text'],
      },
    ]);
  });

  it('drops disabled, code-less and duplicate groups and trims dirty values', () => {
    const groups = normalizePricingGroups([
      { groupCode: 'a', groupName: 'A', status: 'disabled' },
      { groupCode: '  ', groupName: 'No code', status: 'enabled' },
      { groupCode: 'b', status: 'enabled', tags: [' stable ', '', 'stable'], modalities: [' Text '], vendorCode: null, saleMultiplier: '   ' },
      { groupCode: 'b', groupName: 'Duplicate B', status: 'enabled' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      code: 'b',
      name: 'b',
      tags: ['stable'],
      vendorCode: '',
      modalities: ['text'],
    });
    expect(groups[0].saleMultiplier).toBeUndefined();
  });

  it('sorts by display name and then code so the filter list is stable', () => {
    const groups = normalizePricingGroups([
      { groupCode: 'z.text', groupName: 'Zeta', status: 'enabled' },
      { groupCode: 'a.text', groupName: 'Alpha', status: 'enabled' },
      { groupCode: 'a2.text', groupName: 'Alpha', status: 'enabled' },
    ]);
    expect(groups.map((group) => group.code)).toEqual(['a.text', 'a2.text', 'z.text']);
  });

  it('tolerates an empty or malformed payload', () => {
    expect(normalizePricingGroups([])).toEqual([]);
    expect(normalizePricingGroups([{}])).toEqual([]);
  });
});
