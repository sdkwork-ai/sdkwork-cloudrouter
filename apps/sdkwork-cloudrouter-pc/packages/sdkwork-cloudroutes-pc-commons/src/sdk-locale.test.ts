import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachSdkworkSdkLocaleBoundary,
  resolveSdkworkSdkLocale,
  SDKWORK_SDK_LOCALE_BOUNDARY,
} from './sdk-locale.ts';

interface FakeRequestOptions {
  headers?: Record<string, string>;
  [key: string]: unknown;
}

interface FakeHttp {
  request<T>(path: string, options?: FakeRequestOptions): Promise<T>;
  [SDKWORK_SDK_LOCALE_BOUNDARY]?: boolean;
}

function createFakeHttp(record: { headers?: Record<string, string> } = {}): FakeHttp {
  return {
    async request(_path, options = {}) {
      record.headers = options.headers;
      return undefined as never;
    },
  };
}

test('locale boundary injects Accept-Language and X-SdkWork-Locale', async () => {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: () => 'zh-CN',
  } as unknown as Storage;
  const record: { headers?: Record<string, string> } = {};
  const client = { http: createFakeHttp(record) };
  attachSdkworkSdkLocaleBoundary(client);
  await client.http!.request('/app/v3/api/ai/models');
  assert.equal(record.headers?.['Accept-Language'], 'zh-CN');
  assert.equal(record.headers?.['X-SdkWork-Locale'], 'zh-CN');
  delete (globalThis as Record<string, unknown>).localStorage;
});

test('locale boundary preserves caller headers with caller precedence', async () => {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: () => 'en-US',
  } as unknown as Storage;
  const record: { headers?: Record<string, string> } = {};
  const client = { http: createFakeHttp(record) };
  attachSdkworkSdkLocaleBoundary(client);
  await client.http!.request('/app/v3/api/ai/models', {
    headers: { 'X-Tenant-Id': '100001', 'Accept-Language': 'de-DE' },
  });
  assert.equal(record.headers?.['X-Tenant-Id'], '100001');
  // Caller-provided Accept-Language wins over the runtime locale.
  assert.equal(record.headers?.['Accept-Language'], 'de-DE');
  assert.equal(record.headers?.['X-SdkWork-Locale'], 'en-US');
  delete (globalThis as Record<string, unknown>).localStorage;
});

test('locale boundary is idempotent per client', async () => {
  const record: { headers?: Record<string, string> } = {};
  const client = { http: createFakeHttp(record) };
  const http = client.http;
  attachSdkworkSdkLocaleBoundary(client);
  const wrapped = client.http;
  attachSdkworkSdkLocaleBoundary(client);
  assert.equal(client.http, wrapped);
  assert.equal(client.http, http);
});

test('resolveSdkworkSdkLocale prefers explicit user locale', () => {
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: () => 'ja-JP',
  } as unknown as Storage;
  (globalThis as Record<string, unknown>).document = {
    documentElement: { lang: 'zh-CN' },
  } as Document;
  assert.equal(resolveSdkworkSdkLocale(), 'ja-JP');
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).document;
});

test('resolveSdkworkSdkLocale falls back to document language', () => {
  (globalThis as Record<string, unknown>).document = {
    documentElement: { lang: 'zh-CN' },
  } as Document;
  assert.equal(resolveSdkworkSdkLocale(), 'zh-CN');
  delete (globalThis as Record<string, unknown>).document;
});
