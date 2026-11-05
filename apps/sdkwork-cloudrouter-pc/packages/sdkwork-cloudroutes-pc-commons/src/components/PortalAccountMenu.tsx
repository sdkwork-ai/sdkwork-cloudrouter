import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, LayoutDashboard, LogOut, Settings, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ANONYMOUS_PORTAL_ACCOUNT,
  fetchPortalAccountProfile,
  loadPortalAccountProfile,
  signOutPortalAccount,
  subscribePortalAccountChange,
  type PortalAccountProfile,
} from '../portal-account.ts';

const CLOSE_DELAY_MS = 140;

/** Visual context the header chip renders in. */
export type PortalAccountMenuVariant = 'portal' | 'admin';

/** Props of the signed-in account chip and its hover dropdown. */
export interface PortalAccountMenuProps {
  /** Header tone: the public/console navbar or the always-dark admin header. */
  variant?: PortalAccountMenuVariant;
  /** Extra classes on the positioning wrapper. */
  className?: string;
  /** Called after an account entry navigates or the session ends, so a host drawer can close. */
  onNavigate?: () => void;
}

const TRIGGER_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'text-slate-300 hover:bg-white/10 hover:text-white',
  portal: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10',
};

const AVATAR_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'bg-white/15 text-white',
  portal: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
};

const MENU_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'bg-slate-800 text-slate-200 shadow-2xl ring-1 ring-white/10',
  portal:
    'border border-slate-200 bg-white text-slate-700 shadow-lg dark:border-slate-700/60 dark:bg-[#1a1a1a] dark:text-slate-200',
};

const MENU_HEADER_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'border-white/10',
  portal: 'border-slate-200 dark:border-white/10',
};

const MENU_DIVIDER_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'border-white/10',
  portal: 'border-slate-200 dark:border-white/10',
};

const MUTED_TONE: Record<PortalAccountMenuVariant, string> = {
  admin: 'text-slate-400',
  portal: 'text-slate-500 dark:text-slate-400',
};

/**
 * Render the signed-in account chip every authenticated header shares.
 *
 * The trigger shows the account avatar (or initials) and display name; the
 * dropdown opens on pointer hover, on focus, and on click, so it is usable with
 * a mouse, a keyboard, and a touch screen. It closes on pointer leave (after a
 * short delay that lets the pointer reach the menu), on an outside pointer
 * down, on Escape, and after an action. The menu carries the "signed in as"
 * identity, the console account entries, and sign out; signing out revokes the
 * IAM session and returns the browser to the public home page.
 * @param props - header variant and extra positioning classes.
 * @returns the account chip while signed in; null while signed out.
 */
export function PortalAccountMenu({ variant = 'portal', className, onNavigate }: PortalAccountMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuId = `portal-account-menu-${useId().replace(/[^a-zA-Z0-9_-]/gu, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profile, setProfile] = useState<PortalAccountProfile>(() => loadPortalAccountProfile());
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileLoadStartedRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    const sync = () => {
      setProfile(loadPortalAccountProfile());
    };
    sync();
    return subscribePortalAccountChange(sync);
  }, []);

  useEffect(() => {
    if (!profile.signedIn) {
      profileLoadStartedRef.current = false;
      return;
    }
    if (profileLoadStartedRef.current) {
      return;
    }
    profileLoadStartedRef.current = true;
    let active = true;
    void fetchPortalAccountProfile().then((nextProfile) => {
      if (active && nextProfile) {
        setProfile(nextProfile);
      }
    });
    return () => {
      active = false;
    };
  }, [profile.signedIn]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  if (!profile.signedIn) {
    return null;
  }

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
    onNavigate?.();
  };

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setOpen(false);
    try {
      await signOutPortalAccount();
    } finally {
      setSigningOut(false);
      setProfile(ANONYMOUS_PORTAL_ACCOUNT);
      navigate('/', { replace: true });
      onNavigate?.();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (containerRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') {
      return;
    }
    event.stopPropagation();
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative shrink-0 ${className ?? ''}`}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('commons.account.menu', 'Account menu')}
        className={`flex h-9 max-w-[11rem] items-center gap-2 rounded-full px-1.5 pr-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 lg:max-w-[9rem] xl:max-w-[14rem] ${TRIGGER_TONE[variant]}`}
        onClick={openMenu}
        onFocus={openMenu}
        type="button"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${AVATAR_TONE[variant]}`}
          data-portal-account-avatar
        >
          {profile.avatarUrl ? (
            <img
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              src={profile.avatarUrl}
            />
          ) : (
            profile.initials || '?'
          )}
        </span>
        <span className="min-w-0 truncate" data-portal-account-name>{profile.displayName}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          aria-label={t('commons.account.menu', 'Account menu')}
          className={`absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg ${MENU_TONE[variant]}`}
          data-portal-account-menu
          id={menuId}
          role="menu"
        >
          <div className={`border-b px-4 py-3 ${MENU_HEADER_TONE[variant]}`}>
            <div className={`text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${MUTED_TONE[variant]}`}>
              {t('commons.account.signedInAs', 'Signed in as')}
            </div>
            <div className="mt-1 truncate text-sm font-semibold" data-portal-account-menu-name>
              {profile.displayName}
            </div>
            {profile.email ? (
              <div className={`mt-0.5 truncate text-xs ${MUTED_TONE[variant]}`}>{profile.email}</div>
            ) : null}
          </div>

          <div className="py-1">
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:bg-white/5"
              onClick={() => {
                handleSelect('/console');
              }}
              role="menuitem"
              type="button"
            >
              <LayoutDashboard aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t('commons.account.console', 'Console')}
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:bg-white/5"
              onClick={() => {
                handleSelect('/console/user');
              }}
              role="menuitem"
              type="button"
            >
              <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t('commons.account.overview', 'Account')}
            </button>
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:bg-white/5"
              onClick={() => {
                handleSelect('/console/settings');
              }}
              role="menuitem"
              type="button"
            >
              <Settings aria-hidden="true" className="h-4 w-4 shrink-0" />
              {t('commons.account.settings', 'Settings')}
            </button>
          </div>

          <div className={`border-t py-1 ${MENU_DIVIDER_TONE[variant]}`}>
            <button
              aria-busy={signingOut}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
              disabled={signingOut}
              onClick={() => {
                void handleSignOut();
              }}
              role="menuitem"
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
              {signingOut
                ? t('commons.account.signingOut', 'Signing out...')
                : t('commons.account.signOut', 'Sign out')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
