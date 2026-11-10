// 券码查询页的受审计揭示契约：
// - 列表只渲染后端脱敏值 `codeMasked`（并保留 `codeLast4` 作为 title），
//   即便列表响应里仍带已废弃的完整 `promotionCode`，也不得进入 DOM 或 CSV；
// - 普通 CSV 导出只写脱敏值；
// - 行内 Reveal 调用 `codes.reveals.create`，面板展示完整码 + 审计提示 + 复制；
// - 行内 Reissue 调用 `codes.reissues.create`；仅 active 且未领取的券码可补发，
//   成功只展示脱敏的新 codeNo/codeMasked（完整新码需在新行走受审计揭示）；
//   409/404 展示问题原文 + traceId，且不刷新列表；
// - 揭示失败展示问题信息与可复制 traceId；
// - 面板可用 Esc 关闭并把焦点还给触发行。
// 运行：pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backendDisablePromotionCode,
  backendPromotionCodesList,
  backendReissuePromotionCode,
  backendRevealPromotionCode,
} from '../marketingService';
import { CodesPage } from './CodesPage';

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

vi.mock('../usePromotionReferences', () => ({
  usePromotionReferences: () => ({ offerNames: {}, stockNames: {}, stockByOffer: {} }),
}));

vi.mock('../marketingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../marketingService')>();
  return {
    ...actual,
    backendPromotionCodesList: vi.fn(),
    backendRevealPromotionCode: vi.fn(),
    backendDisablePromotionCode: vi.fn(),
    backendReissuePromotionCode: vi.fn(),
  };
});

const pageInfo = { page: '1', pageSize: '20', totalItems: '1', totalPages: '1', hasMore: false };

const FULL_CODE = '3C76Q1W24E21';
const MASKED_CODE = '3C76****4E21';

const codeRow = {
  id: 'c1',
  codeNo: 'CN-1',
  // 后端列表仍返回已废弃的完整码；页面不得展示、复制或导出它。
  promotionCode: FULL_CODE,
  codeMasked: MASKED_CODE,
  codeLast4: '4E21',
  codeType: 'PUBLIC',
  maxClaims: 1,
  claimedQuantity: 0,
  status: 'active',
};

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

const writeText = vi.fn<(value: string) => Promise<void>>();

beforeEach(() => {
  exportedCsv = [];
  downloadedFiles = [];
  createObjectURLMock.mockClear();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURLMock });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('Blob', MockBlob);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadedFiles.push(this.download);
  });
  vi.mocked(backendPromotionCodesList).mockReset();
  vi.mocked(backendRevealPromotionCode).mockReset();
  vi.mocked(backendDisablePromotionCode).mockReset();
  vi.mocked(backendReissuePromotionCode).mockReset();
  vi.mocked(backendPromotionCodesList).mockResolvedValue({ items: [codeRow], pageInfo } as never);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

const revealButtonName = `Reveal full code for code ${MASKED_CODE}`;

describe('CodesPage masked list', () => {
  it('renders codeMasked with codeLast4 as the title and never the full code', async () => {
    render(<CodesPage />);

    const masked = await screen.findByText(MASKED_CODE);
    expect(masked).toHaveAttribute('title', '4E21');
    expect(document.body.textContent).not.toContain(FULL_CODE);
  });

  it('exports the masked value and never the list-sourced full code', async () => {
    render(<CodesPage />);

    await screen.findByText(MASKED_CODE);
    const exportButton = screen.getByRole('button', { name: 'Export CSV' });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);

    await waitFor(() => expect(exportedCsv).toHaveLength(1));
    expect(exportedCsv[0]).toContain(MASKED_CODE);
    expect(exportedCsv[0]).not.toContain(FULL_CODE);
    expect(downloadedFiles).toEqual(['codes.csv']);
    // 页面不再提供任何“完整券码”客户端导出入口。
    expect(screen.queryByRole('button', { name: 'Export full codes (CSV)' })).not.toBeInTheDocument();
  });
});

