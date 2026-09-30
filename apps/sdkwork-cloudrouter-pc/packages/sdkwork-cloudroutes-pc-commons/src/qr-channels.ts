/**
 * The four follow-channel QR slots, defined once.
 *
 * The footer renders them and `/admin/site` edits them, so a channel that only one side knows
 * about is a bug: the footer would render a slot nobody can configure, or the console would
 * offer a switch that renders nothing. Both surfaces therefore read this table rather than
 * keeping a private list.
 *
 * The two i18n key sets are carried side by side on purpose — the console labels the *upload
 * field* ("WeChat Official Account QR code") while the footer labels the *channel* ("Official
 * account") next to other channels. Same channel, different sentence; what must not drift is the
 * channel list and the contract field names, and those live here.
 */

export const QR_CHANNELS = [
  {
    /** Tag shared by both surfaces (`data-cloudrouter-qr-slot` / `data-admin-site-qr-slot`). */
    code: 'officialAccount',
    mediaField: 'officialAccountQrCode',
    visibilityField: 'officialAccountQrCodeEnabled',
    adminLabelKey: 'admin.siteSettings.fields.officialAccountQrCode',
    adminDescriptionKey: 'admin.siteSettings.qrCode.officialAccount.description',
    footerLabelKey: 'footer.qrcode.official',
    footerDescriptionKey: 'footer.qrcode.official.desc',
  },
  {
    code: 'videoChannel',
    mediaField: 'videoChannelQrCode',
    visibilityField: 'videoChannelQrCodeEnabled',
    adminLabelKey: 'admin.siteSettings.fields.videoChannelQrCode',
    adminDescriptionKey: 'admin.siteSettings.qrCode.videoChannel.description',
    footerLabelKey: 'footer.qrcode.videoChannel',
    footerDescriptionKey: 'footer.qrcode.videoChannel.desc',
  },
  {
    code: 'douyin',
    mediaField: 'douyinQrCode',
    visibilityField: 'douyinQrCodeEnabled',
    adminLabelKey: 'admin.siteSettings.fields.douyinQrCode',
    adminDescriptionKey: 'admin.siteSettings.qrCode.douyin.description',
    footerLabelKey: 'footer.qrcode.douyin',
    footerDescriptionKey: 'footer.qrcode.douyin.desc',
  },
  {
    code: 'communityGroup',
    mediaField: 'communityGroupQrCode',
    visibilityField: 'communityGroupQrCodeEnabled',
    adminLabelKey: 'admin.siteSettings.fields.communityGroupQrCode',
    adminDescriptionKey: 'admin.siteSettings.qrCode.communityGroup.description',
    footerLabelKey: 'footer.qrcode.group',
    footerDescriptionKey: 'footer.qrcode.group.desc',
  },
] as const;

export type QrChannelCode = (typeof QR_CHANNELS)[number]['code'];

/** `CloudRouterMediaResource` field on the site-settings contract that holds this slot's artwork. */
export type QrChannelMediaField = (typeof QR_CHANNELS)[number]['mediaField'];

/** Boolean field on the site-settings contract that gates this slot's footer visibility. */
export type QrChannelVisibilityField = (typeof QR_CHANNELS)[number]['visibilityField'];

/**
 * Upload-bucket slot code for QR artwork. All four channels share one bucket — the channel is
 * carried by the media *field*, not by the slot — so this is a single constant rather than a
 * per-channel value.
 */
export const QR_UPLOAD_SLOT = 'site-qr-code';
