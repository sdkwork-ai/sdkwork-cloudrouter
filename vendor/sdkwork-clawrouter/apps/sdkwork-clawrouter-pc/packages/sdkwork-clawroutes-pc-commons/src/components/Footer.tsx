import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { useSiteBranding } from '../siteBranding';
import { readMediaResourceUrl } from '../media-resource';

export function Footer() {
  const { t } = useTranslation();
  const siteBranding = useSiteBranding();
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const description = siteBranding.description || t('footer.desc');
  const logoSource = readMediaResourceUrl(siteBranding.logo);
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

  return (
    <footer className="bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5 pt-16 pb-8">
      <div className="w-full mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center">
                {logoSource ? (
                  <img
                    src={logoSource}
                    alt={siteBranding.siteName}
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <Terminal className="w-5 h-5 text-white dark:text-slate-900" />
                )}
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {displaySiteName}
              </span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              {description}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-6">{t('footer.product')}</h4>
            <ul className="space-y-4">
              <li><Link to="/features" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.features')}</Link></li>
              <li><Link to="/models" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.models')}</Link></li>
              <li><Link to="/pricing" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.pricing')}</Link></li>
              <li><Link to="/changelog" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.changelog')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-6">{t('footer.resources')}</h4>
            <ul className="space-y-4">
              <li><Link to="/product-docs" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('nav.productDocs')}</Link></li>
              <li><Link to="/docs" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.docs')}</Link></li>
              <li><Link to="/api-reference" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.api')}</Link></li>
              <li><Link to="/guides" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.guides')}</Link></li>
              <li><Link to="/blog" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.blog')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-6">{t('footer.company')}</h4>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.about')}</Link></li>
              <li><Link to="/careers" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.careers')}</Link></li>
              <li><Link to="/contact" className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.contact')}</Link></li>
              <li><Link to={siteBranding.privacyUrl || '/privacy'} className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link to={siteBranding.termsUrl || '/terms'} className="text-slate-600 dark:text-slate-400 hover:text-lobster-500 dark:hover:text-lobster-400 transition-colors">{t('footer.terms')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} {siteBranding.footerCopyright || t('footer.rights')}
            </p>
            {filingLinks.map((filing) => (
              <FilingLink key={filing.number} label={filing.label} number={filing.number} url={filing.url} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm text-slate-500">{t('footer.status')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FilingLink({ label, number, url }: { label: string; number: string; url: string }) {
  const className = 'text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors';
  if (!url) {
    return <span className={className}>{label}：{number}</span>;
  }
  return (
    <a className={className} href={url} target="_blank" rel="noreferrer">
      {label}：{number}
    </a>
  );
}
