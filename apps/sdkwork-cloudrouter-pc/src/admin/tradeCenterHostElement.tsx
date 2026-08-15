import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  SdkworkOrderTradeCenterAdminApp,
  TradeAdminLinkProvider,
  type TradeAdminCapabilities,
  type TradeAdminLinkProps,
} from '@sdkwork/order-pc-admin-trade';
import { OrderAdminLinkProvider, type OrderAdminLinkProps } from '@sdkwork/order-pc-admin-orders';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Cloud Router host adaptation element for the sdkwork-order trading center.
 *
 * The trading center screens owned by `@sdkwork/order-pc-admin-trade` never
 * read host session, permission, i18n, or router state; the host projects its
 * portal permission scope into the package's capability props, injects the
 * SPA `Link` renderer, and forwards the `:sectionId?` route param plus the
 * current portal language (the package resolves its own en/zh copy from the
 * locale). All trading content (screens, services, menu and route metadata,
 * copy) lives in the sdkwork-order workspace.
 */
function useTradeAdminCapabilities(): TradeAdminCapabilities {
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  return useMemo(() => ({
    canManageOrders: hasPortalPermission('commerce.orders.manage', permissionScope),
    canReviewTrade: hasPortalPermission('commerce.orders.review', permissionScope),
    canConfirmPayment: hasPortalPermission('commerce.orders.fulfill', permissionScope),
  }), [permissionScope]);
}

function resolveOrderLocale(resolvedLanguage: string | undefined): string {
  if (!resolvedLanguage) {
    return 'zh-CN';
  }
  return resolvedLanguage.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

function SpaTradeLink({ href, children, ...rest }: TradeAdminLinkProps) {
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

/**
 * Resolves the trading center section from the location pathname.
 *
 * Host routes are registered as explicit paths (`trade/after-sales`, …) so
 * each record carries its own permission hint; there is no `:sectionId?`
 * route param to read, so the section is derived from the pathname instead.
 */
function resolveTradeSectionFromPath(pathname: string): string {
  const normalized = pathname.replace(/^\/admin\/trade\/?/, '');
  return normalized.split('/')[0] || 'overview';
}

export function TradeCenterHostElement() {
  const { pathname } = useLocation();
  const capabilities = useTradeAdminCapabilities();
  const { i18n } = useTranslation();
  return (
    <TradeAdminLinkProvider linkComponent={SpaTradeLink}>
      <OrderAdminLinkProvider linkComponent={SpaTradeLink}>
        <SdkworkOrderTradeCenterAdminApp
          sectionId={resolveTradeSectionFromPath(pathname)}
          capabilities={capabilities}
          locale={resolveOrderLocale(i18n.resolvedLanguage)}
        />
      </OrderAdminLinkProvider>
    </TradeAdminLinkProvider>
  );
}
