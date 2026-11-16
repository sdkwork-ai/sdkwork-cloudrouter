import { afterEach, describe, expect, it } from 'vitest';
import {
  configureDataCenterClient,
  DataCenterBackendPendingError,
  DataCenterService,
  isDataCenterBackendAvailable,
  type DataCenterClient,
} from '../dataCenterService.ts';

function createClient(overrides: Partial<DataCenterClient> = {}): DataCenterClient {
  return {
    fetchOverview: async () => ({
      sources: 2,
      tables: 5,
      todayInstances: 12,
      pendingExports: 1,
      successRate: '99.20',
    }),
    listSources: async () => [],
    listTables: async () => [],
    listExports: async () => [],
    listAudits: async () => [],
    ...overrides,
  };
}

afterEach(() => {
  configureDataCenterClient(null);
});

describe('data center service boundary', () => {
  it('reports a pending backend instead of returning fabricated data', async () => {
    expect(isDataCenterBackendAvailable()).toBe(false);
    await expect(DataCenterService.fetchOverview()).rejects.toBeInstanceOf(DataCenterBackendPendingError);
  });

  it('normalizes overview counts once a client is bound', async () => {
    configureDataCenterClient(createClient());
    expect(isDataCenterBackendAvailable()).toBe(true);

    const overview = await DataCenterService.fetchOverview();
    expect(overview).toMatchObject({ sources: 2, tables: 5, todayInstances: 12, pendingExports: 1 });
  });

  it('rejects an overview payload with a negative or fractional count', async () => {
    configureDataCenterClient(createClient({
      fetchOverview: async () => ({
        sources: -1,
        tables: 0,
        todayInstances: 0,
        pendingExports: 0,
        successRate: '0',
      }),
    }));

    await expect(DataCenterService.fetchOverview()).rejects.toThrow(/overview\.sources/u);
  });

  it('rejects a list payload that is not an array', async () => {
    configureDataCenterClient(createClient({
      listSources: async () => null as unknown as readonly never[],
    }));

    await expect(DataCenterService.listSources()).rejects.toThrow(/sources/u);
  });

  it('unbinds the client so pages fall back to the pending state', () => {
    configureDataCenterClient(createClient());
    configureDataCenterClient(null);
    expect(isDataCenterBackendAvailable()).toBe(false);
  });
});
