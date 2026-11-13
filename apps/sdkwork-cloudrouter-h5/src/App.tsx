import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppAuthorizeEntryPage, AppLaunchPage, AppSignInPage } from './app-auth/AppAuthPages.js';
import { AppAuthGate, ConsoleSignInRoute } from './AuthGate.js';
import { CLOUDROUTER_H5_ORDER_ROUTES } from '@sdkwork/cloudrouter-h5-orders/routes';
import { ConsoleRouteAssembly, MessagesDetailRoute, SettingsRoute } from './routes/consoleRoutes.js';
import { MembershipRoute, RechargeRoute } from './routes/CommerceRoutes.js';
import { IamOAuthCallbackRoute } from './routes/IamAuthRoutes.js';
import {
  CashierEntryRoute,
  OrderCashierRoute,
  OrderCenterRoute,
  OrderDetailRoute,
  RefundRequestsRoute,
} from './routes/OrderRoutes.js';
import {
  ConsoleRuntimeProvider,
  consumePendingConsoleRuntime,
  type ConsoleRuntimeConfiguration,
} from './providers/AppProviders.js';

/**
 * ``bootstrapH5Application()`` configures the console runtime before the first
 * render (`src/main.tsx`); the pending configuration is consumed exactly once
 * here so the provider tree and the router share one runtime value.
 *
 * The hosted app sign-in routes are siblings of the console assembly: they
 * serve a native application's browser login and must render without the
 * console authentication gate, which would otherwise capture the visitor
 * before the authorization hand-off can run.
 */
export function App() {
  const [configuration] = useState<ConsoleRuntimeConfiguration | null>(
    () => consumePendingConsoleRuntime(),
  );
  if (!configuration) {
    throw new Error('CloudRouter H5 console runtime was not configured before render.');
  }
  return (
    <HashRouter>
      <ConsoleRuntimeProvider configuration={configuration}>
        <Routes>
          <Route path="/auth/app" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/v3/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/auth/login" element={<AppSignInPage />} />
          <Route path="/auth/desktop/launch" element={<AppLaunchPage />} />
          {/* Shared IAM H5 OAuth callback: the IAM login surface redirects the
              browser to this real path, and the bootstrap adopts it into the hash
              router so the same screen resumes the session exchange. */}
          <Route path="/auth/oauth/callback" element={<IamOAuthCallbackRoute />} />
          {/* Order/cashier surfaces render outside the console shell: the
              unified cashier entry (`/cashier/:orderId`) is emitted by the
              order/payment backend, and `/me/orders/...` keeps the exact
              sdkwork-im path shape. */}
          <Route path={CLOUDROUTER_H5_ORDER_ROUTES.cashierEntry.path} element={<CashierEntryRoute />} />
          <Route path={CLOUDROUTER_H5_ORDER_ROUTES.orderCashier.path} element={<OrderCashierRoute />} />
          <Route path={CLOUDROUTER_H5_ORDER_ROUTES.refundRequests.path} element={<RefundRequestsRoute />} />
          <Route path={CLOUDROUTER_H5_ORDER_ROUTES.orderDetail.path} element={<OrderDetailRoute />} />
          <Route path={CLOUDROUTER_H5_ORDER_ROUTES.orderCenter.path} element={<OrderCenterRoute />} />
          {/* IM chat detail is a stacked screen outside the tab shell, matching
              the IM H5 `/chat/:conversationId` route shape used by ChatList. */}
          <Route
            path="/chat/:conversationId"
            element={
              <AppAuthGate>
                <div className="h-full min-h-0 bg-canvas">
                  <MessagesDetailRoute />
                </div>
              </AppAuthGate>
            }
          />
          {/* Console sign-in is a dedicated screen outside the tab shell: the
              home tab stays public, protected tabs link here, and the shell
              keeps rendering the tab bar only on the four tab roots. */}
          <Route path="/sign-in" element={<ConsoleSignInRoute />} />
          {/* Membership purchase and points recharge are stacked commerce
              screens reached from the home tab; they render outside the tab
              shell so the commerce pages own their own back/title bar. */}
          <Route path="/membership" element={<MembershipRoute />} />
          <Route path="/recharge" element={<RechargeRoute />} />
          {/* Settings is a stacked page reached from 我的; the shared settings
              center owns its own header/back and list/detail composition. */}
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="*" element={<ConsoleRouteAssembly />} />
        </Routes>
      </ConsoleRuntimeProvider>
    </HashRouter>
  );
}
