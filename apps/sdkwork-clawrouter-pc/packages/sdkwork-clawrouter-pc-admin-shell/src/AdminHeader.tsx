import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  Globe,
  Menu,
  Moon,
  MoreHorizontal,
  Shield,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  buildPortalAuthLoginRedirect,
  hasStoredPortalSession,
  readMediaResourceUrl,
  subscribePortalSessionChange,
  useSiteBranding,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { AdminModuleDef, AdminModuleId } from './adminModuleRegistry.ts';

export {
  ADMIN_MODULES,
  getActiveModuleFromPath,
  type AdminModuleDef,
  type AdminModuleId,
} from './adminModuleRegistry.ts';

interface AdminHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeModule: AdminModuleId;
  allowedModules: readonly AdminModuleDef[];
  mobileMenuOpen: boolean;
  mobileNavigation: ReactNode;
  onMobileMenuClose: () => void;
  onMobileMenuToggle: () => void;
}

const MODULE_NAV_GAP_PX = 4;
const MODULE_MORE_BUTTON_WIDTH_PX = 108;
const MODULE_NAV_PADDING_PX = 16;
const MIN_VISIBLE_MODULES = 1;
const MODULE_MORE_MENU_ID = 'admin-header-module-more-menu';
const LANGUAGE_MENU_ID = 'admin-header-language-menu';
const MOBILE_NAVIGATION_ID = 'admin-mobile-navigation';
const MOBILE_NAVIGATION_TITLE_ID = 'admin-mobile-navigation-title';

