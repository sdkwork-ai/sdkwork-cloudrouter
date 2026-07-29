import type { AppRoutingApiKeyAccountGroup } from './app-routing-api-key-account-group';

/** App routing api key schema exposed by Claw Router. */
export interface AppRoutingApiKey {
  /** Account groups field on app routing api key. */
  accountGroups: AppRoutingApiKeyAccountGroup[];
  /** Created at field on app routing api key. */
  createdAt: string;
  /** Display key field on app routing api key. */
  displayKey: string;
  /** Id field on app routing api key. */
  id: string;
  /** Name field on app routing api key. */
  name: string;
  /** Status field on app routing api key. */
  status: string;
  /** Total usage field on app routing api key. */
  totalUsage: string;
}
