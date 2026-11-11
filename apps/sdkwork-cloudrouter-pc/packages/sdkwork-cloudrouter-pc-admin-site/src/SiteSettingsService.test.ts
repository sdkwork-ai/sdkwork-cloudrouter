import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRAND_LOGO_URL,
  driveUploadImageValueToCloudRouterMediaResource,
  readDriveShareToken,
  readMediaResourceUrl,
  resolveBrandLogoUrl,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { FOOTER_SECTIONS, SOCIAL_PLATFORMS } from '@sdkwork/cloudroutes-pc-commons/footer-settings';
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_I18N_FIELDS,
  SITE_SETTINGS_LOCALES,
  siteSettingsI18nFieldFor,
  toSiteSettings,
  toSiteSettingsUpdateRequest,
} from './SiteSettingsService';
import {
  CATEGORY_FIELDS,
  findDuplicatedSiteSettingsFields,
  findUnreachableSiteSettingsFields,
} from './siteSettingsCategories';
import { createDefaultHomeContentForm } from './siteContentFields';
import {
  ADMIN_MODULE_IDS,
  createDefaultAdminModuleSettings,
  getAdminModuleHeaderIds,
  reorderAdminModuleSetting,
  updateAdminModuleSetting,
  validateAdminModuleSettings,
} from '@sdkwork/cloudroutes-pc-commons/admin-modules';

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
        videoChannelQrCode: {
          kind: 'image',
          source: 'external_url',
          publicUrl: 'https://example.com/video-channel-qr.png',
        },
        douyinQrCode: {
          kind: 'image',
          source: 'external_url',
          publicUrl: 'https://example.com/douyin-qr.png',
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
      videoChannelQrCode: {
        kind: 'image',
        source: 'external_url',
        publicUrl: 'https://example.com/video-channel-qr.png',
      },
      douyinQrCode: {
        kind: 'image',
        source: 'external_url',
        publicUrl: 'https://example.com/douyin-qr.png',
      },
    });
  });

  it('keeps QR code fields unset when the backend record has none', () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      officialAccountQrCode: undefined,
      communityGroupQrCode: undefined,
      videoChannelQrCode: undefined,
      douyinQrCode: undefined,
    });
    expect(toSiteSettings({ siteName: 'Router Operations' })).toMatchObject({
      officialAccountQrCode: undefined,
      communityGroupQrCode: undefined,
      videoChannelQrCode: undefined,
      douyinQrCode: undefined,
    });
  });

  it('shows every follow channel until an operator switches one off', () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      officialAccountQrCodeEnabled: true,
      communityGroupQrCodeEnabled: true,
      videoChannelQrCodeEnabled: true,
      douyinQrCodeEnabled: true,
    });
    // A backend record that predates the toggles must not read as "hidden" — an absent
    // boolean falls back to the seeded default, matching the backend's own default.
    expect(toSiteSettings({ siteName: 'Router Operations' })).toMatchObject({
      officialAccountQrCodeEnabled: true,
      communityGroupQrCodeEnabled: true,
      videoChannelQrCodeEnabled: true,
      douyinQrCodeEnabled: true,
    });
  });

  it('preserves an explicit off switch instead of falling back to the default', () => {
    expect(
      toSiteSettings({
        siteName: 'Router Operations',
        officialAccountQrCodeEnabled: false,
        communityGroupQrCodeEnabled: false,
        videoChannelQrCodeEnabled: false,
        douyinQrCodeEnabled: false,
      }),
    ).toMatchObject({
      officialAccountQrCodeEnabled: false,
      communityGroupQrCodeEnabled: false,
      videoChannelQrCodeEnabled: false,
      douyinQrCodeEnabled: false,
    });
  });
});

