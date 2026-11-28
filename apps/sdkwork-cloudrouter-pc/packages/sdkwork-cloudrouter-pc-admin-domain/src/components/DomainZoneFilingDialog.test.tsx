// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { domainCenterService } from '../domainService';
import type { DomainZone } from '../domainTypes';
import { DomainZoneFilingDialog } from './DomainZoneFilingDialog';

vi.mock('react-i18next', () => {
  const translate = (
    key: string,
    fallbackOrOptions?: string | { defaultValue?: string },
    options?: Record<string, unknown>,
  ): string => {
    const optionsObject = fallbackOrOptions && typeof fallbackOrOptions === 'object' ? fallbackOrOptions : options;
    let template = key;
    if (key === 'admin.domainCenter.validation.invalidFilingReviewDate') {
      template = 'Enter a valid review date that is not in the future.';
    } else if (key === 'admin.domainCenter.validation.invalidPoliceFilingRecordUrl') {
      template = 'Enter an absolute HTTP or HTTPS URL.';
    } else if (typeof fallbackOrOptions === 'string') {
      template = fallbackOrOptions;
    } else if (typeof fallbackOrOptions?.defaultValue === 'string') {
      template = fallbackOrOptions.defaultValue;
    }
    return Object.entries(optionsObject ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate }) };
});

vi.mock('@sdkwork/cloudroutes-pc-commons', () => ({
  BusinessStateTableRow: () => null,
  ConfirmDialog: ({ title, description, confirmLabel, cancelLabel, onConfirm, onCancel }: {
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div role="dialog" aria-label={title}>
      <p>{description}</p>
      <button type="button" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" onClick={onCancel}>{cancelLabel}</button>
    </div>
  ),
  resolveProblemMessage: (_cause: unknown, _t: unknown, fallback: string) => fallback,
}));

vi.mock('../domainService', () => ({
  domainCenterService: { updateZone: vi.fn() },
}));

const zone: DomainZone = {
  id: 'zone-1',
  apexHostname: 'example.com',
  scope: 'USER',
  status: 'ACTIVE',
  hostnameCount: '1',
  verifiedHostnameCount: '1',
  certificateCount: '0',
  bindingCount: '0',
  updatedAt: '2026-11-28T00:00:00Z',
  version: '1',
  filing: {
    recordNumber: '京ICP备12345678号-1',
    entityName: 'Example Co., Ltd.',
    websiteName: 'Example',
    reviewDate: '2024-02-29',
  },
  policeFiling: {
    recordNumber: '京公网安备11010502000000号',
    recordUrl: 'https://beian.mps.gov.cn/',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(domainCenterService.updateZone).mockResolvedValue(zone);
});

afterEach(cleanup);

describe('root-domain filing dialog', () => {
  it('loads ICP and public security filing into independent sections', () => {
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'ICP filing' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Public security filing' })).toBeInTheDocument();
    expect(screen.getByLabelText('ICP record number')).toHaveValue('京ICP备12345678号-1');
    expect(screen.getByLabelText('Filing entity')).toHaveValue('Example Co., Ltd.');
    expect(screen.getByLabelText('Website name')).toHaveValue('Example');
    expect(screen.getByLabelText(/Review date/u)).toHaveValue('2024-02-29');
    expect(screen.getByLabelText('Public security filing number')).toHaveValue('京公网安备11010502000000号');
    expect(screen.getByLabelText(/^Public security filing URL/u)).toHaveValue('https://beian.mps.gov.cn/');
  });

  it('saves a trimmed complete ICP replacement without changing public security filing', async () => {
    const onSaved = vi.fn();
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('ICP record number'), { target: { value: ' 新备案号 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save ICP filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', {
      filing: {
        recordNumber: '新备案号',
        entityName: 'Example Co., Ltd.',
        websiteName: 'Example',
        reviewDate: '2024-02-29',
      },
    }));
    expect(onSaved).toHaveBeenCalledWith(zone);
  });

  it('saves only the trimmed public security filing replacement', async () => {
    const onSaved = vi.fn();
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Public security filing number'), { target: { value: ' 新公安备案号 ' } });
    fireEvent.change(screen.getByLabelText(/^Public security filing URL/u), {
      target: { value: ' https://beian.mps.gov.cn/#record ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save public security filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', {
      policeFiling: {
        recordNumber: '新公安备案号',
        recordUrl: 'https://beian.mps.gov.cn/#record',
      },
    }));
    expect(onSaved).toHaveBeenCalledWith(zone);
  });

  it('rejects a future review date without calling the API', () => {
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Review date/u), { target: { value: '2999-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save ICP filing' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid review date that is not in the future.');
    expect(domainCenterService.updateZone).not.toHaveBeenCalled();
  });

  it.each(['beian.mps.gov.cn', 'javascript:alert(1)', 'ftp://example.com', 'https://'])(
    'rejects invalid public security filing URL %s without calling the API',
    (recordUrl) => {
      render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/^Public security filing URL/u), { target: { value: recordUrl } });
      fireEvent.click(screen.getByRole('button', { name: 'Save public security filing' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Enter an absolute HTTP or HTTPS URL.');
      expect(domainCenterService.updateZone).not.toHaveBeenCalled();
    },
  );

  it('requires confirmation before clearing ICP filing and sends an explicit null', async () => {
    const onSaved = vi.fn();
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear ICP filing' }));

    const confirmation = screen.getByRole('dialog', { name: 'Clear ICP filing information' });
    expect(confirmation).toHaveTextContent('example.com');
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Clear ICP filing information' })).not.toBeInTheDocument();
    expect(domainCenterService.updateZone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear ICP filing' }));
    const confirmed = screen.getByRole('dialog', { name: 'Clear ICP filing information' });
    fireEvent.click(within(confirmed).getByRole('button', { name: 'Clear ICP filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', { filing: null }));
    expect(onSaved).toHaveBeenCalledWith(zone);
  });

  it('requires confirmation before clearing public security filing and leaves ICP untouched', async () => {
    const onSaved = vi.fn();
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear public security filing' }));

    const confirmation = screen.getByRole('dialog', { name: 'Clear public security filing information' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(domainCenterService.updateZone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear public security filing' }));
    const confirmed = screen.getByRole('dialog', { name: 'Clear public security filing information' });
    fireEvent.click(within(confirmed).getByRole('button', { name: 'Clear public security filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', { policeFiling: null }));
    expect(onSaved).toHaveBeenCalledWith(zone);
  });

  it('sends an empty ICP replacement when every ICP field is cleared', async () => {
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={vi.fn()} />);
    for (const label of ['ICP record number', 'Filing entity', 'Website name']) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: '' } });
    }
    fireEvent.change(screen.getByLabelText(/Review date/u), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save ICP filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', { filing: {} }));
  });

  it('sends an empty public security replacement when both fields are cleared', async () => {
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Public security filing number'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/^Public security filing URL/u), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save public security filing' }));

    await waitFor(() => expect(domainCenterService.updateZone).toHaveBeenCalledWith('zone-1', { policeFiling: {} }));
  });

  it('keeps the form open and reports a failed save', async () => {
    vi.mocked(domainCenterService.updateZone).mockRejectedValueOnce(new Error('failed'));
    const onSaved = vi.fn();
    render(<DomainZoneFilingDialog zone={zone} onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save ICP filing' }));

    expect(await screen.findByText('Filing information could not be saved')).toBeInTheDocument();
    expect(screen.getByLabelText('ICP record number')).toHaveValue('京ICP备12345678号-1');
    expect(screen.getByLabelText('Public security filing number')).toHaveValue('京公网安备11010502000000号');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
