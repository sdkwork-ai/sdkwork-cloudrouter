import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_API_PREFIX,
  BACKEND_API_PREFIX,
  OPEN_API_PREFIX,
  requiresClientContextSelectorSanitization,
  resolveRequiredMessagingAppBaseUrl,
  sanitizeSdkHttpRequestOptions,
} from './sdk-clients.ts';

test('requiresClientContextSelectorSanitization guards app and open surfaces only', () => {
  assert.equal(requiresClientContextSelectorSanitization(`${APP_API_PREFIX}/drive/spaces`), true);
  assert.equal(requiresClientContextSelectorSanitization(`${OPEN_API_PREFIX}/chat/completions`), true);
  assert.equal(requiresClientContextSelectorSanitization(`${BACKEND_API_PREFIX}/ai/agents`), false);
});

test('sanitizeSdkHttpRequestOptions strips selectors for app API requests', () => {
  assert.deepEqual(
    sanitizeSdkHttpRequestOptions(`${APP_API_PREFIX}/generations/images/text-to-image`, {
      method: 'POST',
      params: { tenantId: '100001', page: '1' },
      body: { tenantId: '100001', prompt: 'draw a cat' },
    }),
    {
      method: 'POST',
      params: { page: '1' },
      body: { prompt: 'draw a cat' },
    },
  );
});

test('sanitizeSdkHttpRequestOptions leaves backend admin filters intact', () => {
  assert.deepEqual(
    sanitizeSdkHttpRequestOptions(`${BACKEND_API_PREFIX}/ai/agents`, {
      params: { tenantId: '100001', page: '1' },
    }),
    {
      params: { tenantId: '100001', page: '1' },
    },
  );
});

test('resolveRequiredMessagingAppBaseUrl honors an explicit messaging app base URL', () => {
  assert.equal(
    resolveRequiredMessagingAppBaseUrl({ appBaseUrl: 'https://messaging.example.test' }),
    'https://messaging.example.test',
  );
});

test('resolveRequiredMessagingAppBaseUrl falls back to the common app base when messaging is not configured', () => {
  assert.equal(resolveRequiredMessagingAppBaseUrl({}), APP_API_PREFIX);
});
