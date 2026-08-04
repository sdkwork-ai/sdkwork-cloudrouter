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
});
