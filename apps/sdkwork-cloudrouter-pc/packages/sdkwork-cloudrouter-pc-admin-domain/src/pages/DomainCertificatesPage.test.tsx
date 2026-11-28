// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { domainCenterService } from '../domainService';
import { downloadCertificateArtifact } from '../domainCertificateArtifact';
import { DomainCertificatesPage } from './DomainCertificatesPage';

vi.mock('react-i18next', () => {
  const translate = (
    key: string,
    fallbackOrOptions?: string | { defaultValue?: string },
    options?: Record<string, unknown>,
  ): string => {
    const optionsObject =
      fallbackOrOptions && typeof fallbackOrOptions === 'object' ? fallbackOrOptions : options;
    let template = key;
    if (typeof fallbackOrOptions === 'string') {
      template = fallbackOrOptions;
    } else if (typeof fallbackOrOptions?.defaultValue === 'string') {
      template = fallbackOrOptions.defaultValue;
    }
    return Object.entries(optionsObject ?? {}).reduce(
      (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
      template,
    );
  };
  return { useTranslation: () => ({ t: translate, i18n: { resolvedLanguage: 'en-US' } }) };
});

vi.mock('@sdkwork/cloudroutes-pc-commons', () => ({
  AdminTableShell: ({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  BottomPagination: () => <div data-testid="bottom-pagination" />,
  BusinessStateTableRow: ({ colSpan, title }: { colSpan: number; title: string }) => (
    <tr><td colSpan={colSpan}>{title}</td></tr>
  ),
  ConfirmDialog: () => null,
  resolveProblemMessage: (_cause: unknown, _t: unknown, fallback: string) => fallback,
}));

vi.mock('../hooks/useDomainResources', () => ({
  useDomainZones: () => ({ data: [{ id: 'zone-1', apexHostname: 'example.com' }] }),
  useDomainCloudAccounts: () => ({ data: [] }),
  usableDnsAccounts: () => [],
}));

vi.mock('../domainCertificateArtifact', () => ({
  certificateArtifactErrorKey: () => undefined,
  downloadCertificateArtifact: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../domainService', () => ({
  DomainSdkCapabilityError: class extends Error {},
  domainCenterService: {
    listCertificates: vi.fn(),
    listAllCertificates: vi.fn(),
    listAllHostnames: vi.fn(),
    createCertificate: vi.fn(),
    retrieveCertificateChallenges: vi.fn(),
    verifyCertificateChallenges: vi.fn(),
    retrieveCertificate: vi.fn(),
    retrieveCertificateArtifact: vi.fn(),
  },
}));

const pendingPresentation = {
  presentationMode: 'MANUAL',
  presentationReleased: false,
  items: [
    {
      identifier: '*.example.com',
      recordName: '_acme-challenge.example.com',
      recordType: 'TXT',
      recordValue: 'wildcard-proof',
      status: 'PENDING',
    },
    {
      identifier: 'example.com',
      recordName: '_acme-challenge.example.com',
      recordType: 'TXT',
      recordValue: 'apex-proof',
      status: 'PENDING',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(domainCenterService.listCertificates).mockResolvedValue({
    items: [],
    pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '0', totalPages: 0, hasMore: false },
  } as never);
  vi.mocked(domainCenterService.listAllCertificates).mockResolvedValue([]);
  vi.mocked(domainCenterService.listAllHostnames).mockResolvedValue([
    { hostname: '*.example.com', verificationStatus: 'VERIFIED' },
    { hostname: 'example.com', verificationStatus: 'PENDING' },
  ] as never);
  vi.mocked(domainCenterService.createCertificate).mockResolvedValue({
    id: 'certificate-1',
    currentVersionId: 'version-1',
    certName: '*.example.com',
    identifiers: ['*.example.com', 'example.com'],
    status: 'ISSUING',
    presentationMode: 'MANUAL',
    certificateSource: 'MANAGED',
  } as never);
  vi.mocked(domainCenterService.retrieveCertificateChallenges).mockResolvedValue(pendingPresentation as never);
  vi.mocked(domainCenterService.verifyCertificateChallenges).mockResolvedValue({ accepted: true } as never);
  vi.mocked(domainCenterService.retrieveCertificate).mockResolvedValue({
    id: 'certificate-1',
    currentVersionId: 'version-1',
    certName: '*.example.com',
    identifiers: ['*.example.com', 'example.com'],
    status: 'ACTIVE',
    presentationMode: 'MANUAL',
  } as never);
  vi.mocked(domainCenterService.retrieveCertificateArtifact).mockResolvedValue({
    fileName: 'example.zip',
    mediaType: 'application/zip',
    sizeBytes: '4',
    sha256: '0'.repeat(64),
    contentBase64: 'UEsDBA==',
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(cleanup);

describe('manual certificate issuance', () => {
  it('generates wildcard and apex TXT records, copies them, verifies, and follows issuance to active', async () => {
    render(<DomainCertificatesPage onNavigate={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Issue certificate' }));
    expect(screen.getByRole('radio', { name: /Manual \(I add the TXT record/u })).toBeChecked();
    expect(screen.getByLabelText('DNS zone')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Certificate hostname'), { target: { value: '*.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const input = screen.getByLabelText('Certificate hostname');
    expect(input.parentElement).toHaveClass('min-w-0');
    expect(input).toHaveClass('min-w-0', 'flex-1');
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('shrink-0', 'whitespace-nowrap');
    expect(screen.getByLabelText(/Certificate name/u)).toHaveValue('*.example.com');
    expect(screen.getByLabelText('Certificate scope')).toHaveValue('WILDCARD');

    fireEvent.click(screen.getByRole('button', { name: 'Generate DNS verification records' }));
    expect(await screen.findByText('wildcard-proof')).toBeInTheDocument();
    expect(screen.getByText('apex-proof')).toBeInTheDocument();
    expect(domainCenterService.createCertificate).toHaveBeenCalledWith(expect.objectContaining({
      requestedIdentifiers: ['*.example.com'],
      challengePresentation: 'MANUAL',
      validationMethod: 'DNS_01',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'TXT _acme-challenge "wildcard-proof"\nTXT _acme-challenge "apex-proof"',
    ));

    vi.mocked(domainCenterService.retrieveCertificateChallenges).mockResolvedValue({
      ...pendingPresentation,
      presentationReleased: true,
      items: pendingPresentation.items.map((item) => ({ ...item, status: 'VALID' })),
    } as never);
    fireEvent.click(screen.getByRole('button', { name: 'I published the records — verify' }));

    expect(await screen.findByText('Certificate issued')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download certificate ZIP' }));
    await waitFor(() => expect(domainCenterService.retrieveCertificateArtifact).toHaveBeenCalledWith('certificate-1'));
    expect(downloadCertificateArtifact).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'example.zip' }));
    expect(domainCenterService.verifyCertificateChallenges).toHaveBeenCalledWith('certificate-1');
    expect(domainCenterService.retrieveCertificateChallenges).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(vi.mocked(domainCenterService.listCertificates).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('allows an unverified hostname suggestion in manual DNS-01 mode', async () => {
    render(<DomainCertificatesPage onNavigate={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Issue certificate' }));
    fireEvent.change(screen.getByLabelText('DNS zone'), {
      target: { value: 'zone-1' },
    });

    const suggestion = await screen.findByRole('checkbox', {
      name: /example\.com.*Not pre-verified/u,
    });
    expect(suggestion).toBeEnabled();
    fireEvent.click(suggestion);
    expect(screen.getByLabelText(/Certificate name/u)).toHaveValue('example.com');
  });

  it('downloads an issued certificate from the list and reports failures', async () => {
    vi.mocked(domainCenterService.listCertificates).mockResolvedValue({
      items: [{
        id: 'certificate-1',
        currentVersionId: 'version-1',
        certName: 'example.com',
        identifiers: ['example.com'],
        issuer: "Let's Encrypt",
        status: 'ACTIVE',
        presentationMode: 'MANUAL',
        certificateSource: 'MANAGED',
        caProfile: 'LETS_ENCRYPT_PRODUCTION',
        certificateScope: 'SINGLE_DOMAIN',
        validationMethod: 'DNS_01',
        preferredKeyAlgorithm: 'RSA',
        renewalStatus: 'NONE',
        autoRenew: true,
      }],
      pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '1', totalPages: 1, hasMore: false },
    } as never);
    render(<DomainCertificatesPage onNavigate={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download certificate ZIP' }));
    await waitFor(() => expect(downloadCertificateArtifact).toHaveBeenCalledOnce());
    expect(await screen.findByText('Certificate ZIP downloaded.')).toBeInTheDocument();

    vi.mocked(downloadCertificateArtifact).mockRejectedValueOnce(new Error('download failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Download certificate ZIP' }));
    expect(await screen.findByText('Certificate ZIP could not be downloaded')).toBeInTheDocument();
  });
});
