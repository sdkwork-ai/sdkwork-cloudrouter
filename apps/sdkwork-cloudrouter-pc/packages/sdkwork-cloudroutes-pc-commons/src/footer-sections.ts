/**
 * The footer is assembled from eight independently switchable regions. Each region maps 1:1 to a
 * boolean on the site-settings contract, and `/admin/site` renders one switch per entry, so this
 * table is the only place that has to know the wire names.
 *
 * Adding a region means: a switch column in the backend domain model, the contract surfaces, and
 * an entry here plus its translations.
 */
export const FOOTER_SECTIONS = [
  {
    code: 'brand',
    field: 'footerBrandEnabled',
    labelKey: 'admin.siteSettings.footerSections.brand.label',
    descriptionKey: 'admin.siteSettings.footerSections.brand.description',
  },
  {
    code: 'newsletter',
    field: 'footerNewsletterEnabled',
    labelKey: 'admin.siteSettings.footerSections.newsletter.label',
    descriptionKey: 'admin.siteSettings.footerSections.newsletter.description',
  },
  {
    code: 'productLinks',
    field: 'footerProductLinksEnabled',
    labelKey: 'admin.siteSettings.footerSections.productLinks.label',
    descriptionKey: 'admin.siteSettings.footerSections.productLinks.description',
  },
  {
    code: 'resourceLinks',
    field: 'footerResourceLinksEnabled',
    labelKey: 'admin.siteSettings.footerSections.resourceLinks.label',
    descriptionKey: 'admin.siteSettings.footerSections.resourceLinks.description',
  },
  {
    code: 'companyLinks',
    field: 'footerCompanyLinksEnabled',
    labelKey: 'admin.siteSettings.footerSections.companyLinks.label',
    descriptionKey: 'admin.siteSettings.footerSections.companyLinks.description',
  },
  {
    code: 'qrCodes',
    field: 'footerQrCodesEnabled',
    labelKey: 'admin.siteSettings.footerSections.qrCodes.label',
    descriptionKey: 'admin.siteSettings.footerSections.qrCodes.description',
  },
  {
    code: 'social',
    field: 'footerSocialEnabled',
    labelKey: 'admin.siteSettings.footerSections.social.label',
    descriptionKey: 'admin.siteSettings.footerSections.social.description',
  },
  {
    code: 'legal',
    field: 'footerLegalEnabled',
    labelKey: 'admin.siteSettings.footerSections.legal.label',
    descriptionKey: 'admin.siteSettings.footerSections.legal.description',
  },
] as const satisfies readonly FooterSectionDefinition[];

export type FooterSectionCode = (typeof FOOTER_SECTIONS)[number]['code'];

export type FooterSectionDefinition = {
  readonly code: string;
  /** Contract field backing this region's visibility switch. */
  readonly field: string;
  readonly labelKey: string;
  readonly descriptionKey: string;
};

/** Visibility of each switchable footer region as the footer reads it. */
export type FooterSectionVisibility = Record<FooterSectionCode, boolean>;

/** Contract field names of the eight region switches, as a literal union. */
export type FooterSectionField = (typeof FOOTER_SECTIONS)[number]['field'];

/** Per-region switch values in wire form: `{ footerBrandEnabled: true, … }`. */
export type FooterSectionSwitches = { [K in FooterSectionField]: boolean };

/**
 * A fresh deployment shows every region — that is what the footer looked like before the regions
 * became switchable, so an operator upgrading sees no change until they edit something.
 */
export function createDefaultFooterSectionSwitches(): FooterSectionSwitches {
  return Object.fromEntries(
    FOOTER_SECTIONS.map((section) => [section.field, true]),
  ) as FooterSectionSwitches;
}
