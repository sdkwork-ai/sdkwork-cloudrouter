// 批次券码页的受审计导出契约：
// - 普通 CSV 导出仍只写列表脱敏值；
// - “导出完整券码”先确认（说明审计与 5000 条上限），再调用
//   `codeBatches.codeExports.create`，并用返回的 items 构建 CSV；
// - `truncated: true` 时提示只导出了前 5000 条；
// - 列表自身不再渲染或导出已废弃的完整 `promotionCode`。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendDisablePromotionBatchCodes,
  backendExportPromotionBatchCodes,
  backendPromotionCodeBatchesList,
  backendPromotionCodesList,
} from '../marketingService';
import { BatchCodesPage } from './BatchCodesPage';

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

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return {
    ...actual,
    backendPromotionCodeBatchesList: vi.fn(),
    backendPromotionCodesList: vi.fn(),
    backendExportPromotionBatchCodes: vi.fn(),
    backendDisablePromotionBatchCodes: vi.fn(),
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '2', totalPages: '1', hasMore: false };

const BATCH_ID = 'b1';
const FULL_CODE = '3C76Q1W24E21';
const FULL_CODE_2 = '9F2K88ZZ11AA';
const MASKED_CODE = '3C76****4E21';

const batch = {
  id: BATCH_ID,
  batchNo: 'B-1',
  generatedQuantity: '2',
  codePrefix: '3C76',
  status: 'ready',
};

const codeRows = [
  {
    id: 'c1',
    codeNo: 'CN-1',
    // 列表仍返回已废弃的完整码；页面不得展示或把它写进普通 CSV。
    promotionCode: FULL_CODE,
    codeMasked: MASKED_CODE,
    codeLast4: '4E21',
    codeType: 'PUBLIC',
    maxClaims: 1,
    claimedQuantity: 0,
    status: 'active',
  },
  {
    id: 'c2',
    codeNo: 'CN-2',
    promotionCode: FULL_CODE_2,
    codeMasked: '9F2K****11AA',
    codeLast4: '11AA',
    codeType: 'PUBLIC',
    maxClaims: 1,
    claimedQuantity: 0,
    status: 'active',
  },
];

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
let downloadedFiles: string[] = [];
const createObjectURLMock = vi.fn((blob: MockBlob) => {
  exportedCsv.push(blob.text());
  return 'blob:mock';
});

