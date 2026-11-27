// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CertificateArtifactError,
  decodeCertificateArtifact,
  downloadCertificateArtifact,
} from './domainCertificateArtifact';
import type { DomainCertificateArtifact } from './domainTypes';

const artifact: DomainCertificateArtifact = {
  fileName: '../example certificate.zip',
  mediaType: 'application/zip',
  sizeBytes: '4',
  sha256: '0'.repeat(64),
  contentBase64: 'UEsDBA==',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('certificate artifact download', () => {
  it('decodes base64 archive bytes', () => {
    expect(Array.from(decodeCertificateArtifact(artifact.contentBase64))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('rejects malformed base64', () => {
    expect(() => decodeCertificateArtifact('not-base64!')).toThrow(CertificateArtifactError);
  });

  it('rejects non-ZIP, truncated, and unsafe-size payloads', async () => {
    await expect(downloadCertificateArtifact({
      ...artifact,
      mediaType: 'text/plain' as DomainCertificateArtifact['mediaType'],
    })).rejects.toThrow('media type is not ZIP');
    await expect(downloadCertificateArtifact({ ...artifact, sizeBytes: '99' }))
      .rejects.toThrow('size does not match');
    await expect(downloadCertificateArtifact({ ...artifact, sizeBytes: '9007199254740992' }))
      .rejects.toThrow('size does not match');
  });

  it('fails closed when Web Crypto cannot verify the checksum', async () => {
    vi.stubGlobal('crypto', {});
    await expect(downloadCertificateArtifact(artifact)).rejects.toThrow('cannot verify');
  });

  it('verifies the checksum when Web Crypto is available', async () => {
    vi.stubGlobal('crypto', {
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) },
    });
    await expect(downloadCertificateArtifact(artifact)).resolves.toBeUndefined();
  });

  it('rejects a checksum mismatch before creating a download', async () => {
    const createObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
    });
    vi.stubGlobal('crypto', {
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).fill(1).buffer) },
    });
    await expect(downloadCertificateArtifact(artifact)).rejects.toThrow('checksum does not match');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('downloads a sanitized ZIP filename and revokes the object URL', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('crypto', {
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) },
    });
    const createObjectURL = vi.fn().mockReturnValue('blob:certificate');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await downloadCertificateArtifact(artifact);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toHaveAttribute('download', '.._example_certificate.zip');
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:certificate');
    vi.useRealTimers();
  });
});