describe('footer configuration is reachable and complete', () => {
  it('surfaces every form field from exactly one sidebar category', () => {
    // A field with no category would be visible in the payload but unreachable in the UI, and a
    // field in two categories would be counted twice in the unsaved badges. Both are silent.
    expect(findUnreachableSiteSettingsFields()).toEqual([]);
    expect(findDuplicatedSiteSettingsFields()).toEqual([]);
  });

  it('puts the whole follow-us row and every footer region on a tab', () => {
    expect(CATEGORY_FIELDS.social).toHaveLength(SOCIAL_PLATFORMS.length * 2);
    expect(CATEGORY_FIELDS.footerLayout).toHaveLength(FOOTER_SECTIONS.length);
    // The social tab must carry both halves of every platform pair, not just the switches.
    for (const platform of SOCIAL_PLATFORMS) {
      const suffix = platform.code[0].toUpperCase() + platform.code.slice(1);
      expect(CATEGORY_FIELDS.social).toContain(`footerSocial${suffix}Enabled`);
      expect(CATEGORY_FIELDS.social).toContain(`footerSocial${suffix}Url`);
    }
  });
});

describe('follow-us configuration', () => {
  it('reads the platforms the operator switched on and the links they set', () => {
    const settings = toSiteSettings({
      siteName: 'Router Operations',
      footerSocialGithubEnabled: false,
      footerSocialGithubUrl: '',
      footerSocialWeiboEnabled: true,
      footerSocialWeiboUrl: 'https://weibo.com/sdkwork',
    });

    expect(settings.footerSocialGithubEnabled).toBe(false);
    expect(settings.footerSocialGithubUrl).toBe('');
    expect(settings.footerSocialWeiboEnabled).toBe(true);
    expect(settings.footerSocialWeiboUrl).toBe('https://weibo.com/sdkwork');
  });

  it('falls back to the shipped defaults for a payload written before the footer was composable', () => {
    const settings = toSiteSettings({ siteName: 'Router Operations' });

    // Every region rendered before it became switchable, and the four hardcoded links must still
    // render, so an upgrade changes nothing until an operator edits the page.
    for (const section of FOOTER_SECTIONS) {
      expect(settings[section.field as keyof typeof settings]).toBe(true);
    }
    expect(settings.footerSocialGithubEnabled).toBe(true);
    expect(settings.footerSocialGithubUrl).toBe('https://github.com/sdkwork-ai');
    expect(settings.footerSocialEmailUrl).toBe('mailto:contact@sdkwork.com');
    // Platforms that were never hardcoded stay off rather than inheriting a fabricated link.
    expect(settings.footerSocialWeiboEnabled).toBe(false);
    expect(settings.footerSocialWeiboUrl).toBe('');
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      footerSocialGithubEnabled: true,
      footerSocialWeiboEnabled: false,
      footerBrandEnabled: true,
      footerLegalEnabled: true,
    });
  });
});

describe('site settings save payload', () => {
  it('sends every footer field, including the platforms nobody touched', () => {
    const payload = toSiteSettingsUpdateRequest({
      ...DEFAULT_SITE_SETTINGS,
      footerSocialGithubEnabled: false,
      footerSocialGithubUrl: '',
      footerSocialBilibiliEnabled: true,
      footerSocialBilibiliUrl: 'https://space.bilibili.com/7',
      footerBrandEnabled: false,
    });

    const sent = payload as unknown as Record<string, unknown>;
    // The update endpoint applies whichever keys are present, so a field left out of the payload
    // would let the previously stored value survive — switching something off would not stick.
    for (const section of FOOTER_SECTIONS) {
      expect(sent).toHaveProperty(section.field);
    }
    for (const platform of SOCIAL_PLATFORMS) {
      const suffix = platform.code[0].toUpperCase() + platform.code.slice(1);
      expect(sent).toHaveProperty(`footerSocial${suffix}Enabled`);
      expect(sent).toHaveProperty(`footerSocial${suffix}Url`);
    }
    expect(sent.footerSocialGithubEnabled).toBe(false);
    expect(sent.footerSocialBilibiliEnabled).toBe(true);
    expect(sent.footerSocialBilibiliUrl).toBe('https://space.bilibili.com/7');
    expect(sent.footerBrandEnabled).toBe(false);
  });
});