beforeEach(() => {
  exportedCsv = [];
  downloadedFiles = [];
  createObjectURLMock.mockClear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURLMock });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('Blob', MockBlob);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadedFiles.push(this.download);
  });
  vi.mocked(backendPromotionCodeBatchesList).mockReset();
  vi.mocked(backendPromotionCodesList).mockReset();
  vi.mocked(backendExportPromotionBatchCodes).mockReset();
  vi.mocked(backendDisablePromotionBatchCodes).mockReset();
  vi.mocked(backendPromotionCodeBatchesList).mockResolvedValue({ items: [batch], pageInfo } as never);
  vi.mocked(backendPromotionCodesList).mockResolvedValue({ items: codeRows, pageInfo } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

const auditedExportButtonName = 'Export full codes (audited) for batch B-1';

describe('BatchCodesPage list rendering', () => {
  it('renders the masked code column and never the deprecated full code', async () => {
    render(<BatchCodesPage batchId={BATCH_ID} />);

    const masked = await screen.findByText(MASKED_CODE);
    expect(masked).toHaveAttribute('title', '4E21');
    expect(screen.getByText('9F2K****11AA')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(FULL_CODE);
    expect(document.body.textContent).not.toContain(FULL_CODE_2);
  });
});

describe('BatchCodesPage masked export', () => {
  it('keeps the ordinary CSV export masked and offers no client-side full-code export', async () => {
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    await waitFor(() => expect(exportedCsv).toHaveLength(1));
    expect(exportedCsv[0]).toContain(MASKED_CODE);
    expect(exportedCsv[0]).not.toContain(FULL_CODE);
    expect(downloadedFiles).toEqual(['batch-codes.csv']);
    expect(screen.queryByRole('button', { name: 'Export full codes (CSV)' })).not.toBeInTheDocument();
  });
});

describe('BatchCodesPage audited export', () => {
  it('confirms, calls the audited export, builds the CSV from returned items, and warns on truncation', async () => {
    vi.mocked(backendExportPromotionBatchCodes).mockResolvedValue({
      items: [
        { codeNo: 'CN-1', code: FULL_CODE },
        { codeNo: 'CN-2', code: FULL_CODE_2 },
      ],
      count: 5000,
      truncated: true,
    });
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: auditedExportButtonName }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Export full coupon codes for batch B-1?');
    expect(dialog).toHaveTextContent('at most 5000 codes');
    expect(dialog).toHaveTextContent('recorded in the audit log');
    expect(backendExportPromotionBatchCodes).not.toHaveBeenCalled();
    expect(exportedCsv).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Export up to 5000 codes' }));

    await waitFor(() => expect(backendExportPromotionBatchCodes).toHaveBeenCalledWith(BATCH_ID));
    await waitFor(() => expect(exportedCsv).toHaveLength(1));
    expect(exportedCsv[0]).toContain('"CN-1","3C76Q1W24E21"');
    expect(exportedCsv[0]).toContain('"CN-2","9F2K88ZZ11AA"');
    expect(downloadedFiles).toEqual(['batch-codes-full-secret.csv']);

    expect(await screen.findByText('Exported 5,000 codes from batch B-1; the export is recorded in the audit log.'))
      .toBeInTheDocument();
    expect(screen.getByText('This batch holds more than 5000 codes; only the first 5000 were exported.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not call the export operation when the confirmation is cancelled', async () => {
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: auditedExportButtonName }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendExportPromotionBatchCodes).not.toHaveBeenCalled();
    expect(exportedCsv).toHaveLength(0);
  });

  it('shows the problem message with a copyable traceId when the audited export fails', async () => {
    vi.mocked(backendExportPromotionBatchCodes).mockRejectedValue({
      problem: { detail: 'Export quota exceeded', traceId: 'trace-export-9' },
    });
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: auditedExportButtonName }));
    fireEvent.click(screen.getByRole('button', { name: 'Export up to 5000 codes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Export quota exceeded');
    expect(alert).toHaveTextContent('trace-export-9');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(exportedCsv).toHaveLength(0);
  });
});

const disableUnusedButtonName = 'Disable unused codes (audited) for batch B-1';

describe('BatchCodesPage stop-loss disable', () => {
  it('confirms the consequence, reports disabled/skipped counts and warns when codes were skipped', async () => {
    vi.mocked(backendDisablePromotionBatchCodes).mockResolvedValue({
      disabledCount: '3',
      skippedCount: '2',
    });
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: disableUnusedButtonName }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Disable unused codes in batch B-1?');
    expect(dialog).toHaveTextContent('Codes that are already claimed are skipped and stay redeemable.');
    expect(dialog).toHaveTextContent('This cannot be undone.');

    const confirmButton = screen.getByRole('button', { name: 'Disable unused codes' });
    expect(confirmButton).toBeDisabled();
    expect(backendDisablePromotionBatchCodes).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '  Campaign cancelled  ' },
    });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(backendDisablePromotionBatchCodes).toHaveBeenCalledTimes(1));
    expect(backendDisablePromotionBatchCodes).toHaveBeenCalledWith(BATCH_ID, 'Campaign cancelled');
    expect(await screen.findByText(
      'Disabled 3 unused codes in batch B-1; skipped 2 claimed or inactive codes.',
    )).toBeInTheDocument();
    expect(screen.getByText(
      '2 codes were skipped because they are already claimed or no longer active. Those coupons stay redeemable.',
    )).toBeInTheDocument();
    await waitFor(() => expect(backendPromotionCodesList).toHaveBeenCalledTimes(2));
  });

  it('does not warn about skipped codes when the batch had none', async () => {
    vi.mocked(backendDisablePromotionBatchCodes).mockResolvedValue({
      disabledCount: '4',
      skippedCount: '0',
    });
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: disableUnusedButtonName }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Campaign cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable unused codes' }));

    expect(await screen.findByText(
      'Disabled 4 unused codes in batch B-1; skipped 0 claimed or inactive codes.',
    )).toBeInTheDocument();
    expect(screen.queryByText(
      '0 codes were skipped because they are already claimed or no longer active. Those coupons stay redeemable.',
    )).not.toBeInTheDocument();
  });

  it('surfaces the problem message with a copyable traceId when the disable fails', async () => {
    vi.mocked(backendDisablePromotionBatchCodes).mockRejectedValue({
      problem: { status: 409, detail: 'Batch is still generating', traceId: 'trace-batch-409' },
    });
    render(<BatchCodesPage batchId={BATCH_ID} />);

    await screen.findByText(MASKED_CODE);
    fireEvent.click(screen.getByRole('button', { name: disableUnusedButtonName }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Campaign cancelled' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable unused codes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Batch is still generating');
    expect(alert).toHaveTextContent('trace-batch-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
