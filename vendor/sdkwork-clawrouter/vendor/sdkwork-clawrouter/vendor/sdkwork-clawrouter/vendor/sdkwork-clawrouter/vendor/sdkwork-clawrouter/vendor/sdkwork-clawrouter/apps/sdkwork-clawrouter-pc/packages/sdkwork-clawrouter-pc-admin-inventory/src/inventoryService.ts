import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendCommerceService = ReturnType<typeof getClawRouterBackendSdkClient>['commerce'];
type InventoryLedgerEntriesClient = {
  list(params?: Record<string, unknown>): Promise<unknown>;
};

function getInventoryLedgerEntriesClient(): InventoryLedgerEntriesClient | undefined {
  const inventory = getClawRouterBackendSdkClient().commerce.inventory as BackendCommerceService['inventory'] & {
    ledgerEntries?: InventoryLedgerEntriesClient;
  };
  return inventory.ledgerEntries;
}

export async function listInventoryStocks(params?: Parameters<BackendCommerceService['inventory']['stocks']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.inventory.stocks.list(params);
}

export async function listInventoryReservations(params?: Parameters<BackendCommerceService['inventory']['reservations']['list']>[0]) {
  return getClawRouterBackendSdkClient().commerce.inventory.reservations.list(params);
}

export async function listInventoryLedgerEntries(params?: Record<string, unknown>) {
  const ledgerEntries = getInventoryLedgerEntriesClient();
  if (!ledgerEntries) {
    return { items: [] };
  }
  return ledgerEntries.list(params);
}

export async function updateInventoryStock(stockId: string, body: Parameters<BackendCommerceService['inventory']['stocks']['update']>[1]) {
  return getClawRouterBackendSdkClient().commerce.inventory.stocks.update(
    stockId,
    body,
  );
}
