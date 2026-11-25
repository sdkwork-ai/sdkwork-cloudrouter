/**
 * The platform catalog for domain-ownership verification files.
 *
 * Every platform that asks an operator to prove domain control by publishing a
 * file at the domain root issues that file itself, and the shapes differ: WeChat
 * hands out `MP_verify_<token>.txt` for both the official account and the mini
 * program, Alipay and ByteDance hand out `<token>.txt`, Google hands out a
 * `<token>.html`, Apple always wants `apple-developer-domain-association.txt`.
 *
 * This module mirrors the authoritative catalog in
 * `sdkwork-deployments` (`crates/sdkwork-deploy-contract/src/verification_file_catalog.rs`).
 * The wire codes are the contract's closed enum; the naming rules are the ones
 * the server enforces, so the console prefills a name the platform will actually
 * fetch instead of letting an operator register one it never will.
 */

import type { DomainVerificationFilePlatform } from './domainTypes';

/** One platform's verification-file contract. */
export interface DomainVerificationPlatformSpec {
  platform: DomainVerificationFilePlatform;
  /** File name the platform issues, e.g. `MP_verify_<token>.txt`. */
  fileNameHint: string;
  /** Fixed file name the platform always issues, when it has one. */
  fixedFileName?: string;
  /** Prefix the platform puts before its token (`MP_verify_`), when it does. */
  tokenPrefix?: string;
  /** Extension the platform's file always has. */
  extension: 'txt' | 'html' | 'xml';
  /** Where the operator obtains the file. */
  issuedByKey: string;
}

const issuedBy = (platform: DomainVerificationFilePlatform): string =>
  `admin.domainCenter.verificationFiles.issuedBy.${platform}`;

/** Every platform the control plane, the edge, and this console accept. */
export const DOMAIN_VERIFICATION_PLATFORMS: readonly DomainVerificationPlatformSpec[] = [
  {
    platform: 'WECHAT_OFFICIAL_ACCOUNT',
    fileNameHint: 'MP_verify_<token>.txt',
    tokenPrefix: 'MP_verify_',
    extension: 'txt',
    issuedByKey: issuedBy('WECHAT_OFFICIAL_ACCOUNT'),
  },
  {
    platform: 'WECHAT_MINI_PROGRAM',
    fileNameHint: 'MP_verify_<token>.txt',
    tokenPrefix: 'MP_verify_',
    extension: 'txt',
    issuedByKey: issuedBy('WECHAT_MINI_PROGRAM'),
  },
  {
    platform: 'ALIPAY',
    fileNameHint: '<token>.txt',
    extension: 'txt',
    issuedByKey: issuedBy('ALIPAY'),
  },
  {
    platform: 'BYTEDANCE',
    fileNameHint: '<token>.txt',
    extension: 'txt',
    issuedByKey: issuedBy('BYTEDANCE'),
  },
  {
    platform: 'APPLE',
    fileNameHint: 'apple-developer-domain-association.txt',
    fixedFileName: 'apple-developer-domain-association.txt',
    extension: 'txt',
    issuedByKey: issuedBy('APPLE'),
  },
  {
    platform: 'GOOGLE',
    fileNameHint: '<token>.html',
    extension: 'html',
    issuedByKey: issuedBy('GOOGLE'),
  },
  {
    platform: 'CUSTOM',
    fileNameHint: '<file>.txt | <file>.html | <file>.xml',
    extension: 'txt',
    issuedByKey: issuedBy('CUSTOM'),
  },
];

/** Extensions the edge knows how to answer. */
export const DOMAIN_VERIFICATION_FILE_EXTENSIONS = ['txt', 'html', 'xml'] as const;

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(txt|html|xml)$/;

/** The platform's spec, or `undefined` for a code outside the closed set. */
export function domainVerificationPlatform(
  code: string | undefined,
): DomainVerificationPlatformSpec | undefined {
  if (!code) {
    return undefined;
  }
  return DOMAIN_VERIFICATION_PLATFORMS.find((spec) => spec.platform === code);
}

/** Whether the edge will serve `fileName` (single ASCII segment, known extension). */
export function isServableVerificationFileName(fileName: string): boolean {
  return NAME_PATTERN.test(fileName.trim()) && fileName.trim().length <= 128;
}

/** The file's extension, without the dot; `''` when it has none. */
export function verificationFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  return dot < 0 ? '' : trimmed.slice(dot + 1).toLowerCase();
}

/** `Content-Type` the edge answers with, by extension. */
export function verificationFileContentType(fileName: string): string {
  switch (verificationFileExtension(fileName)) {
    case 'html':
      return 'text/html; charset=utf-8';
    case 'xml':
      return 'application/xml; charset=utf-8';
    default:
      return 'text/plain; charset=utf-8';
  }
}

/** Whether the platform's own file can have `extension`. */
export function platformAcceptsExtension(platform: string, extension: string): boolean {
  const spec = domainVerificationPlatform(platform);
  if (!spec) {
    return false;
  }
  if (spec.platform === 'CUSTOM') {
    return (DOMAIN_VERIFICATION_FILE_EXTENSIONS as readonly string[]).includes(extension);
  }
  return spec.extension === extension;
}

/**
 * The file name the platform will fetch for the token it issued.
 *
 * A fixed-name platform ignores the token; otherwise the token is prefixed when
 * the platform's shape says so. A pasted name that already has the right shape
 * is returned verbatim rather than double-suffixed.
 */
export function suggestVerificationFileName(
  platform: string,
  token: string,
): string | undefined {
  const spec = domainVerificationPlatform(platform);
  if (!spec) {
    return undefined;
  }
  if (spec.fixedFileName) {
    return spec.fixedFileName;
  }
  const trimmed = token.trim();
  if (!trimmed) {
    return undefined;
  }
  const extension = verificationFileExtension(trimmed);
  if (isServableVerificationFileName(trimmed) && platformAcceptsExtension(platform, extension)) {
    return trimmed;
  }
  const stem = spec.tokenPrefix ? `${spec.tokenPrefix}${trimmed}` : trimmed;
  return `${stem}.${spec.extension}`;
}

/** The public URL a platform (or an operator) fetches the file from. */
export function verificationFilePublicUrl(apexHostname: string, fileName: string): string {
  return `https://${apexHostname}/${fileName}`;
}

/**
 * Reads a picked file into the form. Refuses anything the server would refuse,
 * so the operator learns here instead of after a round trip.
 */
export function readPickedVerificationFile(
  file: File,
  platform: string,
  maxBytes = 4096,
): Promise<{ fileName: string; content: string } | { error: string }> {
  return new Promise((resolve) => {
    if (file.size > maxBytes) {
      resolve({ error: 'admin.domainCenter.verificationFiles.fileTooLarge' });
      return;
    }
    if (!isServableVerificationFileName(file.name)) {
      resolve({ error: 'admin.domainCenter.validation.invalidVerificationFileName' });
      return;
    }
    const extension = verificationFileExtension(file.name);
    if (!platformAcceptsExtension(platform, extension)) {
      resolve({ error: 'admin.domainCenter.validation.verificationFilePlatformExtension' });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      resolve({ error: 'admin.domainCenter.verificationFiles.fileReadFailed' });
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content) {
        resolve({ error: 'admin.domainCenter.validation.required' });
        return;
      }
      resolve({ fileName: file.name, content });
    };
    reader.readAsText(file);
  });
}
