import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  readPortalPermissionScope,
  revokeAppSession,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { AdminHeader } from './AdminHeader.tsx';
import {
  getFilteredAdminModuleMenu,
  listVisibleAdminModuleIds,
} from './admin-menu-permissions.ts';
import { AdminRoutePermissionGuard } from './AdminRoutePermissionGuard.tsx';
import { hasActiveSidebarGroupItem, isSidebarItemActive } from './adminSidebarActive.ts';
import {
  ADMIN_MODULES,
  getActiveModuleFromPath,
  type AdminMenuGroup,
  type AdminMenuItem,
  type AdminModuleId,
  type AdminModuleMenu,
} from './adminModuleRegistry.ts';

const ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN = true;

function sidebarItemClassName(): string {
  return 'sdkwork-portal-sidebar-item';
}

function SidebarGroup({
  group,
  defaultOpen,
  onNavigate,
}: {
  group: AdminMenuGroup;
  defaultOpen: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const groupItemsId = useId();
  const hasActiveChild = hasActiveSidebarGroupItem(location.pathname, group);

  return (
    <div className="mb-1">
      <button
        aria-controls={groupItemsId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        data-active={hasActiveChild ? 'true' : 'false'}
        className="sdkwork-portal-sidebar-group-label"
        type="button"
      >
        <span>{t(group.groupKey)}</span>
        {isOpen ? (
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        )}
      </button>
      {isOpen ? (
        <div id={groupItemsId} className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const isActive = isSidebarItemActive(location.pathname, item, group.items);

            return (
              <Link
                key={item.path}
                to={item.path}
                data-active={isActive ? 'true' : 'false'}
                aria-current={isActive ? 'page' : undefined}
                className={sidebarItemClassName()}
                onClick={onNavigate}
              >
                <item.icon aria-hidden="true" className={`sdkwork-portal-sidebar-item__icon h-4 w-4 ${item.iconColor ?? ''}`} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SidebarItem({
  item,
  siblingItems,
  onNavigate,
}: {
  item: AdminMenuItem;
  siblingItems: readonly AdminMenuItem[];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const isActive = isSidebarItemActive(location.pathname, item, siblingItems);

  return (
    <Link
      key={item.path}
      to={item.path}
      data-active={isActive ? 'true' : 'false'}
      aria-current={isActive ? 'page' : undefined}
      className={sidebarItemClassName()}
      onClick={onNavigate}
    >
      <item.icon aria-hidden="true" className={`sdkwork-portal-sidebar-item__icon h-4 w-4 ${item.iconColor ?? ''}`} />
      {t(item.labelKey)}
    </Link>
  );
}

function AdminSidebarPanel({
  currentModuleMenu,
  isLoggingOut,
  onLogout,
  onNavigate,
}: {
  currentModuleMenu: AdminModuleMenu;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white dark:bg-[#17191f]">
      <nav
        aria-label={t('navbar.menu.label', 'Navigation menu')}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3"
      >
        {currentModuleMenu.items?.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            siblingItems={currentModuleMenu.items ?? []}
            onNavigate={onNavigate}
          />
        ))}
        {currentModuleMenu.groups.map((group) => (
          <SidebarGroup
            key={group.groupKey}
            group={group}
            defaultOpen={ADMIN_SIDEBAR_GROUPS_DEFAULT_OPEN}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-white/10">
        <button
          aria-busy={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          disabled={isLoggingOut}
          onClick={() => void onLogout()}
          type="button"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {t('admin.menu.logout')}
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  const activeModule = useMemo<AdminModuleId>(
    () => getActiveModuleFromPath(location.pathname),
    [location.pathname],
  );

  const currentModuleMenu = useMemo(
    () => getFilteredAdminModuleMenu(activeModule, permissionScope),
    [activeModule, permissionScope],
  );

  const allowedModules = useMemo(() => {
    const visibleModuleIds = new Set(listVisibleAdminModuleIds(permissionScope));
    return ADMIN_MODULES.filter((module) => visibleModuleIds.has(module.id));
  }, [permissionScope]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((open) => !open), []);

  useEffect(() => {
    closeMobileMenu();
  }, [closeMobileMenu, location.pathname]);

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia('(min-width: 768px)');
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMobileMenu();
      }
    };

    if (desktopMediaQuery.matches) {
      closeMobileMenu();
    }
    desktopMediaQuery.addEventListener('change', closeAtDesktopBreakpoint);
    return () => desktopMediaQuery.removeEventListener('change', closeAtDesktopBreakpoint);
  }, [closeMobileMenu]);

  const handleLogout = useCallback(async () => {
    closeMobileMenu();
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await revokeAppSession();
    } finally {
      navigate('/', { replace: true });
    }
  }, [closeMobileMenu, isLoggingOut, navigate]);

  return (
    <div className="sdkwork-admin-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 dark:bg-[#0f1115] dark:text-white">
      <AdminHeader
        isDark={isDark}
        toggleTheme={toggleTheme}
        activeModule={activeModule}
        allowedModules={allowedModules}
        mobileMenuOpen={mobileMenuOpen}
        mobileNavigation={(
          <AdminSidebarPanel
            currentModuleMenu={currentModuleMenu}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
            onNavigate={closeMobileMenu}
          />
        )}
        onMobileMenuClose={closeMobileMenu}
        onMobileMenuToggle={toggleMobileMenu}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden pt-16">
        <aside
          className="hidden min-h-0 w-64 shrink-0 overflow-hidden border-r border-slate-200 md:flex dark:border-white/10"
          data-admin-desktop-sidebar
        >
          <AdminSidebarPanel
            currentModuleMenu={currentModuleMenu}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
          />
        </aside>

        <main className="relative flex min-h-0 w-full max-w-none min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#0f1115]">
          <div className="flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden p-0">
            <AdminRoutePermissionGuard>
              <Outlet />
            </AdminRoutePermissionGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
