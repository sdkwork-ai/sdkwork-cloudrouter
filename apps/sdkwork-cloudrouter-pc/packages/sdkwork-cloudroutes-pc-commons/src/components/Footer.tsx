import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Terminal, Github, Twitter, Linkedin, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useSiteBranding } from '../siteBranding';
import { readMediaResourceUrl } from '../media-resource';

export function Footer() {
  const { t } = useTranslation();
  const siteBranding = useSiteBranding();
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const description = siteBranding.description || t('footer.desc');
  const logoSource = readMediaResourceUrl(siteBranding.logo);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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

  const socials = [
    { label: 'GitHub', icon: <Github className="h-4 w-4" />, href: 'https://github.com' },
    { label: 'Twitter', icon: <Twitter className="h-4 w-4" />, href: 'https://twitter.com' },
    { label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, href: 'https://linkedin.com' },
    { label: 'Email', icon: <Mail className="h-4 w-4" />, href: 'mailto:hello@example.com' },
  ];

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
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
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

          <div className="lg:col-span-7">
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
        </div>

        {/* Middle: link columns + QR codes */}
        <div className="grid grid-cols-2 gap-8 border-t border-slate-200 py-12 dark:border-white/5 md:grid-cols-3 md:gap-12 lg:grid-cols-5">
          <div className="flex flex-col items-center">
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.product')}
            </h4>
            {renderLinkList(productLinks)}
          </div>
          <div className="flex flex-col items-center">
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.resources')}
            </h4>
            {renderLinkList(resourceLinks)}
          </div>
          <div className="col-span-2 flex flex-col items-center md:col-span-1">
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.company')}
            </h4>
            {renderLinkList(companyLinks)}
          </div>

          {/* QR codes: official account + community group */}
          <div className="col-span-1 flex flex-col items-center text-center">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                {t('footer.qrcode.official')}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('footer.qrcode.official.desc')}
              </p>
            </div>
            <div className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-lobster-300 hover:shadow-md dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-lobster-500/40">
              <img
                src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=A%20black%20and%20white%20QR%20code%20on%20clean%20white%20background%2C%20square%20barcode%20pattern%2C%20scannable%2C%20minimal%20professional%20marketing%20material&image_size=square_hd"
                alt={t('footer.qrcode.official')}
                className="h-28 w-28 rounded-lg object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div className="col-span-1 flex flex-col items-center text-center">
            <div className="mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                {t('footer.qrcode.group')}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('footer.qrcode.group.desc')}
              </p>
            </div>
            <div className="group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-lobster-300 hover:shadow-md dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:border-lobster-500/40">
              <img
                src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=A%20black%20and%20white%20QR%20code%20on%20clean%20white%20background%2C%20square%20barcode%20pattern%2C%20scannable%2C%20minimal%20professional%20community%20group&image_size=square_hd"
                alt={t('footer.qrcode.group')}
                className="h-28 w-28 rounded-lg object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Bottom: copyright + socials (centered) */}
        <div className="flex flex-col items-center gap-6 border-t border-slate-200 py-8 text-center dark:border-white/5">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} {siteBranding.footerCopyright || t('footer.rights')}
            </p>
            {filingLinks.map((filing) => (
              <FilingLink key={filing.number} label={filing.label} number={filing.number} url={filing.url} />
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:inline">
              {t('footer.social')}
            </span>
            <div className="flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-lobster-300 hover:text-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-lobster-500/40 dark:hover:text-lobster-400"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
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