export function AdminHeader({
  isDark,
  toggleTheme,
  activeModule,
  allowedModules,
  mobileMenuOpen,
  mobileNavigation,
  onMobileMenuClose,
  onMobileMenuToggle,
}: AdminHeaderProps) {
  const { t, i18n } = useTranslation();
  const siteBranding = useSiteBranding();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isModuleMoreMenuOpen, setIsModuleMoreMenuOpen] = useState(false);
  const [visibleModuleIds, setVisibleModuleIds] = useState<AdminModuleId[]>(() => (
    allowedModules.map((mod) => mod.id)
  ));
  const [isPortalSessionStored, setIsPortalSessionStored] = useState(() => hasStoredPortalSession());
  const moduleNavRef = useRef<HTMLElement>(null);
  const moduleMoreMenuRef = useRef<HTMLDivElement>(null);
  const moduleMeasureRefs = useRef(new Map<AdminModuleId, HTMLButtonElement>());
  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const logoSource = readMediaResourceUrl(siteBranding.logo);
  const resolvedLanguage = i18n.resolvedLanguage || 'en';
  const themeToggleLabel = isDark
    ? t('navbar.theme.switchToLight', 'Switch to light theme')
    : t('navbar.theme.switchToDark', 'Switch to dark theme');

  const setModuleMeasureRef = useCallback((moduleId: AdminModuleId) => {
    return (node: HTMLButtonElement | null) => {
      if (node) {
        moduleMeasureRefs.current.set(moduleId, node);
        return;
      }
      moduleMeasureRefs.current.delete(moduleId);
    };
  }, []);

  const calculateVisibleModules = useCallback(() => {
    const navWidth = moduleNavRef.current?.clientWidth ?? 0;
    if (navWidth <= 0) {
      return;
    }

    const moduleWidths = allowedModules.map((mod) => ({
      moduleId: mod.id,
      width: moduleMeasureRefs.current.get(mod.id)?.offsetWidth ?? 0,
    }));
    if (moduleWidths.some((item) => item.width <= 0)) {
      return;
    }
    const moduleWidthById = new Map(moduleWidths.map((item) => [item.moduleId, item.width]));

    const fitsModules = (moduleIds: AdminModuleId[]) => {
      const hasOverflow = moduleIds.length < allowedModules.length;
      const visibleWidth = moduleIds.reduce((total, moduleId, index) => {
        return total + (moduleWidthById.get(moduleId) ?? 0) + (index > 0 ? MODULE_NAV_GAP_PX : 0);
      }, 0);
      const moreWidth = hasOverflow
        ? MODULE_MORE_BUTTON_WIDTH_PX + (moduleIds.length > 0 ? MODULE_NAV_GAP_PX : 0)
        : 0;
      return visibleWidth + moreWidth + MODULE_NAV_PADDING_PX <= navWidth;
    };

    const nextVisibleIds = allowedModules.map((mod) => mod.id);
    while (nextVisibleIds.length > MIN_VISIBLE_MODULES && !fitsModules(nextVisibleIds)) {
      const removableIndex = [...nextVisibleIds].reverse().findIndex((moduleId) => moduleId !== activeModule);
      if (removableIndex === -1) {
        break;
      }
      nextVisibleIds.splice(nextVisibleIds.length - 1 - removableIndex, 1);
    }

    setVisibleModuleIds((currentIds) => {
      const isUnchanged = currentIds.length === nextVisibleIds.length
        && currentIds.every((id, index) => id === nextVisibleIds[index]);
      return isUnchanged ? currentIds : nextVisibleIds;
    });
  }, [activeModule, allowedModules]);

  useEffect(() => {
    setVisibleModuleIds((currentIds) => {
      const allowedIds = new Set(allowedModules.map((mod) => mod.id));
      const filtered = currentIds.filter((id) => allowedIds.has(id));
      return filtered.length > 0 ? filtered : allowedModules.map((mod) => mod.id);
    });
  }, [allowedModules]);

  const visibleModuleIdSet = useMemo(() => new Set(visibleModuleIds), [visibleModuleIds]);
  const visibleModules = allowedModules.filter((mod) => visibleModuleIdSet.has(mod.id));
  const overflowModules = allowedModules.filter((mod) => !visibleModuleIdSet.has(mod.id));

  useEffect(() => {
    const syncPortalSessionState = () => setIsPortalSessionStored(hasStoredPortalSession());
    syncPortalSessionState();
    return subscribePortalSessionChange(syncPortalSessionState);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (moduleMoreMenuRef.current && !moduleMoreMenuRef.current.contains(event.target as Node)) {
        setIsModuleMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsLangMenuOpen(false);
    setIsModuleMoreMenuOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    calculateVisibleModules();
  }, [calculateVisibleModules, resolvedLanguage, displaySiteName, isPortalSessionStored]);

  useEffect(() => {
    const nav = moduleNavRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    calculateVisibleModules();
    const resizeObserver = new ResizeObserver(() => calculateVisibleModules());
    resizeObserver.observe(nav);
    return () => resizeObserver.disconnect();
  }, [calculateVisibleModules]);

  useEffect(() => {
    if (overflowModules.length === 0) {
      setIsModuleMoreMenuOpen(false);
    }
  }, [overflowModules.length]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : mobileMenuButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = mobileNavigationRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? mobileNavigationRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onMobileMenuClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const drawer = mobileNavigationRef.current;
      if (!drawer) {
        return;
      }
      const focusableItems = Array.from(drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusableItems.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstItem = focusableItems[0]!;
      const lastItem = focusableItems[focusableItems.length - 1]!;
      if (event.shiftKey && (document.activeElement === firstItem || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        mobileMenuButtonRef.current?.focus();
      }
    };
  }, [mobileMenuOpen, onMobileMenuClose]);

  const changeLanguage = (lang: string) => {
    localStorage.setItem('user_explicit_lang', lang);
    localStorage.removeItem('i18nextLng');
    void i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleModuleClick = (mod: AdminModuleDef) => {
    navigate(mod.defaultPath);
    setIsModuleMoreMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate(buildPortalAuthLoginRedirect(location));
  };

  const languages = [
    { code: 'en', name: t('commons.navbar.language.en', 'English') },
    { code: 'zh', name: t('admin.header.lang.zh', 'Chinese') },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-slate-950">
      <div className="mx-auto flex h-full w-full items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center gap-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
              {logoSource ? (
                <img src={logoSource} alt={siteBranding.siteName} className="h-5 w-5 object-contain" />
              ) : (
                <Terminal aria-hidden="true" className="h-5 w-5 text-white" />
              )}
            </div>
            <span className="max-w-36 truncate text-base font-bold text-white sm:max-w-56 md:text-xl">
              {displaySiteName}
            </span>
          </Link>
          <div className="hidden items-center gap-1.5 md:flex">
            <span className="flex items-center gap-1.5 rounded-md bg-lobster-500/20 px-2.5 py-1 text-xs font-bold text-lobster-400">
              <Shield aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.header.badge', 'Admin')}
            </span>
          </div>
        </div>

        <nav
          ref={moduleNavRef}
          aria-label={t('navbar.menu.label', 'Navigation menu')}
          className="relative hidden min-w-0 flex-1 items-center gap-1 px-3 md:flex"
          data-admin-header-module-nav
        >
          <div className="pointer-events-none absolute inset-x-3 top-1/2 h-10 -translate-y-1/2 overflow-hidden" aria-hidden="true">
            <div className="invisible flex w-max items-center gap-1">
              {allowedModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    ref={setModuleMeasureRef(mod.id)}
                    className="flex max-w-48 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium lg:px-4"
                    tabIndex={-1}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">{t(mod.nameKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-1 overflow-hidden" data-admin-header-visible-modules>
            {visibleModules.map((mod) => {
              const isActive = activeModule === mod.id;
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleModuleClick(mod)}
                  className={`flex max-w-48 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors lg:px-4 ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{t(mod.nameKey)}</span>
                </button>
              );
            })}
          </div>

          {overflowModules.length > 0 ? (
            <div className="relative shrink-0" ref={moduleMoreMenuRef}>
              <button
                aria-controls={MODULE_MORE_MENU_ID}
                aria-expanded={isModuleMoreMenuOpen}
                aria-haspopup="menu"
                aria-label={t('admin.header.more', 'More admin modules')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  overflowModules.some((mod) => mod.id === activeModule)
                    ? 'bg-white/15 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setIsModuleMoreMenuOpen((open) => !open)}
                type="button"
              >
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                <span>{t('admin.header.more', 'More')}</span>
                <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${isModuleMoreMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isModuleMoreMenuOpen ? (
                  <motion.div
                    id={MODULE_MORE_MENU_ID}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md bg-slate-800 py-1 shadow-2xl ring-1 ring-white/10"
                    data-admin-header-more-menu
                    role="menu"
                  >
                    <div className="max-h-[min(26rem,calc(100vh-6rem))] overflow-y-auto py-1">
                      {overflowModules.map((mod) => {
                        const isActive = activeModule === mod.id;
                        const Icon = mod.icon;
                        return (
                          <button
                            key={mod.id}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? 'bg-white/10 font-medium text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={() => handleModuleClick(mod)}
                            role="menuitem"
                            type="button"
                          >
                            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{t(mod.nameKey)}</span>
                            {isActive ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-lobster-400" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <div className="relative" ref={langMenuRef}>
            <button
              aria-controls={LANGUAGE_MENU_ID}
              aria-expanded={isLangMenuOpen}
              aria-haspopup="menu"
              aria-label={t('navbar.language.toggle', 'Toggle language menu')}
              onClick={() => setIsLangMenuOpen((open) => !open)}
              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              title={t('navbar.language.label', 'Language')}
              type="button"
            >
              <Globe aria-hidden="true" className="h-4 w-4" />
              <span className="text-sm font-medium uppercase">{resolvedLanguage}</span>
              <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isLangMenuOpen ? (
                <motion.div
                  id={LANGUAGE_MENU_ID}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-md bg-slate-800 py-1 shadow-lg ring-1 ring-white/10"
                  role="menu"
                >
                  {languages.map((lang) => {
                    const isActive = resolvedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        aria-checked={isActive}
                        onClick={() => changeLanguage(lang.code)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                        role="menuitemradio"
                        type="button"
                      >
                        <span className={isActive ? 'font-medium text-lobster-400' : undefined}>
                          {lang.name}
                        </span>
                        {isActive ? <Check aria-hidden="true" className="h-4 w-4 text-lobster-400" /> : null}
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            aria-label={themeToggleLabel}
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title={themeToggleLabel}
            type="button"
          >
            {isDark
              ? <Sun aria-hidden="true" className="h-5 w-5" />
              : <Moon aria-hidden="true" className="h-5 w-5" />}
          </button>

          {!isPortalSessionStored ? (
            <button
              onClick={handleSignIn}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              type="button"
            >
              {t('admin.header.signIn', 'Sign In')}
            </button>
          ) : (
            <Link
              to="/console"
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              {t('admin.header.console', 'Console')}
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <button
            aria-label={themeToggleLabel}
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            title={themeToggleLabel}
            type="button"
          >
            {isDark
              ? <Sun aria-hidden="true" className="h-5 w-5" />
              : <Moon aria-hidden="true" className="h-5 w-5" />}
          </button>
          <button
            ref={mobileMenuButtonRef}
            aria-controls={MOBILE_NAVIGATION_ID}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen
              ? t('navbar.menu.close', 'Close navigation menu')
              : t('navbar.menu.toggle', 'Open navigation menu')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onMobileMenuToggle}
            type="button"
          >
            {mobileMenuOpen
              ? <X aria-hidden="true" className="h-6 w-6" />
              : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-0 bottom-0 top-16 z-40 md:hidden"
            data-admin-mobile-navigation-layer
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/55"
              onClick={onMobileMenuClose}
            />
            <motion.aside
              ref={mobileNavigationRef}
              id={MOBILE_NAVIGATION_ID}
              aria-labelledby={MOBILE_NAVIGATION_TITLE_ID}
              aria-modal="true"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-hidden border-l border-white/10 bg-slate-900 shadow-2xl"
              data-admin-mobile-navigation
              role="dialog"
              tabIndex={-1}
            >
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Shield aria-hidden="true" className="h-4 w-4 text-lobster-400" />
                  <span id={MOBILE_NAVIGATION_TITLE_ID}>{t('admin.header.badge', 'Admin')}</span>
                </div>
                <button
                  aria-label={t('navbar.menu.close', 'Close navigation menu')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  onClick={onMobileMenuClose}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <nav
                aria-label={t('admin.header.modules', 'Admin modules')}
                className="max-h-40 shrink-0 overflow-y-auto border-b border-white/10 p-3"
              >
                <div className="grid grid-cols-1 gap-1">
                  {allowedModules.map((mod) => {
                    const isActive = activeModule === mod.id;
                    const Icon = mod.icon;
                    return (
                      <button
                        key={mod.id}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          handleModuleClick(mod);
                          onMobileMenuClose();
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                        type="button"
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{t(mod.nameKey)}</span>
                        {isActive ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-lobster-400" /> : null}
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
                <div className="flex items-center gap-2" role="group" aria-label={t('navbar.language.label', 'Language')}>
                  <Globe aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                  {languages.map((lang) => {
                    const isActive = resolvedLanguage === lang.code;
                    return (
                      <button
                        key={lang.code}
                        aria-pressed={isActive}
                        onClick={() => changeLanguage(lang.code)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                        type="button"
                      >
                        {lang.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1">{mobileNavigation}</div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