describe('site settings translations', () => {
  it('reads every per-locale override off the backend record', () => {
    const settings = toSiteSettings({
      siteName: 'Cloud Router',
      siteNameI18n: { 'zh-CN': '云路由', 'ja-JP': 'クラウドルーター' },
      footerCopyrightI18n: { 'zh-CN': '版权所有' },
    });

    expect(settings.siteNameI18n).toEqual({ 'zh-CN': '云路由', 'ja-JP': 'クラウドルーター' });
    expect(settings.footerCopyrightI18n).toEqual({ 'zh-CN': '版权所有' });
    // A field the operator never translated reads as empty rather than as a missing key, so the
    // editor and the "unsaved changes" comparison both treat it as "publish the base copy".
    expect(settings.descriptionI18n).toEqual({});
  });

  it('drops locale keys the backend would reject and translations that are blank', () => {
    const settings = toSiteSettings({
      siteNameI18n: {
        'zh-CN': '云路由',
        // The backend folds aliases and rejects anything outside the canonical set; keeping either
        // in the form would show a translation that never renders.
        'zh-HK': '雲路由',
        fr: 'Routeur',
        'de-DE': '   ',
        'ja-JP': '  クラウドルーター  ',
      },
    });

    expect(settings.siteNameI18n).toEqual({ 'zh-CN': '云路由', 'ja-JP': 'クラウドルーター' });
  });

  it('ignores a malformed override map instead of throwing', () => {
    // Serde would have rejected this, but the form also runs against a payload written by an older
    // build, where the field was absent or held a scalar.
    const settings = toSiteSettings({ siteNameI18n: '云路由', descriptionI18n: ['x'] });
    expect(settings.siteNameI18n).toEqual({});
    expect(settings.descriptionI18n).toEqual({});
  });

  it('sends every override map, so clearing one language sticks', () => {
    const payload = toSiteSettingsUpdateRequest({
      ...DEFAULT_SITE_SETTINGS,
      siteNameI18n: { 'zh-CN': '云路由' },
      footerCopyrightI18n: { 'ja-JP': '無断転載を禁じます' },
    });

    const sent = payload as unknown as Record<string, unknown>;
    // Same reasoning as the footer fields: the endpoint replaces whichever maps are present, so a
    // map left out of the payload would let the stored translations survive a clear.
    for (const { i18nField } of SITE_SETTINGS_I18N_FIELDS) {
      expect(sent).toHaveProperty(i18nField);
    }
    expect(sent.siteNameI18n).toEqual({ 'zh-CN': '云路由' });
    // Untranslated fields go out as an empty map rather than being omitted.
    expect(sent.descriptionI18n).toEqual({});
    expect(sent.footerCopyrightI18n).toEqual({ 'ja-JP': '無断転載を禁じます' });
  });

  it('never sends a blank override, which would be indistinguishable from none', () => {
    const payload = toSiteSettingsUpdateRequest({
      ...DEFAULT_SITE_SETTINGS,
      siteNameI18n: { 'zh-CN': '  ', 'fr-FR': 'Routeur' },
    });

    const sent = payload as unknown as Record<string, unknown>;
    expect(sent.siteNameI18n).toEqual({ 'fr-FR': 'Routeur' });
  });

  it('pairs every translated copy field with exactly one override map', () => {
    const maps = SITE_SETTINGS_I18N_FIELDS.map(({ i18nField }) => i18nField);
    expect(new Set(maps).size).toBe(maps.length);
    // The lookup the form and the reachability gate both use must resolve every pair, including
    // for a field that is not translatable.
    for (const { field, i18nField } of SITE_SETTINGS_I18N_FIELDS) {
      expect(siteSettingsI18nFieldFor(field)).toBe(i18nField);
    }
    expect(siteSettingsI18nFieldFor('brandColor' as never)).toBeUndefined();
  });

  it('starts every locale untranslated', () => {
    // An operator who never opened the page must publish exactly the base copy in every language.
    for (const { i18nField } of SITE_SETTINGS_I18N_FIELDS) {
      expect(DEFAULT_SITE_SETTINGS[i18nField]).toEqual({});
    }
    expect(SITE_SETTINGS_LOCALES.length).toBeGreaterThan(1);
  });
});

