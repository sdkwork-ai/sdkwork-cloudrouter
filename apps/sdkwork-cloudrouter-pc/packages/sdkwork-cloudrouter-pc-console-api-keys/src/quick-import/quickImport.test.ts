// quickImport deep link 构建契约：Birdcoder 链接携带 modelsBaseUrl（网关
// OpenAI 兼容 base，供 Birdcoder 导入时查询 /v1/vendors），cc-switch 链接
// 不携带；无 vendor 参数（厂商由网关按 key 自动解析）。
// 运行：pnpm --dir packages/sdkwork-cloudrouter-pc-console-api-keys exec vitest run src/quick-import/quickImport.test.ts --environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { ApiKey } from '../apiKeyService';
import {
  buildQuickImportDeepLink,
  buildQuickImportResult,
  downloadQuickImportContent,
  fetchGatewayModelList,
} from './quickImport.ts';

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

describe('buildQuickImportResult for DeepSeek Harness', () => {
  it('requires a model and writes it to the route and fresh-session default', () => {
    expect(buildQuickImportResult(sampleKey(), 'deepseek-harness')).toBeNull();
    expect(buildQuickImportResult(sampleKey(), 'deepseek-harness', { model: '  ' })).toBeNull();
    const result = buildQuickImportResult(sampleKey(), 'deepseek-harness', { model: 'deepseek/deepseek-flash' });
    expect(result).not.toBeNull();
    // settings.yaml declares an OpenAI-compatible route and a default model.
    expect(result?.content).toContain('llm-pi-ai:');
    expect(result?.content).toContain('cloudrouter:');
    expect(result?.content).toContain('apiKeyEnv: CLOUDROUTER_API_KEY');
    expect(result?.content).toContain('api: openai-completions');
    expect(result?.content).toContain('baseURL: http://localhost:3000/v1');
    expect(result?.content).toContain('models:\n        - id: "deepseek/deepseek-flash"');
    expect(result?.content).toContain('agent-default-model:\n  provider: cloudrouter\n  model: "deepseek/deepseek-flash"');
    // credentials.yaml half: the raw gateway key on the referenced env name.
    expect(result?.content).toContain('CLOUDROUTER_API_KEY: "sk-raw-test-123"');
  });

  it('double-quotes model IDs and gateway keys containing YAML-special characters', () => {
    const key = { ...sampleKey(), rawKey: 'sk-a"b\\c:d' };
    const result = buildQuickImportResult(key, 'deepseek-harness', { model: 'model:"latest\\stable' });
    expect(result?.content).toContain('id: "model:\\"latest\\\\stable"');
    expect(result?.content).toContain('model: "model:\\"latest\\\\stable"');
    expect(result?.content).toContain('CLOUDROUTER_API_KEY: "sk-a\\"b\\\\c:d"');
  });

  it('returns null for keys without plaintext values', () => {
    const key = { ...sampleKey(), rawKey: null };
    expect(buildQuickImportResult(key, 'deepseek-harness')).toBeNull();
  });
});

describe('fetchGatewayModelList', () => {
  it('bounds the model probe request so import can fall back to manual model entry', async () => {
    let signal: AbortSignal | null = null;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      signal = init?.signal ?? null;
      return new Response(JSON.stringify({ data: [{ id: 'deepseek/deepseek-flash' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(fetchGatewayModelList('sk-test')).resolves.toEqual(['deepseek/deepseek-flash']);
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/v1/models',
        expect.objectContaining({ signal }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('downloadQuickImportContent', () => {
  it('downloads DeepSeek Harness settings as YAML', () => {
    const createObjectUrl = vi.fn((_blob: Blob) => 'blob:quick-import');
    const revokeObjectUrl = vi.fn();
    const NativeUrl = URL;
    const UrlWithBlobMethods = Object.assign(class extends NativeUrl {}, {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    });
    vi.stubGlobal('URL', UrlWithBlobMethods);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    try {
      const result = buildQuickImportResult(sampleKey(), 'deepseek-harness', { model: 'deepseek/deepseek-flash' });
      expect(result).not.toBeNull();
      if (!result) {
        throw new Error('DeepSeek Harness config is required for the download test');
      }
      downloadQuickImportContent(result);

      expect(createObjectUrl).toHaveBeenCalledOnce();
      expect(createObjectUrl.mock.calls[0]?.[0]).toMatchObject({ type: 'text/yaml' });
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:quick-import');
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
