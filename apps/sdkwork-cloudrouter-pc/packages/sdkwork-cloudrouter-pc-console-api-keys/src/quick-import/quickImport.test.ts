// quickImport deep link 构建契约：Birdcoder 链接携带 modelsBaseUrl（网关
// OpenAI 兼容 base，供 Birdcoder 导入时查询 /v1/vendors），cc-switch 链接
// 不携带；无 vendor 参数（厂商由网关按 key 自动解析）。
// 运行：pnpm --dir packages/sdkwork-cloudrouter-pc-console-api-keys exec vitest run src/quick-import/quickImport.test.ts --environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { ApiKey } from '../apiKeyService';
import { buildQuickImportDeepLink } from './quickImport';

vi.mock('../usage-details/toolProfiles', () => ({
  resolveCurrentGatewayEndpoints: () => ({
    anthropicBaseUrl: '/anthropic/v1',
    openAiBaseUrl: '/v1',
  }),
}));

function sampleKey(): ApiKey {
  return {
    id: 'k1',
    name: 'Test Key',
    displayName: 'Test Key',
    maskedKey: 'sk-****',
    rawKey: 'sk-raw-test-123',
    accountGroup: 'g1',
    accountGroupName: 'Group One',
    accountGroups: ['g1'],
    groupBindings: [{ accountGroup: 'g1', routingStrategy: 'price_first', weight: 100, priority: 100 }],
    rate: null,
    quota: '100',
    usedQuota: '0',
    modalities: ['text'],
    ipLimit: 'unrestricted',
    created: '2026-01-01T00:00:00Z',
    expires: 'never',
    status: 'enabled',
    defaultForRuntime: false,
  };
}

describe('buildQuickImportDeepLink modelsBaseUrl parameter', () => {
  it('carries modelsBaseUrl (gateway OpenAI-compatible base) on Birdcoder links', () => {
    const link = buildQuickImportDeepLink(sampleKey(), 'birdcoder');
    expect(link).toBeTruthy();
    const params = new URLSearchParams((link as string).split('?')[1]);
    expect(params.get('modelsBaseUrl')).toBe('http://localhost:3000/v1');
    // Vendor selection is resolved by Birdcoder at import time via the
    // gateway `/v1/vendors` endpoint; the link carries no vendor parameters.
    expect(params.getAll('vendor')).toEqual([]);
  });

  it('never carries modelsBaseUrl on cc-switch links', () => {
    const link = buildQuickImportDeepLink(sampleKey(), 'cc-switch', 'claude');
    const params = new URLSearchParams((link as string).split('?')[1]);
    expect(params.has('modelsBaseUrl')).toBe(false);
    // The cc-switch usage-query configuration stays intact.
    expect(params.get('usageEnabled')).toBe('true');
    expect(params.get('usageBaseUrl')).toBe('http://localhost:3000/v1');
    expect(params.get('resource')).toBe('provider');
    expect(params.get('app')).toBe('claude');
  });

  it('keeps the base import contract on Birdcoder links', () => {
    const link = buildQuickImportDeepLink(sampleKey(), 'birdcoder', 'claude', {
      name: 'Relay',
      model: 'gpt-5.4',
    });
    const params = new URLSearchParams((link as string).split('?')[1]);
    expect(params.get('resource')).toBe('provider');
    expect(params.get('app')).toBe('claude');
    expect(params.get('name')).toBe('Relay');
    expect(params.get('model')).toBe('gpt-5.4');
    expect(params.get('apiKey')).toBe('sk-raw-test-123');
    expect(params.get('endpoint')).toBe('http://localhost:3000/anthropic/v1');
    expect(params.get('modelsBaseUrl')).toBe('http://localhost:3000/v1');
  });

  it('returns null for keys without plaintext values', () => {
    const key = { ...sampleKey(), rawKey: null };
    expect(buildQuickImportDeepLink(key, 'birdcoder')).toBeNull();
  });
});
