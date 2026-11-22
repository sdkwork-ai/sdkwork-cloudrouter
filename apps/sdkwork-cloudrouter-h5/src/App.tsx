import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AppAuthorizeEntryPage, AppLaunchPage, AppSignInPage } from './app-auth/AppAuthPages.js';
import { APP_OAUTH_CALLBACK_PATH } from './app-auth/appAuthorizeEntry.js';
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
  useConsoleRuntime,
  type ConsoleRuntimeConfiguration,
} from './providers/AppProviders.js';
import { CommunityRoutes } from '@sdkwork/cloudrouter-h5-community';

/**
 * ``bootstrapH5Application()`` configures the console runtime before the first
 * render (`src/main.tsx`); the pending configuration is consumed exactly once
 * here so the provider tree and the router share one runtime value.
 *
 * The hosted app sign-in routes are siblings of the console assembly: they
 * serve a native application's browser login and must render without the
 * console authentication gate, which would otherwise capture the visitor
 * before the authorization hand-off can run.
 *
 * Routing uses the History API (`BrowserRouter`), the same mode as the PC
 * renderer: the deployment serves both surfaces with an `/index.html` SPA
 * fallback, and the cashier deep link the order/payment backend emits
 * (`/cashier/{orderId}?scene=..&outTradeNo=..`) must render from that pathname
 * instead of being folded into a `#/` route.
 */
/**
 * Community host route: the community pages need the console locale and the
 * IAM session, both supplied by the runtime provider mounted above.
 */
function CommunityHostRoute() {
  const { locale } = useConsoleRuntime();
  return (
    <AppAuthGate>
      <CommunityRoutes locale={locale} />
    </AppAuthGate>
  );
}

export function App() {
  const [configuration] = useState<ConsoleRuntimeConfiguration | null>(
    () => consumePendingConsoleRuntime(),
  );
  if (!configuration) {
    throw new Error('CloudRouter H5 console runtime was not configured before render.');
  }
  return (
    <BrowserRouter>
      <ConsoleRuntimeProvider configuration={configuration}>
        <Routes>
          <Route path="/oauth/app" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/v3/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/iam/oauth/authorize" element={<AppAuthorizeEntryPage />} />
          <Route path="/oauth/login" element={<AppSignInPage />} />
          <Route path="/oauth/desktop/launch" element={<AppLaunchPage />} />
          {/* The website's own sign-in page, which is also the scan-login QR
              target the IAM server emits (`/auth/login?session_key=…`). The
              OAuth flow never lands here: its login step is `/oauth/login`. */}
          <Route path="/auth/login" element={<ConsoleSignInRoute />} />
          {/* Shared IAM H5 OAuth callback: the IAM login surface redirects the
              browser to this real path, which the history router renders
              directly so the same screen resumes the session exchange. */}
          <Route path={APP_OAUTH_CALLBACK_PATH} element={<IamOAuthCallbackRoute />} />
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
          {/* Community (circles and groups) is a stacked workspace outside the
              tab shell: the community-owned mobile pages own their headers and
              flow, and the route catalog matches sdkwork-im H5. */}
          <Route path="/community/*" element={<CommunityHostRoute />} />
          <Route path="*" element={<ConsoleRouteAssembly />} />
        </Routes>
      </ConsoleRuntimeProvider>
    </BrowserRouter>
  );
}
