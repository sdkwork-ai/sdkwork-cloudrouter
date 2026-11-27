import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const retrieveOverview = vi.fn();
const listSources = vi.fn();
const listTables = vi.fn();
const listExports = vi.fn();
const listAudits = vi.fn();

vi.mock('@sdkwork/cloudroutes-pc-commons/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sdkwork/cloudroutes-pc-commons/runtime')>();
  return {
    ...actual,
    getCloudRouterBackendSdkClient: () => ({
      datacenter: {
        overview: { retrieve: retrieveOverview },
        dataSources: { list: listSources },
        dataCenterTables: { list: listTables },
        dataCenterExports: { list: listExports },
        dataCenterAudits: { list: listAudits },
      },
    }),
  };
});

const { DataCenterService } = await import('../dataCenterService.ts');

function listEnvelope(items: readonly unknown[]) {
  return { items, pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: String(items.length) } };
}

beforeEach(() => {
  retrieveOverview.mockReset();
  listSources.mockReset();
  listTables.mockReset();
  listExports.mockReset();
  listAudits.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('data center service boundary', () => {
  it('reads the overview through the generated datacenter namespace', async () => {
    retrieveOverview.mockResolvedValue({
      sources: '2',
      tables: '5',
      todayInstances: '12',
      pendingExports: '1',
      successRate: '99.20',
    });

    await expect(DataCenterService.fetchOverview()).resolves.toEqual({
      sources: '2',
      tables: '5',
      todayInstances: '12',
      pendingExports: '1',
      successRate: '99.20',
    });
  });

  it('rejects an overview payload whose counters are JSON numbers instead of int64 strings', async () => {
    retrieveOverview.mockResolvedValue({
      sources: 2,
      tables: '0',
      todayInstances: '0',
      pendingExports: '0',
      successRate: '0.00',
    });

    await expect(DataCenterService.fetchOverview()).rejects.toThrow(/sources/u);
  });

  it('rejects an overview percentage that is not a decimal string', async () => {
    retrieveOverview.mockResolvedValue({
      sources: '0',
      tables: '0',
      todayInstances: '0',
      pendingExports: '0',
      successRate: 99.2,
    });

    await expect(DataCenterService.fetchOverview()).rejects.toThrow(/successRate/u);
  });

  it('normalizes a sources page and keeps the table count numeric', async () => {
    listSources.mockResolvedValue(listEnvelope([
      { id: '1', name: 'warehouse-pg', kind: 'postgresql', health: 'healthy', tableCount: 4, lastTestedAt: null },
    ]));

    await expect(DataCenterService.listSources()).resolves.toEqual([
      { id: '1', name: 'warehouse-pg', kind: 'postgresql', health: 'healthy', tableCount: 4, lastTestedAt: null },
    ]);
  });

  it('rejects an unknown source health label instead of guessing', async () => {
    listSources.mockResolvedValue(listEnvelope([
      { id: '1', name: 'x', kind: 'postgresql', health: 'stale', tableCount: 0, lastTestedAt: null },
    ]));

    await expect(DataCenterService.listSources()).rejects.toThrow(/health/u);
  });

  it('keeps landed table row counts as decimal strings', async () => {
    listTables.mockResolvedValue(listEnvelope([
      {
        id: '9007199254740993',
        name: 'dc_orders',
        kind: 'landed',
        rowCount: '9007199254740993',
        columnCount: 12,
        owner: 'ops',
        updatedAt: '2026-11-27T00:00:00Z',
      },
    ]));

    const tables = await DataCenterService.listTables();
    expect(tables[0]?.rowCount).toBe('9007199254740993');
    expect(typeof tables[0]?.id).toBe('string');
  });

  it('rejects a table payload whose row count is a number', async () => {
    listTables.mockResolvedValue(listEnvelope([
      { id: '1', name: 'dc_orders', kind: 'landed', rowCount: 12, columnCount: 12, owner: '', updatedAt: '' },
    ]));

    await expect(DataCenterService.listTables()).rejects.toThrow(/rowCount/u);
  });

  it('normalizes export jobs and audit rows', async () => {
    listExports.mockResolvedValue(listEnvelope([
      { id: '1', datasetName: 'orders', status: 'pending_approval', rowCount: '0', requestedBy: 'admin', expiresAt: null },
    ]));
    listAudits.mockResolvedValue(listEnvelope([
      { id: '2', actor: 'admin', action: 'query', object: 'audit_log:audits', rowCount: '0', result: 'success', at: '2026-11-27T00:00:00Z' },
    ]));

    await expect(DataCenterService.listExports()).resolves.toEqual([
      { id: '1', datasetName: 'orders', status: 'pending_approval', rowCount: '0', requestedBy: 'admin', expiresAt: null },
    ]);
    await expect(DataCenterService.listAudits()).resolves.toEqual([
      { id: '2', actor: 'admin', action: 'query', object: 'audit_log:audits', rowCount: '0', result: 'success', at: '2026-11-27T00:00:00Z' },
    ]);
  });

  it('rejects a list payload without an items array', async () => {
    listAudits.mockResolvedValue({ pageInfo: { mode: 'offset' } });

    await expect(DataCenterService.listAudits()).rejects.toThrow(/audits/u);
  });
});
