import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Terminal, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
// Extension-qualified on purpose: this package keeps stray in-place `tsc` emit
// (`*.js`) beside its sources, and the bundler's extension order puts `.js` ahead
// of `.ts`. A bare specifier therefore loads a stale compiled copy — which is how
// the footer silently rendered no QR slots. Naming the source file wins outright.
import { useSiteBranding } from '../siteBranding.ts';
import { readMediaResourceUrl } from '../media-resource.ts';
import { useResolvedMediaResourceUrl } from '../drive-media.ts';
import { SOCIAL_PLATFORMS } from '../social-platforms.ts';
import { QR_CHANNELS, type QrChannelCode } from '../qr-channels.ts';
import { QrCodePlaceholder } from './QrCodePlaceholder.tsx';
import { SocialPlatformChip } from './SocialPlatformGlyph.tsx';

/**
 * Grid templates for the link-column strip, keyed by how many of the three columns the operator
 * left switched on. Tailwind only emits classes it can see as literals, so the templates live in
 * this table rather than being interpolated at runtime.
 */
const LINK_COLUMN_GRID_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
} as const;

export function Footer() {
  const { t } = useTranslation();
  const siteBranding = useSiteBranding();
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const description = siteBranding.description || t('footer.desc');
  const logoSource = readMediaResourceUrl(siteBranding.logo);
  /**
   * Resolved URLs keyed by channel code. Resolved unconditionally and in registry order: calling
   * the hook inside the filter/map that builds the slots would change the hook count the moment
   * an operator switches a channel off, which React forbids.
   */
  const qrCodeSources: Record<QrChannelCode, string | undefined> = {
    officialAccount: useResolvedMediaResourceUrl(siteBranding.officialAccountQrCode),
    videoChannel: useResolvedMediaResourceUrl(siteBranding.videoChannelQrCode),
    douyin: useResolvedMediaResourceUrl(siteBranding.douyinQrCode),
    communityGroup: useResolvedMediaResourceUrl(siteBranding.communityGroupQrCode),
  };
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const sections = siteBranding.footerSections;

  const filingLinks = [
    {
      label: t('footer.icpRecordLabel'),
      number: siteBranding.icpRecordNumber,
      url: siteBranding.icpRecordUrl,
    },
    {
      label: t('footer.policeRecordLabel'),
      number: siteBranding.policeRecordNumber,
      url: siteBranding.policeRecordUrl,
    },
  ].filter((filing) => filing.number.trim());

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubscribed(true);
    setEmail('');
    window.setTimeout(() => setSubscribed(false), 4000);
  };

  const productLinks = [
    { label: t('footer.features'), href: '/features' },
    { label: t('footer.models'), href: '/models' },
    { label: t('footer.pricing'), href: '/pricing' },
    { label: t('footer.changelog'), href: '/changelog' },
  ];

  const resourceLinks = [
    { label: t('nav.productDocs'), href: '/product-docs' },
    { label: t('footer.docs'), href: '/docs' },
    { label: t('footer.api'), href: '/api-reference' },
    { label: t('footer.guides'), href: '/guides' },
    { label: t('footer.blog'), href: '/blog' },
  ];

  const companyLinks = [
    { label: t('footer.about'), href: '/about' },
    { label: t('footer.careers'), href: '/careers' },
    { label: t('footer.contact'), href: '/contact' },
    { label: t('footer.privacy'), href: siteBranding.privacyUrl || '/privacy' },
    { label: t('footer.terms'), href: siteBranding.termsUrl || '/terms' },
  ];

  /**
   * One slot per follow channel. `/admin/site` owns both halves of the decision: the
   * per-channel toggle decides whether the slot renders at all, and the uploaded image
   * decides whether it renders a real code or a placeholder. A slot that is switched on
   * but has no image still renders, so operators can preview the layout before they have
   * artwork.
   */
  const qrCodeSlots = QR_CHANNELS.filter((channel) => siteBranding[channel.visibilityField]).map(
    (channel) => ({
      key: channel.code,
      source: qrCodeSources[channel.code],
      label: t(channel.footerLabelKey),
      description: t(channel.footerDescriptionKey),
    }),
  );

  /**
   * The follow-us row. Registry order decides display order, and a platform only renders when the
   * operator switched it on *and* gave it a target — an enabled-but-blank entry is a half-finished
   * edit, not a link to an empty page.
   */
  const socialEntries = SOCIAL_PLATFORMS.map((definition) => ({
    definition,
    link: siteBranding.socialLinks[definition.code],
  })).filter(({ link }) => link.enabled && link.url.trim().length > 0);

  const linkColumns = [
    sections.productLinks ? { key: 'product', titleKey: 'footer.product', links: productLinks } : null,
    sections.resourceLinks ? { key: 'resources', titleKey: 'footer.resources', links: resourceLinks } : null,
    sections.companyLinks ? { key: 'company', titleKey: 'footer.company', links: companyLinks } : null,
  ].filter((column): column is NonNullable<typeof column> => column !== null);

  const showTopRow = sections.brand || sections.newsletter;
  const showBothTopColumns = sections.brand && sections.newsletter;
  const showQrBlock = sections.qrCodes && qrCodeSlots.length > 0;
  const showMiddleRow = linkColumns.length > 0 || showQrBlock;
  const showSocialRow = sections.social && socialEntries.length > 0;
  const showLegalRow = sections.legal;
  const showBottomRow = showLegalRow || showSocialRow;

  const renderLinkList = (links: { label: string; href: string }[]) => (
    <ul className="space-y-3 text-center">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            to={link.href}
            className="text-sm text-slate-600 transition-colors hover:text-lobster-500 dark:text-slate-400 dark:hover:text-lobster-400"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="relative bg-white pt-20 dark:bg-[#050505]">
      {/* Gradient top accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lobster-500/40 to-transparent" />
      {/* Soft top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(229,80,57,0.06),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        {/* Top: brand + newsletter */}
        {showTopRow ? (
          <div
            className={`grid grid-cols-1 items-center gap-12 ${showBothTopColumns ? 'lg:grid-cols-12 lg:gap-8' : ''}`}
          >
            {sections.brand ? (
              <div className={showBothTopColumns ? 'lg:col-span-5' : ''}>
                <Link to="/" className="mb-5 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm dark:bg-white">
                    {logoSource ? (
                      <img
                        src={logoSource}
                        alt={siteBranding.siteName}
                        className="h-5 w-5 object-contain"
                      />
                    ) : (
                      <Terminal className="h-5 w-5 text-white dark:text-slate-900" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {displaySiteName}
                  </span>
                </Link>
                <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            ) : null}

            {sections.newsletter ? (
              <div className={showBothTopColumns ? 'lg:col-span-7' : ''}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/5 md:p-8">
                  <div className="mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-lobster-500" aria-hidden="true" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {t('footer.newsletter.title')}
                    </h3>
                  </div>
                  <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
                    {t('footer.newsletter.desc')}
                  </p>
                  <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t('footer.newsletter.placeholder')}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-lobster-500 focus:outline-none focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      className="group inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {subscribed ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {t('footer.newsletter.button')}
                        </>
                      ) : (
                        <>
                          {t('footer.newsletter.button')}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    {t('footer.newsletter.privacy')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Middle: link columns + follow channels */}
        {showMiddleRow ? (
          <div
            className={`grid gap-12 border-t border-slate-200 py-12 dark:border-white/5 ${
              linkColumns.length > 0 && showQrBlock ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''
            }`}
          >
            {linkColumns.length > 0 ? (
              <div
                className={`grid gap-8 md:gap-12 ${LINK_COLUMN_GRID_CLASS[linkColumns.length as 1 | 2 | 3]}`}
              >
                {linkColumns.map((column) => (
                  <div className="flex flex-col items-center" data-cloudrouter-footer-column={column.key} key={column.key}>
                    <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                      {t(column.titleKey)}
                    </h4>
                    {renderLinkList(column.links)}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Follow channels: one slot per channel. Both the per-channel visibility toggle and
                the artwork come from /admin/site. */}
            {showQrBlock ? (
              <div className="flex flex-col items-center" data-cloudrouter-footer-section="qr-codes">
                <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t('footer.qrcode.title')}
                </h4>
                <div className="grid w-full grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-2">
                  {qrCodeSlots.map((slot) => (
                    <div
                      className="flex flex-col items-center text-center"
                      data-cloudrouter-qr-slot={slot.key}
                      key={slot.key}
                    >
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {slot.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                          {slot.description}
                        </p>
                      </div>
                      <div className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-lobster-300 hover:shadow-md dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-lobster-500/40">
                        {slot.source ? (
                          <img
                            alt={slot.label}
                            className="h-28 w-28 rounded-lg object-cover"
                            loading="lazy"
                            src={slot.source}
                          />
                        ) : (
                          <QrCodePlaceholder label={slot.label} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Bottom: copyright + filing + follow-us row */}
        {showBottomRow ? (
          <div
            className="flex flex-col items-center gap-6 border-t border-slate-200 py-8 text-center dark:border-white/5"
            data-cloudrouter-footer-row="bottom"
          >
            {showLegalRow ? (
              <div
                className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6"
                data-cloudrouter-footer-section="legal"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  &copy; {new Date().getFullYear()} {siteBranding.footerCopyright || t('footer.rights')}
                </p>
                {filingLinks.map((filing) => (
                  <FilingLink key={filing.number} label={filing.label} number={filing.number} url={filing.url} />
                ))}
              </div>
            ) : null}

            {showSocialRow ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4" data-cloudrouter-footer-section="social">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('footer.social')}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {socialEntries.map(({ definition, link }) => (
                    <SocialPlatformChip
                      definition={definition}
                      href={link.url}
                      key={definition.code}
                      label={t(definition.labelKey)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function FilingLink({ label, number, url }: { label: string; number: string; url: string }) {
  const className = 'text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300';
  if (!url) {
    return <span className={className}>{label}：{number}</span>;
  }
  return (
    <a className={className} href={url} target="_blank" rel="noreferrer">
      {label}：{number}
    </a>
  );
}
