import assert from 'node:assert/strict';
import test from 'node:test';
import { listModelPickerItems, modelMatchesPickerQuery } from '../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-picker/src/modelPickerSearch.ts';
import type { ModelsPickerGroup } from '../../../sdkwork-models/apps/sdkwork-models-pc/packages/sdkwork-models-pc-picker/src/model-picker-types.ts';

const sampleGroups = [
  {
    id: 'openai',
    vendor: { code: 'openai', name: 'OpenAI' },
    llms: [
      {
        id: 'gpt-4o',
        catalogKey: 'gpt-4o',
        model: 'gpt-4o',
        name: 'GPT-4o',
        displayName: 'GPT-4o',
        desc: 'General multimodal model',
        ver: '4o',
        versionLabel: '4o',
        vendorCode: 'openai',
        vendorName: 'OpenAI',
        modalities: ['llms'],
        inputModalities: ['text'],
        outputModalities: ['text'],
        capabilities: [],
        officialReferencePrices: [],
        priceAvailability: { status: 'unavailable' },
        providerCodes: [],
        supportsStreaming: true,
        supportsTools: true,
        supportsJsonSchema: false,
      },
    ],
    images: [],
    videos: [],
    audios: [],
    music: [],
    sfx: [],
  },
  {
    id: 'anthropic',
    vendor: { code: 'anthropic', name: 'Anthropic' },
    llms: [
      {
        id: 'claude-sonnet',
        catalogKey: 'claude-sonnet',
        model: 'claude-sonnet',
        name: 'Claude Sonnet',
        displayName: 'Claude Sonnet',
        desc: 'Balanced reasoning model',
        ver: '4',
        versionLabel: '4',
        vendorCode: 'anthropic',
        vendorName: 'Anthropic',
        modalities: ['llms'],
        inputModalities: ['text'],
        outputModalities: ['text'],
        capabilities: [],
        officialReferencePrices: [],
        priceAvailability: { status: 'unavailable' },
        providerCodes: [],
        supportsStreaming: true,
        supportsTools: true,
        supportsJsonSchema: false,
      },
    ],
    images: [],
    videos: [],
    audios: [],
    music: [],
    sfx: [],
  },
] satisfies ModelsPickerGroup[];

test('model picker search matches model and vendor names', () => {
  assert.equal(modelMatchesPickerQuery(sampleGroups[1].llms[0], 'anthropic'), true);
  assert.equal(modelMatchesPickerQuery(sampleGroups[0].llms[0], 'sonnet'), false);
});

test('model picker list filters by active vendor when search is empty', () => {
  const items = listModelPickerItems(sampleGroups, 'llms', 'openai', '');
  assert.equal(items.length, 1);
  assert.equal(items[0]?.model.id, 'gpt-4o');
});

test('model picker list searches across vendors when query is present', () => {
  const items = listModelPickerItems(sampleGroups, 'llms', 'openai', 'claude');
  assert.equal(items.length, 1);
  assert.equal(items[0]?.model.id, 'claude-sonnet');
});
