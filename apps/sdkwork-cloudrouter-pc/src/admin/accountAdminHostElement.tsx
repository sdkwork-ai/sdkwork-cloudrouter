/**
 * Account centre screens for the Cloud Router admin host.
 *
 * Each screen acquires the admin service when it renders, not when this module is
 * imported: `main.tsx` runs `configureCloudRouterAccountBackendSdkClient()` before
 * mounting the app, and a module-scope `getSdkworkAccountBackendService()` would run
 * earlier — during the import graph walk — and capture a client that has no token
 * manager yet. Deferring to render keeps the wiring order irrelevant.
 *
 * The host owns routing, permissions and layout; the account package owns the views
 * and their copy, so each screen only injects the service and the message bundle.
 */

import { useState } from "react";

import {
  SdkworkAccountsOverviewPage,
  SdkworkAccountsDirectoryPage,
  SdkworkLedgerPage,
  SdkworkAllowancesPage,
  SdkworkPolicyPage,
  SdkworkAdmissionSimulatePage,
  accountsAdminMessages,
  createSdkworkAccountAdminService,
  type SdkworkAccountAdminScope,
  type SdkworkAccountAdminService,
} from "@sdkwork/account-pc-admin-accounts";

import { getCloudRouterAccountAdminClient } from "./accountSdkHostWiring.ts";

/**
 * Scope used before an operator narrows one.
 *
 * An empty scope means "the caller's own subject": the backend derives the tenant
 * from the access token and falls back to the operator for the wallet owner, so the
 * console never needs to guess an id to render its first screen.
 */
const DEFAULT_SCOPE: SdkworkAccountAdminScope = {};

const messages = accountsAdminMessages("zh-CN");

/** Resolves the injected service once per mounted screen. */
function useAccountAdminService(): SdkworkAccountAdminService {
  const [service] = useState(() =>
    createSdkworkAccountAdminService(getCloudRouterAccountAdminClient()),
  );
  return service;
}

export function AccountOverviewAdminScreen() {
  const service = useAccountAdminService();
  return <SdkworkAccountsOverviewPage service={service} scope={DEFAULT_SCOPE} copy={messages.overview} />;
}

export function AccountDirectoryAdminScreen() {
  const service = useAccountAdminService();
  return <SdkworkAccountsDirectoryPage service={service} scope={DEFAULT_SCOPE} copy={messages.directory} />;
}

export function AccountLedgerAdminScreen() {
  const service = useAccountAdminService();
  return <SdkworkLedgerPage service={service} scope={DEFAULT_SCOPE} copy={messages.ledger} />;
}

export function AccountAllowancesAdminScreen() {
  const service = useAccountAdminService();
  return <SdkworkAllowancesPage service={service} scope={DEFAULT_SCOPE} copy={messages.allowances} />;
}

export function AccountPolicyAdminScreen() {
  const service = useAccountAdminService();
  return <SdkworkPolicyPage service={service} scope={DEFAULT_SCOPE} copy={messages.policy} />;
}

export function AccountSimulateAdminScreen() {
  const service = useAccountAdminService();
  return (
    <SdkworkAdmissionSimulatePage service={service} defaultScope={DEFAULT_SCOPE} copy={messages.simulate} />
  );
}

/** Screen key to element, mirroring `ACCOUNTS_ADMIN_ROUTE_RECORDS[].screen`. */
export const ACCOUNT_ADMIN_ROUTE_ELEMENTS = {
  overview: <AccountOverviewAdminScreen />,
  directory: <AccountDirectoryAdminScreen />,
  ledger: <AccountLedgerAdminScreen />,
  allowances: <AccountAllowancesAdminScreen />,
  policy: <AccountPolicyAdminScreen />,
  simulate: <AccountSimulateAdminScreen />,
} as const;