describe('CodesPage audited reveal', () => {
  it('calls the reveal service with the row code id and shows the returned code with the audit notice', async () => {
    vi.mocked(backendRevealPromotionCode).mockResolvedValue({ codeNo: 'CN-1', code: FULL_CODE });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: revealButtonName }));

    await waitFor(() => expect(backendRevealPromotionCode).toHaveBeenCalledWith('c1'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Revealed code CN-1');
    expect(dialog).toHaveTextContent(FULL_CODE);
    expect(dialog).toHaveTextContent('This access has been recorded in the audit log.');
    expect(screen.getByRole('button', { name: `Copy full code for code ${MASKED_CODE}` })).toBeInTheDocument();
    // 列表列仍保持脱敏；完整码只出现在揭示面板里。
    expect(screen.getByText(MASKED_CODE)).toHaveAttribute('title', '4E21');
  });

  it('copies only the revealed full code', async () => {
    vi.mocked(backendRevealPromotionCode).mockResolvedValue({ codeNo: 'CN-1', code: FULL_CODE });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: revealButtonName }));
    fireEvent.click(await screen.findByRole('button', { name: `Copy full code for code ${MASKED_CODE}` }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(FULL_CODE));
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('is dismissible with Escape and restores focus to the triggering row action', async () => {
    vi.mocked(backendRevealPromotionCode).mockResolvedValue({ codeNo: 'CN-1', code: FULL_CODE });
    render(<CodesPage />);

    const revealButton = await screen.findByRole('button', { name: revealButtonName });
    fireEvent.click(revealButton);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(revealButton).toHaveFocus();
  });

  it('shows the problem message with a copyable traceId when the reveal fails', async () => {
    vi.mocked(backendRevealPromotionCode).mockRejectedValue({
      problem: { detail: 'Reveal is not permitted', traceId: 'trace-reveal-1' },
    });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: revealButtonName }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Reveal is not permitted');
    expect(alert).toHaveTextContent('trace-reveal-1');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables reveal when the row has no code id', async () => {
    vi.mocked(backendPromotionCodesList).mockResolvedValue({
      items: [{ ...codeRow, id: '' }],
      pageInfo,
    } as never);
    render(<CodesPage />);

    const revealButton = await screen.findByRole('button', { name: revealButtonName });
    expect(revealButton).toBeDisabled();
    fireEvent.click(revealButton);
    expect(backendRevealPromotionCode).not.toHaveBeenCalled();
  });
});

const disableButtonName = `Disable code ${MASKED_CODE}`;

describe('CodesPage stop-loss disable', () => {
  it('requires a confirmation with a reason and calls the disable service', async () => {
    vi.mocked(backendDisablePromotionCode).mockResolvedValue({ codeId: 'c1', status: 'disabled' });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: disableButtonName }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Disable code?');
    expect(dialog).toHaveTextContent(`Disable code "${MASKED_CODE}"?`);
    expect(dialog).toHaveTextContent('Codes that are already claimed are not affected.');

    const confirmButton = screen.getByRole('button', { name: 'Disable code' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '  Leaked in a public channel  ' },
    });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(backendDisablePromotionCode).toHaveBeenCalledTimes(1));
    expect(backendDisablePromotionCode).toHaveBeenCalledWith('c1', 'Leaked in a public channel');
    expect(await screen.findByText(`Code ${MASKED_CODE} disabled.`)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(backendPromotionCodesList).toHaveBeenCalledTimes(2));
  });

  it('explains why an already claimed code cannot be disabled', async () => {
    vi.mocked(backendPromotionCodesList).mockResolvedValue({
      items: [{ ...codeRow, claimedQuantity: '2' }],
      pageInfo,
    } as never);
    render(<CodesPage />);

    const disableButton = await screen.findByRole('button', { name: disableButtonName });
    expect(disableButton).toBeDisabled();
    expect(disableButton).toHaveAttribute(
      'title',
      'Only an unused code can be disabled; this code has already been claimed.',
    );

    fireEvent.click(disableButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendDisablePromotionCode).not.toHaveBeenCalled();
  });

  it('explains why a code that is not active cannot be disabled', async () => {
    vi.mocked(backendPromotionCodesList).mockResolvedValue({
      items: [{ ...codeRow, status: 'disabled' }],
      pageInfo,
    } as never);
    render(<CodesPage />);

    const disableButton = await screen.findByRole('button', { name: disableButtonName });
    expect(disableButton).toBeDisabled();
    expect(disableButton).toHaveAttribute(
      'title',
      'Only an active code can be disabled; this code is disabled.',
    );
  });

  it('surfaces a 409 problem message with a copyable traceId in the list feedback slot', async () => {
    vi.mocked(backendDisablePromotionCode).mockRejectedValue({
      problem: { status: 409, detail: 'Code has already been claimed', traceId: 'trace-code-409' },
    });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: disableButtonName }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Leaked code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Disable code' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Code has already been claimed');
    expect(alert).toHaveTextContent('trace-code-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendDisablePromotionCode).toHaveBeenCalledWith('c1', 'Leaked code');
  });
});

const reissueButtonName = `Reissue code ${MASKED_CODE}`;

