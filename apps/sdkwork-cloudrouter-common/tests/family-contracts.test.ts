import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLOUDROUTER_CONSOLE_CAPABILITIES,
  CLOUDROUTER_CLIENT_BOOTSTRAP_SCOPES,
  CLOUDROUTER_CONSOLE_ROUTE_ORDER,
  CLOUDROUTER_CONSOLE_ROUTES,
} from '@sdkwork/cloudrouter-contracts';
import {
  formatMinorUnitsAsCurrency,
  formatPercent,
  formatTokenCount,
  loadConsoleApiKeys,
  loadConsoleOverview,
  loadConsoleUsagePage,
  maskApiKey,
  toConsoleCatalogPage,
} from '@sdkwork/cloudrouter-service';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

describe('cloud router shared client contracts', () => {
  it('keeps every capability on an ordered authenticated console route', () => {
    assert.equal(CLOUDROUTER_CONSOLE_CAPABILITIES.length, CLOUDROUTER_CONSOLE_ROUTE_ORDER.length);
    for (const capability of CLOUDROUTER_CONSOLE_CAPABILITIES) {
      const route = CLOUDROUTER_CONSOLE_ROUTES[capability.routeKey];
      assert.equal(capability.routeId, route.id);
      assert.equal(capability.path, route.path);
      assert.equal(route.requiresAuthentication, true);
      assert.ok(capability.pcAlignedPaths.length > 0, `${capability.id} must cite PC paths`);
    }
  });

  it('never requests operator scopes from a client bootstrap', () => {
    assert.deepEqual([...CLOUDROUTER_CLIENT_BOOTSTRAP_SCOPES], [
      'cloudrouter.console.access',
      'cloudrouter.system.read',
    ]);
  });
});

const ports: Pick<CloudRouterConsolePorts, 'overview' | 'usage' | 'apiKeys'> = {
  overview: {
    retrieveOverview: async () => ({ data: { totalRequests: 12, promptTokens: 100, completionTokens: 50, cost: 1234, errors: 1 } }),
  },
  usage: {
    listUsageLogs: async () => ({
      items: [{ requestId: 'r1', model: 'deepseek-chat', inputTokens: 10, outputTokens: 5, cost: 7, state: 'success', createdAt: '2026-09-17T00:00:00Z' }],
      total: 1,
      page: 1,
      size: 20,
    }),
  },
  apiKeys: {
    listApiKeys: async () => ({ items: [{ apiKeyId: 'k1', name: 'default', key: 'sk-abcdefghijklmnop', status: 'enabled' }] }),
  },
};

describe('cloud router shared services', () => {
  it('normalizes the overview payload', async () => {
    const snapshot = await loadConsoleOverview(ports);
    assert.equal(snapshot.totalRequests, 12);
    assert.equal(snapshot.totalTokens, 150);
    assert.equal(snapshot.errorRate, 1 / 12);
  });

  it('normalizes usage rows into the shared record shape', async () => {
    const page = await loadConsoleUsagePage(ports);
    assert.equal(page.items[0].id, 'r1');
    assert.equal(page.items[0].status, 'succeeded');
    assert.equal(page.items[0].totalTokens, 15);
  });

  it('masks API keys and keeps the row identity', async () => {
    const rows = await loadConsoleApiKeys(ports);
    assert.equal(rows[0].id, 'k1');
    assert.equal(rows[0].status, 'active');
    assert.equal(rows[0].maskedKey, 'sk-a********mnop');
  });

  it('normalizes catalog rows without inventing prices', () => {
    const page = toConsoleCatalogPage({ items: [{ vendor: 'openai', model: 'gpt-image-1' }] });
    assert.equal(page.items[0].inputPricePerMillionTokens, null);
    assert.equal(page.items[0].currency, 'CNY');
  });

  it('formats units deterministically', () => {
    assert.equal(formatTokenCount(1500, 'en-US'), '1.5K');
    assert.equal(formatPercent(0.125, 'en-US'), '12.50%');
    assert.ok(formatMinorUnitsAsCurrency(1234, 'CNY', 'zh-CN').includes('12.34'));
    assert.equal(maskApiKey('short'), '*****');
  });
});
