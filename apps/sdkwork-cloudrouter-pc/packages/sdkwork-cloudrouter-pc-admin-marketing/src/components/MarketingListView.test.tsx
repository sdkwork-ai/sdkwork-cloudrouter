// 列表导出契约：列表只提供展示值（券码列是后端脱敏值 codeMasked），导出永远
// 不写接口原值。完整券码只能来自受审计的 reveal / export 调用，因此本组件不再
// 提供 full-secret 导出模式。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMarketingCsv } from '../marketingCsv';
import {
  MarketingListView,
  type MarketingColumn,
  type MarketingLoadParams,
  type MarketingPageResult,
} from './MarketingListView';

vi.mock('react-i18next', () => {
  const translate = (key: string, fallback?: string, options?: Record<string, unknown>): string => {
    const template = typeof fallback === 'string' ? fallback : key;
    return Object.entries(options ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate, i18n: { language: 'en' } }) };
});

type CodeRow = {
  id: string;
  /** 列表展示值（券码列即后端脱敏后的 `codeMasked`，不含完整码）。 */
  code: string;
  status: string;
};

const FULL_CODE = 'WELCOME2026VIP0001';
const MASKED_CODE = 'WELC****0001';

const columns: MarketingColumn<CodeRow>[] = [
  { key: 'code', label: 'Code', masked: true },
  { key: 'status', label: 'Status' },
];

const rows: CodeRow[] = [
  { id: '1', code: FULL_CODE, status: 'active' },
  { id: '2', code: 'WELCOME2026VIP0002', status: 'active' },
  { id: '3', code: 'WELCOME2026VIP0003', status: 'disabled' },
];

const loadCodes = (_params: MarketingLoadParams): Promise<MarketingPageResult<CodeRow>> =>
  Promise.resolve({
    items: rows,
    pageInfo: { page: '1', pageSize: '20', totalItems: '3', totalPages: '1', hasMore: false },
  });

class MockBlob {
  readonly size: number;

  constructor(readonly parts: string[]) {
    this.size = parts.join('').length;
  }

  text(): string {
    return this.parts.join('');
  }
}

let exportedCsv: string[] = [];
const createObjectURLMock = vi.fn((blob: MockBlob) => {
  exportedCsv.push(blob.text());
  return 'blob:mock';
});

beforeEach(() => {
  exportedCsv = [];
  createObjectURLMock.mockClear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURLMock });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('Blob', MockBlob);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('buildMarketingCsv', () => {
  it('masks code columns and never writes the raw list value', () => {
    const csv = buildMarketingCsv(rows, columns);

    expect(csv).toContain(`"${MASKED_CODE}"`);
    expect(csv).not.toContain(FULL_CODE);
  });

  it('keeps non-masked columns raw in masked mode', () => {
    const csv = buildMarketingCsv(rows, columns);

    expect(csv).toContain('"active"');
    expect(csv).toContain('"disabled"');
  });
});

describe('MarketingListView export contract', () => {
  it('offers only the masked CSV export for the loaded rows', async () => {
    render(
      <MarketingListView
        title="Code Query"
        load={loadCodes}
        columns={columns}
        exportable
        exportFileName="codes.csv"
      />,
    );

    // 列表组件不再提供任何“完整券码”导出入口。
    expect(screen.queryByRole('button', { name: 'Export full codes (CSV)' })).not.toBeInTheDocument();

    const exportButton = await screen.findByRole('button', { name: 'Export CSV' });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(exportedCsv).toHaveLength(1));
    expect(exportedCsv[0]).toContain(MASKED_CODE);
    expect(exportedCsv[0]).not.toContain(FULL_CODE);
  });
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '3', totalPages: '1', hasMore: false };

type TimedRow = { id: string; code: string; claimedAt: string };

const timedColumns: MarketingColumn<TimedRow>[] = [
  { key: 'code', label: 'Code' },
  { key: 'claimedAt', label: 'Claimed At' },
];

