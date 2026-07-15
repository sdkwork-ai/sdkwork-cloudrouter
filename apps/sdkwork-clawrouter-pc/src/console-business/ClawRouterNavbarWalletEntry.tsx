import { useEffect, useRef, useState } from 'react';
import { Coins, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  normalizeSdkworkWalletLocale,
  SdkworkWalletIntlProvider,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
} from '@sdkwork/account-pc-wallet';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';
import { ClawRouterNavbarWalletQuickPanel } from './ClawRouterNavbarWalletQuickPanel.tsx';
import type { ClawRouterConsoleBusinessHostConfig } from './consoleBusinessConfig.ts';
import { useConsoleBusinessNavigation } from './consoleBusinessNavigation.ts';

export interface ClawRouterNavbarWalletEntryProps extends ClawRouterConsoleBusinessHostConfig {
  isDark: boolean;
}

export function ClawRouterNavbarWalletEntry({
  routePrefix,
}: ClawRouterNavbarWalletEntryProps) {
  const { i18n, t } = useTranslation();
  const { accountPath, onNavigate, walletPath } = useConsoleBusinessNavigation({ routePrefix });
  const walletLocale = normalizeSdkworkWalletLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <div className="claw-router-navbar-wallet-entry flex items-center gap-2">
      <SdkworkWalletIntlProvider locale={walletLocale}>
        <ClawRouterNavbarWalletEntryContent
          accountLabel={t('console.navbar.account', 'Account')}
          onOpenAccount={() => onNavigate(accountPath)}
          onOpenWallet={() => onNavigate(walletPath)}
        />
      </SdkworkWalletIntlProvider>
    </div>
  );
}

function ClawRouterNavbarWalletEntryContent({
  accountLabel,
  onOpenAccount,
  onOpenWallet,
}: {
  accountLabel: string;
  onOpenAccount: () => void;
  onOpenWallet: () => void;
}) {
  const controller = useSdkworkWalletController();
  const state = useSdkworkWalletControllerState(controller);
  const isAuthenticated = usePortalIamSession();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const entryRef = useRef<HTMLDivElement>(null);
  const { copy, formatPoints } = useSdkworkWalletIntl();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  useEffect(() => {
    if (!isPanelOpen) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!entryRef.current?.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPanelOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPanelOpen]);

  function openWallet() {
    setIsPanelOpen(false);
    onOpenWallet();
  }

  return (
    <div className="relative flex items-center gap-2" ref={entryRef}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[1rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel-muted)] px-3 text-sm font-medium text-[var(--sdk-color-text-primary)]"
        onClick={onOpenAccount}
        type="button"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {accountLabel}
      </button>
      <button
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
        aria-label={copy.headerEntry.balanceAriaLabel}
        className="flex h-9 items-center gap-2 rounded-[1rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel-muted)] px-3 text-sm font-medium text-[var(--sdk-color-text-primary)]"
        onClick={() => setIsPanelOpen((current) => !current)}
        type="button"
      >
        <Coins className="h-4 w-4" aria-hidden="true" />
        {formatPoints(state.overview.account.availablePoints)} {copy.headerEntry.pointsSuffix}
      </button>
      {isPanelOpen ? (
        <div
          aria-label={copy.headerEntry.balanceAriaLabel}
          className="absolute right-0 top-[calc(100%+0.625rem)] z-50"
          role="dialog"
        >
          <ClawRouterNavbarWalletQuickPanel
            onOpenPage={openWallet}
            onRecharge={openWallet}
            onWithdraw={openWallet}
            overview={{ ...state.overview, isAuthenticated }}
          />
        </div>
      ) : null}
    </div>
  );
}