describe('CodesPage reissue', () => {
  it('explains why an already claimed code cannot be reissued', async () => {
    vi.mocked(backendPromotionCodesList).mockResolvedValue({
      items: [{ ...codeRow, claimedQuantity: '2' }],
      pageInfo,
    } as never);
    render(<CodesPage />);

    const reissueButton = await screen.findByRole('button', { name: reissueButtonName });
    expect(reissueButton).toBeDisabled();
    expect(reissueButton).toHaveAttribute(
      'title',
      'Only an unused code can be reissued; this code has already been claimed.',
    );

    fireEvent.click(reissueButton);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(backendReissuePromotionCode).not.toHaveBeenCalled();
  });

  it('explains why a code that is not active cannot be reissued', async () => {
    vi.mocked(backendPromotionCodesList).mockResolvedValue({
      items: [{ ...codeRow, status: 'disabled' }],
      pageInfo,
    } as never);
    render(<CodesPage />);

    const reissueButton = await screen.findByRole('button', { name: reissueButtonName });
    expect(reissueButton).toBeDisabled();
    expect(reissueButton).toHaveAttribute(
      'title',
      'Only an active code can be reissued; this code is disabled.',
    );
  });

  it('requires a reason before the reissue can be confirmed', async () => {
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: reissueButtonName }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Reissue code?');

    const confirmButton = screen.getByRole('button', { name: 'Reissue code' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '   ' } });
    expect(confirmButton).toBeDisabled();
    expect(backendReissuePromotionCode).not.toHaveBeenCalled();
  });

  it('uppercases the optional code and rejects invalid characters or the wrong length inline', async () => {
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: reissueButtonName }));
    await screen.findByRole('alertdialog');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Leaked online' } });

    const codeInput = screen.getByLabelText('New code (optional)');
    const confirmButton = screen.getByRole('button', { name: 'Reissue code' });

    fireEvent.change(codeInput, { target: { value: 'newcode1234' } });
    expect(codeInput).toHaveValue('NEWCODE1234');
    expect(confirmButton).toBeEnabled();

    fireEvent.change(codeInput, { target: { value: 'AB' } });
    expect(
      screen.getByText('Use 4–64 characters: A–Z, 0–9, hyphen (-), or underscore (_).'),
    ).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();

    fireEvent.change(codeInput, { target: { value: 'BAD CODE!' } });
    expect(
      screen.getByText('Use 4–64 characters: A–Z, 0–9, hyphen (-), or underscore (_).'),
    ).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
    expect(backendReissuePromotionCode).not.toHaveBeenCalled();
  });

  it('calls the service with the row id, reason, and explicit code, then shows only the masked result', async () => {
    vi.mocked(backendReissuePromotionCode).mockResolvedValue({
      codeId: 'c2',
      codeNo: 'CN-2',
      codeMasked: 'NEW1****9XYZ',
      codeLast4: '9XYZ',
      replacedCodeId: 'c1',
    });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: reissueButtonName }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(`Reissue code "${MASKED_CODE}"?`);
    expect(dialog).toHaveTextContent(
      'The old code stops working immediately, and a new code is issued in the same stock with the same validity window and max claims.',
    );
    expect(dialog).toHaveTextContent(
      'This action is recorded in the audit log and cannot be undone.',
    );

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '  Leaked in a public channel  ' },
    });
    fireEvent.change(screen.getByLabelText('New code (optional)'), {
      target: { value: 'newcode1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reissue code' }));

    await waitFor(() =>
      expect(backendReissuePromotionCode).toHaveBeenCalledWith(
        'c1',
        'Leaked in a public channel',
        'NEWCODE1234',
      ),
    );
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('Code reissued as CN-2 (NEW1****9XYZ).');
    expect(notice).toHaveTextContent('The full new code can be revealed from the new row.');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // 明文新码不得出现在页面任何位置（列表仍只有脱敏值）。
    expect(document.body.textContent).not.toContain('NEWCODE1234');
    await waitFor(() => expect(backendPromotionCodesList).toHaveBeenCalledTimes(2));
  });

  it('omits the optional code when it is left blank', async () => {
    vi.mocked(backendReissuePromotionCode).mockResolvedValue({
      codeId: 'c2',
      codeNo: 'CN-2',
      codeMasked: 'GENR****0001',
      codeLast4: '0001',
      replacedCodeId: 'c1',
    });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: reissueButtonName }));
    await screen.findByRole('alertdialog');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Lost by customer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reissue code' }));

    await waitFor(() =>
      expect(backendReissuePromotionCode).toHaveBeenCalledWith(
        'c1',
        'Lost by customer',
        undefined,
      ),
    );
    expect(await screen.findByText(/Code reissued as CN-2/)).toBeInTheDocument();
  });

  it('shows a 409 problem message with a copyable traceId and does not refresh the list', async () => {
    vi.mocked(backendReissuePromotionCode).mockRejectedValue({
      problem: {
        status: 409,
        detail: 'code has already been claimed and cannot be reissued',
        traceId: 'trace-reissue-409',
      },
    });
    render(<CodesPage />);

    fireEvent.click(await screen.findByRole('button', { name: reissueButtonName }));
    await screen.findByRole('alertdialog');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Leaked code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reissue code' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('code has already been claimed and cannot be reissued');
    expect(alert).toHaveTextContent('trace-reissue-409');
    expect(screen.getByRole('button', { name: 'Copy trace ID' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // 409 时列表保持不变：只保留首屏那一次加载，不因失败而刷新。
    expect(backendPromotionCodesList).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Code reissued as/)).not.toBeInTheDocument();
  });
});
