import type { DomainCertificateArtifact } from './domainTypes';

export type CertificateArtifactErrorCode =
  | 'invalidBase64'
  | 'invalidMediaType'
  | 'sizeMismatch'
  | 'checksumUnavailable'
  | 'checksumMismatch'
  | 'downloadUnsupported';

export class CertificateArtifactError extends Error {
  readonly code: CertificateArtifactErrorCode;

  constructor(code: CertificateArtifactErrorCode, message: string) {
    super(message);
    this.name = 'CertificateArtifactError';
    this.code = code;
  }
}

export function certificateArtifactErrorKey(cause: unknown): string | undefined {
  if (!(cause instanceof CertificateArtifactError)) {
    return undefined;
  }
  return `admin.domainCenter.certificates.artifact.errors.${cause.code}`;
}

export function decodeCertificateArtifact(contentBase64: string): Uint8Array {
  try {
    const binary = globalThis.atob(contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new CertificateArtifactError('invalidBase64', 'The certificate archive content is not valid base64.');
  }
}

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', arrayBufferOf(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function downloadCertificateArtifact(
  artifact: DomainCertificateArtifact,
): Promise<void> {
  if (artifact.mediaType !== 'application/zip') {
    throw new CertificateArtifactError('invalidMediaType', 'The certificate archive media type is not ZIP.');
  }
  const bytes = decodeCertificateArtifact(artifact.contentBase64);
  const expectedSize = Number(artifact.sizeBytes);
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0 || bytes.byteLength !== expectedSize) {
    throw new CertificateArtifactError('sizeMismatch', 'The certificate archive size does not match its metadata.');
  }
  if (!globalThis.crypto?.subtle) {
    throw new CertificateArtifactError('checksumUnavailable', 'This browser cannot verify the certificate archive checksum.');
  }
  const digest = await sha256Hex(bytes);
  if (digest !== artifact.sha256.toLowerCase()) {
    throw new CertificateArtifactError('checksumMismatch', 'The certificate archive checksum does not match its metadata.');
  }
  if (typeof URL.createObjectURL !== 'function') {
    throw new CertificateArtifactError('downloadUnsupported', 'This browser cannot download the certificate archive.');
  }

  const blob = new Blob([arrayBufferOf(bytes)], { type: artifact.mediaType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = artifact.fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  anchor.href = url;
  anchor.download = safeName.endsWith('.zip') ? safeName : `${safeName || 'certificate'}.zip`;
  anchor.style.display = 'none';
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