describe('MarketingListView cell rendering', () => {
  it('formats backend space-separated timestamps as local YYYY-MM-DD HH:mm with a full title', async () => {
    const loadTimed = (): Promise<MarketingPageResult<TimedRow>> => Promise.resolve({
      items: [{ id: '1', code: 'X', claimedAt: '2026-11-10 09:12:00' }],
      pageInfo,
    });

    render(<MarketingListView title="Code Query" load={loadTimed} columns={timedColumns} />);

    const cell = await screen.findByText('2026-11-10 09:12');
    expect(cell).toHaveAttribute('title', '2026-11-10 09:12:00');
  });

  it('renders an em dash for empty cells instead of a hyphen', async () => {
    const loadTimed = (): Promise<MarketingPageResult<TimedRow>> => Promise.resolve({
      items: [{ id: '1', code: '', claimedAt: '' }],
      pageInfo,
    });

    render(<MarketingListView title="Code Query" load={loadTimed} columns={timedColumns} />);

    expect(await screen.findAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('right-aligns numeric columns with tabular-nums and truncates long text with a title', async () => {
    type WideRow = { id: string; name: string; count: string };
    const wideColumns: MarketingColumn<WideRow>[] = [
      { key: 'name', label: 'Name', truncate: true },
      { key: 'count', label: 'Count', numeric: true },
    ];
    const loadWide = (): Promise<MarketingPageResult<WideRow>> => Promise.resolve({
      items: [{ id: '1', name: 'a-very-long-coupon-name-that-must-truncate', count: '1234' }],
      pageInfo,
    });

    render(<MarketingListView title="Code Query" load={loadWide} columns={wideColumns} />);

    const numericCell = await screen.findByText('1234');
    expect(numericCell).toHaveClass('text-right');
    expect(numericCell).toHaveClass('tabular-nums');

    const truncateCell = screen.getByText('a-very-long-coupon-name-that-must-truncate');
    expect(truncateCell).toHaveAttribute('title', 'a-very-long-coupon-name-that-must-truncate');
    expect(truncateCell.closest('span')).toHaveClass('truncate');
  });
});

describe('MarketingListView search control', () => {
  it('renders the search input by default', async () => {
    render(<MarketingListView title="Code Query" load={loadCodes} columns={columns} />);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('hides the search input and drops q when searchable is false', async () => {
    const loadWithoutQuery = vi.fn(loadCodes);

    render(
      <MarketingListView
        title="Code Query"
        load={loadWithoutQuery}
        columns={columns}
        searchable={false}
      />,
    );

    expect(await screen.findByText(FULL_CODE)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search records')).not.toBeInTheDocument();
    const firstCall = loadWithoutQuery.mock.calls[0]?.[0] as MarketingLoadParams | undefined;
    expect(firstCall).toBeDefined();
    expect(firstCall).not.toHaveProperty('q');
  });
});

describe('MarketingListView table states', () => {
  it('renders the first-load state inside the table body', () => {
    const pendingLoad = (): Promise<MarketingPageResult<CodeRow>> => new Promise(() => undefined);

    render(<MarketingListView title="Code Query" load={pendingLoad} columns={columns} />);

    const loading = screen.getByRole('status');
    expect(loading).toHaveTextContent('Loading promotion records...');
    // 表头保留：载入态发生在表体内，而不是替换整个面板
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
    expect(document.querySelector('table')).not.toBeNull();
  });

  it('renders the empty state inside the table body', async () => {
    const emptyLoad = (): Promise<MarketingPageResult<CodeRow>> =>
      Promise.resolve({ items: [], pageInfo: { ...pageInfo, totalItems: '0', totalPages: '0' } });

    render(
      <MarketingListView
        title="Code Query"
        load={emptyLoad}
        columns={columns}
        emptyTitle="No code rows"
      />,
    );

    expect(await screen.findByText('No code rows')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument();
  });

  it('renders one in-body error state with a copyable traceId', async () => {
    const failingLoad = (): Promise<MarketingPageResult<CodeRow>> =>
      Promise.reject({ problem: { detail: 'Boom', traceId: 'trace-abc' } });

    render(<MarketingListView title="Code Query" load={failingLoad} columns={columns} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Boom');
    // 错误只在表体内出现一次，不再额外渲染顶部红条
    expect(screen.getAllByText('Boom')).toHaveLength(1);
    expect(screen.getByText('trace-abc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
  });

  it('keeps the old rows and shows a progress bar while refreshing', async () => {
    let resolveSecond: ((value: MarketingPageResult<CodeRow>) => void) | undefined;
    let calls = 0;
    const deferredLoad = (): Promise<MarketingPageResult<CodeRow>> => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve({ items: rows, pageInfo });
      }
      return new Promise((resolve) => {
        resolveSecond = resolve;
      });
    };

    render(<MarketingListView title="Code Query" load={deferredLoad} columns={columns} />);

    expect(await screen.findByText(FULL_CODE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    expect(await screen.findByRole('progressbar', { name: 'Refreshing records' })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText(FULL_CODE)).toBeInTheDocument();

    resolveSecond?.({ items: rows, pageInfo });
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(screen.getByText(FULL_CODE)).toBeInTheDocument();
  });
});
