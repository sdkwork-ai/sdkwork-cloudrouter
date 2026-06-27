import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { useSiteBranding } from '@sdkwork/clawroutes-pc-commons/runtime';
import { readMediaResourceUrl } from '@sdkwork/clawroutes-pc-commons/runtime';
import { ADMIN_MODULES, type AdminModuleDef, type AdminModuleId } from './adminModuleRegistry.ts';
import { listVisibleAdminModuleIds } from './admin-menu-permissions.ts';

export { ADMIN_MODULES, getActiveModuleFromPath, type AdminModuleDef, type AdminModuleId } from './adminModuleRegistry.ts';

interface AdminHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeModule: AdminModuleId;
  onModuleChange: (moduleId: AdminModuleId) => void;
}

const MODULE_NAV_GAP_PX = 4;
const MODULE_MORE_BUTTON_WIDTH_PX = 108;
const MODULE_NAV_PADDING_PX = 16;
const MIN_VISIBLE_MODULES = 1;

export function AdminHeader({ isDark, toggleTheme, activeModule, onModuleChange }: AdminHeaderProps) {
  const { t, i18n } = useTranslation();
  const siteBranding = useSiteBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isModuleMoreMenuOpen, setIsModuleMoreMenuOpen] = useState(false);
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());
  const allowedModules = useMemo(
    () => {
      const allowedIds = new Set(listVisibleAdminModuleIds(permissionScope));
      return ADMIN_MODULES.filter((mod) => allowedIds.has(mod.id));
    },
    [permissionScope],
  );
  const [visibleModuleIds, setVisibleModuleIds] = useState<AdminModuleId[]>(() => allowedModules.map((mod) => mod.id));
  const [isPortalSessionStored, setIsPortalSessionStored] = useState(() => hasStoredPortalSession());
  const moduleNavRef = useRef<HTMLElement>(null);
  const moduleMoreMenuRef = useRef<HTMLDivElement>(null);
  const moduleMeasureRefs = useRef(new Map<AdminModuleId, HTMLButtonElement>());
  const langMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const logoSource = readMediaResourceUrl(siteBranding.logo);

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
      const moreWidth = hasOverflow ? MODULE_MORE_BUTTON_WIDTH_PX + (moduleIds.length > 0 ? MODULE_NAV_GAP_PX : 0) : 0;
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
      if (currentIds.length === nextVisibleIds.length && currentIds.every((id, index) => id === nextVisibleIds[index])) {
        return currentIds;
      }
      return nextVisibleIds;
    });
  }, [activeModule, allowedModules]);

  useEffect(() => {
    setVisibleModuleIds((currentIds) => {
      const allowedIds = new Set(allowedModules.map((mod) => mod.id));
      const filtered = currentIds.filter((id) => allowedIds.has(id));
      if (filtered.length > 0) {
        return filtered;
      }
      return allowedModules.map((mod) => mod.id);
    });
  }, [allowedModules]);

  const visibleModuleIdSet = new Set(visibleModuleIds);
  const visibleModules = allowedModules.filter((mod) => visibleModuleIdSet.has(mod.id));
  const overflowModules = allowedModules.filter((mod) => !visibleModuleIdSet.has(mod.id));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncPortalSessionState = () => {
      setIsPortalSessionStored(hasStoredPortalSession());
      setPermissionScope(readPortalPermissionScope());
    };
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

  useLayoutEffect(() => {
    calculateVisibleModules();
  }, [calculateVisibleModules, i18n.resolvedLanguage, displaySiteName, isPortalSessionStored]);

  useEffect(() => {
    const nav = moduleNavRef.current;
    if (!nav) {
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

  const changeLanguage = (lang: string) => {
    localStorage.setItem('user_explicit_lang', lang);
    localStorage.removeItem('i18nextLng');
    i18n.changeLanguage(lang);
    setIsLangMenuOpen(false);
  };

  const handleModuleClick = (mod: AdminModuleDef) => {
    onModuleChange(mod.id);
    navigate(mod.defaultPath);
    setIsModuleMoreMenuOpen(false);
  };

  const handleSignIn = () => {
    navigate(buildPortalAuthLoginRedirect(location));
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: t('admin.header.lang.zh', '中文') },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/95 py-3 backdrop-blur-md dark:bg-slate-950/95'
          : 'bg-slate-900 py-4 dark:bg-slate-950'
      }`}
    >
      <div className="mx-auto flex w-full items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              {logoSource ? (
                <img src={logoSource} alt={siteBranding.siteName} className="h-5 w-5 object-contain" />
              ) : (
                <Terminal className="h-5 w-5 text-white" />
              )}
            </div>
            <span className="text-xl font-bold tracking-tight text-white">{displaySiteName}</span>
          </Link>
          <div className="hidden items-center gap-1.5 md:flex">
            <span className="flex items-center gap-1.5 rounded-md bg-lobster-500/20 px-2.5 py-1 text-xs font-bold text-lobster-400">
              <Shield className="h-3.5 w-3.5" />
              {t('admin.header.badge', 'Admin')}
            </span>
          </div>
        </div>

        <nav ref={moduleNavRef} className="relative hidden min-w-0 flex-1 items-center gap-1 px-3 md:flex" data-admin-header-module-nav>
          <div className="pointer-events-none absolute inset-x-3 top-1/2 h-10 -translate-y-1/2 overflow-hidden" aria-hidden="true">
            <div className="invisible flex w-max items-center gap-1">
              {ADMIN_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    ref={setModuleMeasureRef(mod.id)}
                    className="flex max-w-48 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium lg:px-4"
                    tabIndex={-1}
                    type="button"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
                  onClick={() => handleModuleClick(mod)}
                  className={`flex max-w-48 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all lg:px-4 ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{t(mod.nameKey)}</span>
                </button>
              );
            })}
          </div>

          {overflowModules.length > 0 ? (
            <div className="relative shrink-0" ref={moduleMoreMenuRef}>
              <button
                aria-expanded={isModuleMoreMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  overflowModules.some((mod) => mod.id === activeModule)
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setIsModuleMoreMenuOpen((open) => !open)}
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span>{t('admin.header.more', 'More')}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isModuleMoreMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isModuleMoreMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg bg-slate-800 py-1 shadow-2xl ring-1 ring-white/10"
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
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? 'bg-white/10 font-medium text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                            onClick={() => handleModuleClick(mod)}
                            role="menuitem"
                            type="button"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{t(mod.nameKey)}</span>
                            {isActive ? <Check className="h-4 w-4 shrink-0 text-lobster-400" /> : null}
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

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              type="button"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium uppercase">{i18n.resolvedLanguage || 'EN'}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isLangMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-32 overflow-hidden bg-slate-800 py-1 shadow-lg ring-1 ring-white/10"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-white/10"
                      type="button"
                    >
                      <span className={i18n.resolvedLanguage === lang.code ? 'font-medium text-lobster-400' : 'text-slate-300'}>
                        {lang.name}
                      </span>
                      {i18n.resolvedLanguage === lang.code ? <Check className="h-4 w-4 text-lobster-400" /> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className="text-slate-300 transition-colors hover:text-white"
            type="button"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              {t('admin.header.console', 'Console')}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <button onClick={toggleTheme} className="text-slate-300" type="button">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            className="text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full flex flex-col gap-3 bg-slate-900 p-6 shadow-2xl md:hidden"
        >
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => { handleModuleClick(mod); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 text-base font-medium ${
                  activeModule === mod.id ? 'text-lobster-400' : 'text-slate-300 hover:text-white'
                }`}
                type="button"
              >
                <Icon className="h-5 w-5" />
                {t(mod.nameKey)}
              </button>
            );
          })}
          <div className="my-2 h-px bg-white/10" />
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Language</span>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { changeLanguage(lang.code); setMobileMenuOpen(false); }}
                className="flex items-center justify-between text-left text-base font-medium"
                type="button"
              >
                <span className={i18n.resolvedLanguage === lang.code ? 'text-lobster-400' : 'text-slate-300'}>
                  {lang.name}
                </span>
                {i18n.resolvedLanguage === lang.code ? <Check className="h-4 w-4 text-lobster-400" /> : null}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </header>
  );
}
