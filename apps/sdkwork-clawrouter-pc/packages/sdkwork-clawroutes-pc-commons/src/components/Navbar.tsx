import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Menu,
  Moon,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  buildPortalAuthLoginRedirect,
  hasStoredPortalSession,
  subscribePortalSessionChange,
} from '../portal-auth.ts';
import { useSiteBranding } from '../siteBranding.ts';
import { readMediaResourceUrl } from '../media-resource.ts';

interface NavbarProps {
  authenticatedActionsStart?: ReactNode;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Navbar({ authenticatedActionsStart, isDark, toggleTheme }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const siteBranding = useSiteBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isPortalSessionStored, setIsPortalSessionStored] = useState(() => hasStoredPortalSession());
  const langMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isConsolePath = location.pathname.startsWith('/console');
  const shouldShowAuthenticatedActions = isPortalSessionStored || isConsolePath;
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const logoSource = readMediaResourceUrl(siteBranding.logo);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncPortalSessionState = () => {
      setIsPortalSessionStored(hasStoredPortalSession());
    };

    syncPortalSessionState();
    return subscribePortalSessionChange(syncPortalSessionState);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const changeLanguage = (lang: string) => {
    localStorage.setItem('user_explicit_lang', lang);
    localStorage.removeItem('i18nextLng');
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate(buildPortalAuthLoginRedirect(location));
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: t('commons.navbar.language.zh', '中文') },
  ];

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.models'), href: '/models' },
    { name: t('nav.rankings'), href: '/rankings' },
    { name: t('nav.productDocs'), href: '/product-docs' },
    { name: t('nav.docs'), href: '/docs' },
    { name: t('nav.api'), href: '/api-reference' },
    { name: t('nav.sdk'), href: '/sdk-reference' },
    { name: t('nav.playground', 'Playground'), href: '/playground' },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 flex h-[var(--sdkwork-portal-navbar-height,4rem)] items-center transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md dark:bg-[#050505]/80'
          : 'bg-transparent'
      }`}
    >
      <div className="relative mx-auto flex w-full items-center justify-between px-4 md:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background rounded-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
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

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.href ||
              (link.href !== '/' && location.pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background ${
                  isActive
                    ? 'text-lobster-500 dark:text-white'
                    : 'text-slate-600 hover:text-lobster-500 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {link.name}
                {isActive ? (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-lobster-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              type="button"
              aria-label={t('navbar.language.toggle', 'Toggle language menu')}
              aria-expanded={isLangMenuOpen}
              aria-haspopup="menu"
              aria-controls="navbar-language-menu"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium uppercase">{i18n.resolvedLanguage || 'EN'}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {isLangMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-32 overflow-hidden bg-white py-1 shadow-lg ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/10"
                  id="navbar-language-menu"
                  role="menu"
                  aria-label={t('navbar.language.label', 'Language')}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:hover:bg-white/5"
                      type="button"
                      role="menuitem"
                    >
                      <span className={i18n.resolvedLanguage === lang.code ? 'font-medium text-lobster-500' : 'text-slate-700 dark:text-slate-300'}>
                        {lang.name}
                      </span>
                      {i18n.resolvedLanguage === lang.code ? <Check className="h-4 w-4 text-lobster-500" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className="text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300 dark:hover:text-white"
            type="button"
            aria-label={isDark ? t('navbar.theme.switchToLight', 'Switch to light theme') : t('navbar.theme.switchToDark', 'Switch to dark theme')}
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>

          {!shouldShowAuthenticatedActions ? (
            <>
              <button
                onClick={handleSignIn}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300 dark:hover:text-white"
                type="button"
              >
                {t('nav.signin')}
              </button>
              <Link to="/console"
                className="flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t('nav.console')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {authenticatedActionsStart}
              {!isConsolePath ? (
                <Link to="/console"
                  className="flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {t('nav.console')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={toggleTheme}
            className="text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300 dark:hover:text-white"
            type="button"
            aria-label={isDark ? t('navbar.theme.switchToLight', 'Switch to light theme') : t('navbar.theme.switchToDark', 'Switch to dark theme')}
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            className="text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300 dark:hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label={t('navbar.menu.toggle', 'Toggle navigation menu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full flex flex-col gap-4 bg-white p-6 shadow-2xl dark:bg-[#0a0a0a] md:hidden"
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('navbar.menu.label', 'Navigation menu')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMobileMenuOpen(false);
            }
          }}
        >
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.href ||
              (link.href !== '/' && location.pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background ${
                  isActive ? 'text-lobster-500' : 'text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="my-2 h-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('navbar.language.label', 'Language')}</span>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background"
                type="button"
              >
                <span className={i18n.resolvedLanguage === lang.code ? 'text-lobster-500' : 'text-slate-600 dark:text-slate-300'}>
                  {lang.name}
                </span>
                {i18n.resolvedLanguage === lang.code ? <Check className="h-4 w-4 text-lobster-500" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
          <div className="my-2 h-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />
          {!shouldShowAuthenticatedActions ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignIn();
                }}
                className="text-left text-base font-medium text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:text-slate-300"
                type="button"
              >
                {t('nav.signin')}
              </button>
                  <Link to="/console"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg bg-slate-900 px-4 py-2 text-center text-base font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                {t('nav.console')}
              </Link>
            </>
          ) : (
            <Link to="/console"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg bg-slate-900 px-4 py-2 text-center text-base font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t('nav.console')}
            </Link>
          )}
        </motion.div>
      ) : null}
    </header>
  );
}
