import { describe, expect, it } from 'vitest';

import {
  DOMAIN_VERIFICATION_PLATFORMS,
  domainVerificationPlatform,
  isServableVerificationFileName,
  platformAcceptsExtension,
  suggestVerificationFileName,
  verificationFileContentType,
  verificationFileExtension,
  verificationFilePublicUrl,
} from './domainVerificationPlatforms';

/**
 * The console's platform catalog must mirror `sdkwork-deployments`
 * (`verification_file_catalog.rs`), which the server validates against. A code
 * that exists here and not there is an option the server refuses; a shape that
 * differs here prefills a file name the platform never fetches.
 */
describe('domain verification platform catalog', () => {
  it('is the closed set the control plane accepts', () => {
    expect(DOMAIN_VERIFICATION_PLATFORMS.map((spec) => spec.platform)).toEqual([
      'WECHAT_OFFICIAL_ACCOUNT',
      'WECHAT_MINI_PROGRAM',
      'ALIPAY',
      'BYTEDANCE',
      'APPLE',
      'GOOGLE',
      'CUSTOM',
    ]);
    expect(domainVerificationPlatform('DOUYIN')).toBeUndefined();
    for (const spec of DOMAIN_VERIFICATION_PLATFORMS) {
      expect(spec.issuedByKey).toContain(spec.platform);
      expect(spec.fileNameHint.toLowerCase()).toContain(`.${spec.extension}`);
    }
  });

  it('derives the file name each platform will fetch', () => {
    expect(suggestVerificationFileName('WECHAT_OFFICIAL_ACCOUNT', 'abc123')).toBe(
      'MP_verify_abc123.txt',
    );
    expect(suggestVerificationFileName('WECHAT_MINI_PROGRAM', 'abc123')).toBe(
      'MP_verify_abc123.txt',
    );
    expect(suggestVerificationFileName('ALIPAY', 'token')).toBe('token.txt');
    expect(suggestVerificationFileName('BYTEDANCE', 'token')).toBe('token.txt');
    expect(suggestVerificationFileName('APPLE', 'ignored')).toBe(
      'apple-developer-domain-association.txt',
    );
    expect(suggestVerificationFileName('GOOGLE', 'google123')).toBe('google123.html');
    // A pasted name that already carries the right shape is not double-suffixed.
    expect(suggestVerificationFileName('GOOGLE', 'google123.html')).toBe('google123.html');
    expect(suggestVerificationFileName('WECHAT_OFFICIAL_ACCOUNT', '   ')).toBeUndefined();
    expect(suggestVerificationFileName('UNKNOWN', 'token')).toBeUndefined();
  });

  it('keeps each platform to its own extension', () => {
    expect(platformAcceptsExtension('WECHAT_OFFICIAL_ACCOUNT', 'txt')).toBe(true);
    expect(platformAcceptsExtension('WECHAT_OFFICIAL_ACCOUNT', 'html')).toBe(false);
    expect(platformAcceptsExtension('GOOGLE', 'html')).toBe(true);
    expect(platformAcceptsExtension('GOOGLE', 'txt')).toBe(false);
    expect(platformAcceptsExtension('CUSTOM', 'txt')).toBe(true);
    expect(platformAcceptsExtension('CUSTOM', 'html')).toBe(true);
    expect(platformAcceptsExtension('CUSTOM', 'xml')).toBe(true);
    expect(platformAcceptsExtension('CUSTOM', 'js')).toBe(false);
  });

  it('recognises only names the edge will serve', () => {
    expect(isServableVerificationFileName('MP_verify_abc.txt')).toBe(true);
    expect(isServableVerificationFileName('google123.html')).toBe(true);
    expect(isServableVerificationFileName('SiteAuth.xml')).toBe(true);
    expect(isServableVerificationFileName('MP_verify_abc.txt/')).toBe(false);
    expect(isServableVerificationFileName('dir/MP_verify_abc.txt')).toBe(false);
    expect(isServableVerificationFileName('app.js')).toBe(false);
    expect(isServableVerificationFileName('')).toBe(false);
    expect(verificationFileExtension('MP_verify_abc.txt')).toBe('txt');
    expect(verificationFileExtension('no-extension')).toBe('');
  });

  it('answers with the content type the edge sends', () => {
    expect(verificationFileContentType('MP_verify_abc.txt')).toBe('text/plain; charset=utf-8');
    expect(verificationFileContentType('google123.html')).toBe('text/html; charset=utf-8');
    expect(verificationFileContentType('SiteAuth.xml')).toBe('application/xml; charset=utf-8');
  });

  it('builds the public URL the platform fetches', () => {
    expect(verificationFilePublicUrl('example.com', 'MP_verify_abc.txt')).toBe(
      'https://example.com/MP_verify_abc.txt',
    );
  });
});
