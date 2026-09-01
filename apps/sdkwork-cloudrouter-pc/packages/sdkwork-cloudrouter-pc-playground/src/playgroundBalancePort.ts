import type { ChatBalancePort } from '@sdkwork/agents-pc/workbench';
import { hasPortalIamSession } from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterTokenBankBalance } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';

/**
 * Cloud Router account balance port for the embedded agents workbench.
 *
 * The chat surface reads it to warn the user (yellow banner above the
 * composer) when the signed-in account's spendable Token Bank balance is
 * exhausted, and links into the Token Plan purchase overlay.
 */
export function createPlaygroundBalancePort(): ChatBalancePort {
  return {
    fetchBalance: async () => {
      // Anonymous visitors have no account balance to reason about; keep the
      // chat surface inert so the warning never appears before login.
      if (!hasPortalIamSession()) {
        return null;
      }
      const balance = await getCloudRouterTokenBankBalance();
      if (!balance) {
        return null;
      }
      return {
        available: balance.available,
        insufficient: balance.available <= 0,
      };
    },
    // Re-check periodically so a top-up performed outside the workbench is
    // reflected without a page reload.
    refreshIntervalMs: 60_000,
  };
}
