import {
  isRecord,
  readRequiredApiItems,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];

export async function backendRechargesOrdersList(params?: Parameters<BackendCommerceService['recharges']['orders']['list']>[0]) {
  const result = await getClawRouterBackendSdkClient().commerce.recharges.orders.list(params);
  return readRequiredRechargeItems(result, 'Recharge order records are required');
}

export async function backendWalletAccountsList(params?: Parameters<BackendCommerceService['wallet']['accounts']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.wallet.accounts.list(params);
}

export async function backendWalletLedgerEntriesList(params?: Parameters<BackendCommerceService['wallet']['ledgerEntries']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.wallet.ledgerEntries.list(params);
}

export async function backendWalletExchangeRulesList(params?: Parameters<BackendCommerceService['wallet']['exchangeRules']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.wallet.exchangeRules.list(params);
}

export async function backendWalletAdjustmentsCreate(body: Parameters<BackendCommerceService['wallet']['adjustments']['create']>[0]) {
  return getClawRouterBackendSdkClient().commerce.wallet.adjustments.create(body);
}

function readRequiredRechargeItems(result: unknown, listMessage: string): ApiRecord[] {
  return readRequiredApiItems(result, listMessage)
    .map((value) => {
      const item = readRequiredRecord(value, listMessage);
      readRequiredString(item, 'id', 'Recharge record id is required');
      return item;
    });
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}