describe('site settings documents', () => {
  it('starts the homepage and download documents empty, which is what an untouched deployment already renders', () => {
    // An empty homepage publishes the bundled copy and an empty catalog publishes the one checked
    // into the repository, so a deployment nobody has configured renders exactly what it shipped.
    expect(DEFAULT_SITE_SETTINGS.homepage.productName).toBe('');
    expect(DEFAULT_SITE_SETTINGS.homepage.tagline).toBe('');
    expect(DEFAULT_SITE_SETTINGS.homepage.heroStats).toEqual([]);
    expect(DEFAULT_SITE_SETTINGS.homepage.sections).toEqual({
      cta: true,
      download: true,
      features: true,
      hero: true,
      models: true,
      modalities: true,
    });
    expect(DEFAULT_SITE_SETTINGS.downloads).toBe('');
    // Unlike the content documents, the module manager starts in the same fully-populated
    // state an untouched deployment renders: every module on, in catalog order.
    expect(DEFAULT_SITE_SETTINGS.adminModules).toEqual(createDefaultAdminModuleSettings());
    expect(DEFAULT_SITE_SETTINGS.adminModules.modules.map((entry) => entry.id)).toEqual(ADMIN_MODULE_IDS);
  });

  it('reads a published admin module document and preserves its order and switches', () => {
    const settings = toSiteSettings({
      siteName: 'Router Operations',
      adminModules: {
        version: 1,
        modules: [
          { id: 'operations', enabled: true, visible: true },
          { id: 'home', enabled: false, visible: true },
        ],
      },
    });

    expect(settings.adminModules.modules[0]).toEqual({ id: 'operations', enabled: true, visible: true });
    expect(settings.adminModules.modules[1]).toEqual({ id: 'home', enabled: false, visible: true });
    // Entries the payload did not mention are appended, enabled and visible, so a portal
    // upgrade that adds a module does not need a second migration.
    expect(settings.adminModules.modules.map((entry) => entry.id)).toEqual([
      'operations',
      'home',
      ...ADMIN_MODULE_IDS.filter((id) => id !== 'operations' && id !== 'home'),
    ]);
  });

  it('round-trips the admin module document through the save payload', () => {
    const authored = {
      ...DEFAULT_SITE_SETTINGS,
      adminModules: {
        version: 1 as const,
        modules: [
          { id: 'notifyCenter' as const, enabled: true, visible: false },
          { id: 'home' as const, enabled: true, visible: true },
        ],
      },
    };
    const payload = toSiteSettingsUpdateRequest(authored) as unknown as Record<string, unknown>;

    const sentModules = (payload.adminModules as { modules: Array<Record<string, unknown>> }).modules;
    expect(sentModules.slice(0, 2)).toEqual([
      { id: 'notifyCenter', enabled: true, visible: false },
      { id: 'home', enabled: true, visible: true },
    ]);
    // Every catalog module is still present; the payload is a full document, not a partial patch.
    expect(sentModules).toHaveLength(ADMIN_MODULE_IDS.length);
    expect(
      toSiteSettings({ ...payload, siteName: 'Router Operations' }).adminModules.modules[0],
    ).toEqual({ id: 'notifyCenter', enabled: true, visible: false });
  });

  it('blocks a document that would remove the only way back to this page', () => {
    const noVisible = createDefaultAdminModuleSettings();
    noVisible.modules = noVisible.modules.map((entry) => ({ ...entry, visible: false }));
    expect(validateAdminModuleSettings(noVisible)).toContain('noVisibleModules');

    const operationsDisabled = createDefaultAdminModuleSettings();
    operationsDisabled.modules = operationsDisabled.modules.map((entry) => (
      entry.id === 'operations' ? { ...entry, enabled: false } : entry
    ));
    expect(validateAdminModuleSettings(operationsDisabled)).toContain('requiredModuleDisabled');
  });

  it('reorders a module without mutating the document or dropping disabled entries', () => {
    const original = createDefaultAdminModuleSettings();
    const reordered = reorderAdminModuleSetting(original, 'operations', 'home');

    expect(original.modules.map((entry) => entry.id)).toEqual(ADMIN_MODULE_IDS);
    expect(reordered.modules.map((entry) => entry.id)[0]).toBe('operations');
    expect(reordered.modules).toHaveLength(ADMIN_MODULE_IDS.length);
  });

  it('derives the header order from the saved document and leaves disabled modules out', () => {
    let settings = reorderAdminModuleSetting(createDefaultAdminModuleSettings(), 'operations', 'home');
    settings = updateAdminModuleSetting(settings, 'home', { enabled: false });
    settings = updateAdminModuleSetting(settings, 'iam', { visible: false });

    const header = getAdminModuleHeaderIds(settings);
    expect(header[0]).toBe('operations');
    expect(header).not.toContain('home');
    expect(header).not.toContain('iam');
    expect(header).toHaveLength(ADMIN_MODULE_IDS.length - 2);
  });

  it('hands every load its own editor state', () => {
    // The page's initial state is `DEFAULT_SITE_SETTINGS`, one object shared by every mount, so the
    // factory has to hand out fresh nested values — otherwise one operator's edit becomes the next
    // one's default.
    const first = createDefaultHomeContentForm();
    first.sections.hero = false;
    first.heroStats.push({ label: 'Vendors', value: '12' });

    const second = createDefaultHomeContentForm();
    expect(second.sections.hero).toBe(true);
    expect(second.heroStats).toEqual([]);
  });

  it('sends an untouched homepage and an empty catalog as empty documents', () => {
    const payload = toSiteSettingsUpdateRequest(DEFAULT_SITE_SETTINGS) as unknown as Record<string, unknown>;

    // `{}` is what the runtime reads as "publish the bundled copy" and "publish the bundled
    // catalog"; anything else here would pin content the operator never authored.
    expect(payload.homepage).toEqual({});
    expect(payload.downloads).toEqual({});
  });

  it('reads the published documents back into the editor', () => {
    const settings = toSiteSettings({
      siteName: 'Router Operations',
      homepage: { hero: { badge: 'New' }, productName: 'CloudRouter', sections: { cta: false } },
      downloads: { cards: [{ id: 'desktop' }], product: { id: 'p', name: 'n', version: '1.0.0' } },
    });

    expect(settings.homepage.productName).toBe('CloudRouter');
    expect(settings.homepage.heroBadge).toBe('New');
    expect(settings.homepage.sections.cta).toBe(false);
    // A region the payload does not mention keeps rendering.
    expect(settings.homepage.sections.hero).toBe(true);
    expect(JSON.parse(settings.downloads)).toMatchObject({ product: { version: '1.0.0' } });
  });

  it('round-trips an authored homepage through the save payload', () => {
    const authored = { ...DEFAULT_SITE_SETTINGS, homepage: { ...createDefaultHomeContentForm(), tagline: 'One gateway' } };
    const payload = toSiteSettingsUpdateRequest(authored) as unknown as Record<string, unknown>;

    expect(payload.homepage).toEqual({ tagline: 'One gateway' });
    expect(toSiteSettings({ ...payload, siteName: 'Router Operations' }).homepage.tagline).toBe('One gateway');
  });

  /**
   * The exact seam between the upload control and the save payload: the shared Drive uploader hands
   * back `{ uri, source: 'drive', metadata }`, and that value has to become the media resource the
   * service stores — carrying the reader share token that makes it resolvable for visitors.
   */
  it('converts a Drive upload value into the media resource the save payload carries', () => {
    const uploadValue = {
      uri: 'drive://spaces/space-1/nodes/node-1',
      source: 'drive' as const,
      metadata: {
        drive: {
          spaceId: 'space-1',
          nodeId: 'node-1',
          shareToken: 'share-token-abc',
          originalFileName: 'brand-logo.png',
          contentType: 'image/png',
          contentLength: '8421',
        },
      },
    };

    const media = driveUploadImageValueToCloudRouterMediaResource(uploadValue, 'image');
    expect(media).toMatchObject({
      id: 'node-1',
      kind: 'image',
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      fileName: 'brand-logo.png',
      mimeType: 'image/png',
      sizeBytes: '8421',
    });
    expect(readDriveShareToken(media)).toBe('share-token-abc');

    const payload = toSiteSettingsUpdateRequest({ ...DEFAULT_SITE_SETTINGS, logo: media });
    expect(payload.logo).toMatchObject({
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      metadata: { drive: { shareToken: 'share-token-abc' } },
    });
  });

  it('refuses to build a payload from an unparseable catalog', () => {
    // The page disables saving while the document is broken; reaching this means a caller bypassed
    // the page, and sending an empty catalog would clear one the operator was still editing.
    expect(() => toSiteSettingsUpdateRequest({ ...DEFAULT_SITE_SETTINGS, downloads: '{' })).toThrow();
  });

  /**
   * The logo is uploaded from `/admin/site` through the Drive upload component, which hands back a
   * `drive://` reference plus a reader share token — not an HTTP URL. The save payload and the
   * read model both have to carry that shape untouched, or the public surfaces receive a resource
   * they cannot resolve.
   */
  it('round-trips an uploaded drive logo through the save payload', () => {
    const uploadedLogo = {
      id: 'node-1',
      kind: 'image' as const,
      source: 'drive' as const,
      uri: 'drive://spaces/space-1/nodes/node-1',
      fileName: 'brand-logo.png',
      mimeType: 'image/png',
      sizeBytes: '8421',
      metadata: {
        drive: { spaceId: 'space-1', nodeId: 'node-1', shareToken: 'share-token-abc' },
        uploadCategory: 'public_asset',
        uploadSlot: 'site-logo',
      },
    };

    const payload = toSiteSettingsUpdateRequest({ ...DEFAULT_SITE_SETTINGS, logo: uploadedLogo });

    expect(payload.logo).toMatchObject({
      kind: 'image',
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      metadata: { drive: { shareToken: 'share-token-abc' }, uploadSlot: 'site-logo' },
    });
    // A page reload reads the stored resource back: the share token is what makes the logo
    // resolvable for anonymous visitors, so losing it here would break it silently.
    expect(toSiteSettings(payload as unknown as Record<string, unknown>).logo).toMatchObject({
      kind: 'image',
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      metadata: { drive: { shareToken: 'share-token-abc' } },
    });
  });

  /**
   * Removing the logo is the mirror image of uploading one. The update contract has no nullable
   * media field and an absent key means "leave the stored value alone", so a cleared field has to
   * travel as an explicit empty resource — omitting it made Clear a no-op after a reload.
   */
  it('sends an explicit empty reference when the operator clears the logo', () => {
    const configured = {
      ...DEFAULT_SITE_SETTINGS,
      logo: { kind: 'image' as const, source: 'external_url' as const, publicUrl: 'https://cdn.example.com/logo.png' },
    };
    const payload = toSiteSettingsUpdateRequest({ ...configured, logo: undefined }, configured);

    expect(payload.logo).toEqual({ kind: 'image', source: 'external_url', publicUrl: '' });
    const stored = toSiteSettings(payload as unknown as Record<string, unknown>).logo;
    expect(readMediaResourceUrl(stored)).toBe('');
    // Every brand surface resolves the cleared record to the shipped mark rather than to an image
    // it cannot load.
    expect(resolveBrandLogoUrl({ logo: stored })).toBe(DEFAULT_BRAND_LOGO_URL);
  });

  /**
   * The complement: a field that never had an asset must stay out of the payload, so saving an
   * unrelated change does not litter the stored document with empty media records.
   */
  it('leaves media fields that were never configured out of the payload', () => {
    const payload = toSiteSettingsUpdateRequest(DEFAULT_SITE_SETTINGS) as unknown as Record<string, unknown>;

    expect(payload.logo).toBeUndefined();
    expect(payload.icon).toBeUndefined();
    expect(payload.favicon).toBeUndefined();
    expect(payload.officialAccountQrCode).toBeUndefined();
  });

  it('surfaces each document on exactly one tab', () => {
    expect(CATEGORY_FIELDS.homepage).toEqual(['homepage']);
    expect(CATEGORY_FIELDS.adminModules).toEqual(['adminModules']);
    expect(CATEGORY_FIELDS.downloads).toEqual(['downloads']);
  });
});
