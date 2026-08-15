import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_SETTINGS, toSiteSettings } from './SiteSettingsService';

describe('site settings compliance defaults', () => {
  it('keeps filing fields empty until an operator configures verified values', () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      icpRecordNumber: '',
      icpRecordUrl: '',
      policeRecordNumber: '',
      policeRecordUrl: '',
    });
  });

  it('does not synthesize filing identifiers for an incomplete backend record', () => {
    expect(toSiteSettings({ siteName: 'Router Operations' })).toMatchObject({
      siteName: 'Router Operations',
      icpRecordNumber: '',
      icpRecordUrl: '',
      policeRecordNumber: '',
      policeRecordUrl: '',
    });
  });

  it('maps configured QR code media resources from the backend record', () => {
    expect(
      toSiteSettings({
        siteName: 'Router Operations',
        officialAccountQrCode: {
          kind: 'image',
          source: 'external_url',
          publicUrl: 'https://example.com/official-account-qr.png',
        },
        communityGroupQrCode: {
          kind: 'image',
          source: 'external_url',
          publicUrl: 'https://example.com/community-group-qr.png',
        },
      }),
    ).toMatchObject({
      officialAccountQrCode: {
        kind: 'image',
        source: 'external_url',
        publicUrl: 'https://example.com/official-account-qr.png',
      },
      communityGroupQrCode: {
        kind: 'image',
        source: 'external_url',
        publicUrl: 'https://example.com/community-group-qr.png',
      },
    });
  });

  it('keeps QR code fields unset when the backend record has none', () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      officialAccountQrCode: undefined,
      communityGroupQrCode: undefined,
    });
    expect(toSiteSettings({ siteName: 'Router Operations' })).toMatchObject({
      officialAccountQrCode: undefined,
      communityGroupQrCode: undefined,
    });
  });
});
