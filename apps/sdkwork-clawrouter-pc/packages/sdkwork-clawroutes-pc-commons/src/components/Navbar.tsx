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

const NAVBAR_HEADER_ACTION_CLASS =
  'text-slate-600 transition-colors hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:text-slate-300 dark:hover:text-white';

function resolveNavbarLanguageCode(raw: string | undefined): string {
  const normalized = raw?.toLowerCase() ?? '';
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ru')) return 'ru';
  return 'en';
}

export function Navbar({ authenticatedActionsStart, isDark, toggleTheme }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const siteBranding = useSiteBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPortalSessionStored, setIsPortalSessionStored] = useState(() => hasStoredPortalSession());
  const langMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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
      const target = event.target as Node;
      if (langMenuRef.current && !langMenuRef.current.contains(target)) {
        setIsLangMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [location.pathname]);


  const changeLanguage = (lang: string) => {
    localStorage.setItem('user_explicit_lang', lang);
    localStorage.removeItem('i18nextLng');
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate(buildPortalAuthLoginRedirect(location));
  };

  const activeLanguageCode = resolveNavbarLanguageCode(i18n.resolvedLanguage ?? i18n.language);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
  ];

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.models'), href: '/models' },
    { name: t('nav.rankings'), href: '/rankings', showFrom: 'xl' as const },
    { name: t('nav.productDocs'), href: '/product-docs', showFrom: 'xl' as const },
    { name: t('nav.docs'), href: '/docs' },
    { name: t('nav.api'), href: '/api-reference', showFrom: '2xl' as const },
    { name: t('nav.sdk'), href: '/sdk-reference', showFrom: '2xl' as const },
    { name: t('nav.playground', 'Playground'), href: '/playground' },
    { name: t('nav.tokenPlan', 'Token Plan'), href: '/token-plan', showFrom: '2xl' as const },
  ];

  const navLinkVisibilityClass = (showFrom?: 'xl' | '2xl') => {
    if (showFrom === '2xl') {
      return 'hidden 2xl:inline-flex';
    }
    if (showFrom === 'xl') {
      return 'hidden xl:inline-flex';
    }
    return 'inline-flex';
  };

  const overflowMenuItemClass = (showFrom?: 'xl' | '2xl') => {
    if (showFrom === '2xl') {
      return 'flex 2xl:hidden';
    }
    if (showFrom === 'xl') {
      return 'flex xl:hidden';
    }
    return 'hidden';
  };

  const overflowNavLinks = navLinks.filter((link) => link.showFrom);
  const isOverflowNavActive = overflowNavLinks.some(
    (link) =>
      location.pathname === link.href ||
      (link.href !== '/' && location.pathname.startsWith(link.href)),
  );

  const renderNavLink = (
    link: (typeof navLinks)[number],
    options?: { onNavigate?: () => void; layout?: 'desktop' | 'mobile' },
  ) => {
    const layout = options?.layout ?? 'desktop';
    const isActive =
      location.pathname === link.href ||
      (link.href !== '/' && location.pathname.startsWith(link.href));

    return (
      <Link
        key={link.href}
        to={link.href}
        aria-current={isActive ? 'page' : undefined}
        onClick={options?.onNavigate}
        className={`${
          layout === 'mobile' ? 'inline-flex text-base' : `${navLinkVisibilityClass(link.showFrom)} text-xs xl:text-sm`
        } relative shrink-0 items-center whitespace-nowrap px-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background ${
          isActive
            ? 'text-lobster-500 dark:text-white'
            : layout === 'mobile'
              ? 'text-slate-600 dark:text-slate-300'
              : 'text-slate-600 hover:text-lobster-500 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        {link.name}
        {isActive && layout === 'desktop' ? (
          <motion.div
            layoutId="navbar-active"
            className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-lobster-500"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            aria-hidden="true"
          />
        ) : null}
      </Link>
    );
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 flex h-[var(--sdkwork-portal-navbar-height,4rem)] items-center transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md dark:bg-[#050505]/80'
          : 'bg-transparent'
      }`}
    >
      <div className="relative mx-auto flex w-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6 lg:gap-4 lg:px-8">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
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
          <span className="hidden max-w-[7rem] truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:inline md:max-w-[10rem] lg:max-w-[12rem] lg:text-lg xl:max-w-none xl:text-xl">
            {displaySiteName}
          </span>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-1 lg:flex xl:gap-2 2xl:gap-3"
          aria-label={t('navbar.menu.label', 'Navigation menu')}
        >
          {navLinks.map((link) => renderNavLink(link))}
          <div className="relative hidden lg:inline-flex 2xl:hidden" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((open) => !open)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background xl:text-sm ${
                isOverflowNavActive || isMoreMenuOpen
                  ? 'text-lobster-500 dark:text-white'
                  : 'text-slate-600 hover:text-lobster-500 dark:text-slate-400 dark:hover:text-white'
              }`}
              aria-expanded={isMoreMenuOpen}
              aria-haspopup="menu"
              aria-controls="navbar-more-menu"
            >
              {t('navbar.more', 'More')}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {isMoreMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 top-full z-50 mt-2 min-w-[11rem] -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700/60 dark:bg-[#1a1a1a]"
                  id="navbar-more-menu"
                  role="menu"
                  aria-label={t('navbar.moreMenu.label', 'More navigation links')}
                >
                  {overflowNavLinks.map((link) => {
                    const isActive =
                      location.pathname === link.href ||
                      (link.href !== '/' && location.pathname.startsWith(link.href));
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        role="menuitem"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className={`${overflowMenuItemClass(link.showFrom)} w-full items-center px-4 py-2 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:bg-white/5 ${
                          isActive ? 'font-medium text-lobster-500' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {link.name}
                      </Link>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex xl:gap-3">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={`flex items-center gap-1.5 rounded-md ${NAVBAR_HEADER_ACTION_CLASS}`}
              type="button"
              aria-label={t('navbar.language.toggle', 'Toggle language menu')}
              aria-expanded={isLangMenuOpen}
              aria-haspopup="menu"
              aria-controls="navbar-language-menu"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium uppercase">{activeLanguageCode}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {isLangMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700/60 dark:bg-[#1a1a1a]"
                  id="navbar-language-menu"
                  role="menu"
                  aria-label={t('navbar.language.label', 'Language')}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:bg-white/5"
                      type="button"
                      role="menuitem"
                    >
                      <span className={activeLanguageCode === lang.code ? 'font-medium text-lobster-500' : 'text-slate-700 dark:text-slate-300'}>
                        {lang.name}
                      </span>
                      {activeLanguageCode === lang.code ? <Check className="h-4 w-4 text-lobster-500" aria-hidden="true" /> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className={`rounded-md ${NAVBAR_HEADER_ACTION_CLASS}`}
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
                className={`rounded-md px-1 text-xs font-medium xl:text-sm ${NAVBAR_HEADER_ACTION_CLASS}`}
                type="button"
              >
                {t('nav.signin')}
              </button>
              <Link to="/console"
                className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 xl:px-4 xl:py-2 xl:text-sm"
              >
                <span className="whitespace-nowrap">{t('nav.console')}</span>
                <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
              {authenticatedActionsStart}
              {!isConsolePath ? (
                <Link to="/console"
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-background dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 xl:px-4 xl:py-2 xl:text-sm"
                >
                  <span className="whitespace-nowrap">{t('nav.console')}</span>
                  <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className={`rounded-md ${NAVBAR_HEADER_ACTION_CLASS}`}
            type="button"
            aria-label={isDark ? t('navbar.theme.switchToLight', 'Switch to light theme') : t('navbar.theme.switchToDark', 'Switch to dark theme')}
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            className={`rounded-md ${NAVBAR_HEADER_ACTION_CLASS}`}
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
          className="absolute left-0 right-0 top-full flex flex-col gap-4 bg-white p-6 shadow-2xl dark:bg-[#0a0a0a] lg:hidden"
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
          {navLinks.map((link) => renderNavLink(link, { layout: 'mobile', onNavigate: () => setMobileMenuOpen(false) }))}
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
                className="flex items-center justify-between rounded-md text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500"
                type="button"
              >
                <span className={activeLanguageCode === lang.code ? 'text-lobster-500' : 'text-slate-600 dark:text-slate-300'}>
                  {lang.name}
                </span>
                {activeLanguageCode === lang.code ? <Check className="h-4 w-4 text-lobster-500" aria-hidden="true" /> : null}
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
