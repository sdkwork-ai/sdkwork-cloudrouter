import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { SdkWorkPageData, WalletAccountsCashRetrieveResult, WalletAccountsOverviewRetrieveResult, WalletAccountsPointsRetrieveResult, WalletAccountsRetrieveResult, WalletAccountsTokensRetrieveResult, WalletAdjustmentsCreateResult, WalletExchangeRateRetrieveResult, WalletHoldsCreateResult, WalletHoldsReleasesCreateResult, WalletHoldsSettlementsCreateResult, WalletLedgerEntriesRetrieveResult, WalletOverviewRetrieveResult, WalletPointExchangesCreateResult, WalletPointExchangesRetrieveResult, WalletPointTransfersCreateResult, WalletRequestsRetrieveResult, WalletTokensRetrieveResult, WalletTopupTransfersCreateResult, WalletTransactionsRetrieveResult, WalletWithdrawalTransfersCreateResult } from '../types';


export class WalletWithdrawalTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletWithdrawalTransfersCreateResult> {
    return this.client.post<WalletWithdrawalTransfersCreateResult>(appApiPath(`/wallet/withdrawal_transfers`));
  }
}

export class WalletTransactionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/transactions`));
  }

/** Retrieve */
  async retrieve(transactionId: string): Promise<WalletTransactionsRetrieveResult> {
    return this.client.get<WalletTransactionsRetrieveResult>(appApiPath(`/wallet/transactions/${serializePathParameter(transactionId, { name: 'transactionId', style: 'simple', explode: false })}`));
  }
}

export class WalletTopupTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletTopupTransfersCreateResult> {
    return this.client.post<WalletTopupTransfersCreateResult>(appApiPath(`/wallet/topup_transfers`));
  }
}

export class WalletTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletTokensRetrieveResult> {
    return this.client.get<WalletTokensRetrieveResult>(appApiPath(`/wallet/tokens`));
  }
}

export class WalletRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(requestNo: string): Promise<WalletRequestsRetrieveResult> {
    return this.client.get<WalletRequestsRetrieveResult>(appApiPath(`/wallet/requests/${serializePathParameter(requestNo, { name: 'requestNo', style: 'simple', explode: false })}`));
  }
}

export class WalletPointsExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/points/exchanges/rules`));
  }
}

export class WalletPointsApi {
  private client: HttpClient;
  public readonly exchangeRules: WalletPointsExchangeRulesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.exchangeRules = new WalletPointsExchangeRulesApi(client);
  }

}

export class WalletPointTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletPointTransfersCreateResult> {
    return this.client.post<WalletPointTransfersCreateResult>(appApiPath(`/wallet/point_transfers`));
  }
}

export class WalletPointExchangesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletPointExchangesCreateResult> {
    return this.client.post<WalletPointExchangesCreateResult>(appApiPath(`/wallet/point_exchanges`));
  }

/** Retrieve */
  async retrieve(exchangeNo: string): Promise<WalletPointExchangesRetrieveResult> {
    return this.client.get<WalletPointExchangesRetrieveResult>(appApiPath(`/wallet/point_exchanges/${serializePathParameter(exchangeNo, { name: 'exchangeNo', style: 'simple', explode: false })}`));
  }
}

export class WalletOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletOverviewRetrieveResult> {
    return this.client.get<WalletOverviewRetrieveResult>(appApiPath(`/wallet/overview`));
  }
}

export class WalletLedgerEntriesPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/ledger_entries/points`));
  }
}

export class WalletLedgerEntriesApi {
  private client: HttpClient;
  public readonly points: WalletLedgerEntriesPointsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.points = new WalletLedgerEntriesPointsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/ledger_entries`));
  }

/** Retrieve */
  async retrieve(ledgerEntryId: string): Promise<WalletLedgerEntriesRetrieveResult> {
    return this.client.get<WalletLedgerEntriesRetrieveResult>(appApiPath(`/wallet/ledger_entries/${serializePathParameter(ledgerEntryId, { name: 'ledgerEntryId', style: 'simple', explode: false })}`));
  }
}

export class WalletHoldsSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletHoldsSettlementsCreateResult> {
    return this.client.post<WalletHoldsSettlementsCreateResult>(appApiPath(`/wallet/holds/settlements`));
  }
}

export class WalletHoldsReleasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletHoldsReleasesCreateResult> {
    return this.client.post<WalletHoldsReleasesCreateResult>(appApiPath(`/wallet/holds/releases`));
  }
}

export class WalletHoldsApi {
  private client: HttpClient;
  public readonly releases: WalletHoldsReleasesApi;
  public readonly settlements: WalletHoldsSettlementsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.releases = new WalletHoldsReleasesApi(client);
    this.settlements = new WalletHoldsSettlementsApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/holds`));
  }

/** Create */
  async create(): Promise<WalletHoldsCreateResult> {
    return this.client.post<WalletHoldsCreateResult>(appApiPath(`/wallet/holds`));
  }
}

export class WalletExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/exchange_rules`));
  }
}

export class WalletExchangeRateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletExchangeRateRetrieveResult> {
    return this.client.get<WalletExchangeRateRetrieveResult>(appApiPath(`/wallet/exchange_rate`));
  }
}

export class WalletAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<WalletAdjustmentsCreateResult> {
    return this.client.post<WalletAdjustmentsCreateResult>(appApiPath(`/wallet/adjustments`));
  }
}

export class WalletAccountsTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsTokensRetrieveResult> {
    return this.client.get<WalletAccountsTokensRetrieveResult>(appApiPath(`/wallet/accounts/tokens`));
  }
}

export class WalletAccountsPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsPointsRetrieveResult> {
    return this.client.get<WalletAccountsPointsRetrieveResult>(appApiPath(`/wallet/accounts/points`));
  }
}

export class WalletAccountsOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsOverviewRetrieveResult> {
    return this.client.get<WalletAccountsOverviewRetrieveResult>(appApiPath(`/wallet/accounts/overview`));
  }
}

export class WalletAccountsCashApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Retrieve */
  async retrieve(): Promise<WalletAccountsCashRetrieveResult> {
    return this.client.get<WalletAccountsCashRetrieveResult>(appApiPath(`/wallet/accounts/cash`));
  }
}

export class WalletAccountsApi {
  private client: HttpClient;
  public readonly cash: WalletAccountsCashApi;
  public readonly overview: WalletAccountsOverviewApi;
  public readonly points: WalletAccountsPointsApi;
  public readonly tokens: WalletAccountsTokensApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.cash = new WalletAccountsCashApi(client);
    this.overview = new WalletAccountsOverviewApi(client);
    this.points = new WalletAccountsPointsApi(client);
    this.tokens = new WalletAccountsTokensApi(client);
  }


/** List */
  async list(): Promise<SdkWorkPageData> {
    return this.client.get<SdkWorkPageData>(appApiPath(`/wallet/accounts`));
  }

/** Retrieve */
  async retrieve(accountId: string): Promise<WalletAccountsRetrieveResult> {
    return this.client.get<WalletAccountsRetrieveResult>(appApiPath(`/wallet/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`));
  }
}

export class WalletApi {
  private client: HttpClient;
  public readonly accounts: WalletAccountsApi;
  public readonly adjustments: WalletAdjustmentsApi;
  public readonly exchangeRate: WalletExchangeRateApi;
  public readonly exchangeRules: WalletExchangeRulesApi;
  public readonly holds: WalletHoldsApi;
  public readonly ledgerEntries: WalletLedgerEntriesApi;
  public readonly overview: WalletOverviewApi;
  public readonly pointExchanges: WalletPointExchangesApi;
  public readonly pointTransfers: WalletPointTransfersApi;
  public readonly points: WalletPointsApi;
  public readonly requests: WalletRequestsApi;
  public readonly tokens: WalletTokensApi;
  public readonly topupTransfers: WalletTopupTransfersApi;
  public readonly transactions: WalletTransactionsApi;
  public readonly withdrawalTransfers: WalletWithdrawalTransfersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new WalletAccountsApi(client);
    this.adjustments = new WalletAdjustmentsApi(client);
    this.exchangeRate = new WalletExchangeRateApi(client);
    this.exchangeRules = new WalletExchangeRulesApi(client);
    this.holds = new WalletHoldsApi(client);
    this.ledgerEntries = new WalletLedgerEntriesApi(client);
    this.overview = new WalletOverviewApi(client);
    this.pointExchanges = new WalletPointExchangesApi(client);
    this.pointTransfers = new WalletPointTransfersApi(client);
    this.points = new WalletPointsApi(client);
    this.requests = new WalletRequestsApi(client);
    this.tokens = new WalletTokensApi(client);
    this.topupTransfers = new WalletTopupTransfersApi(client);
    this.transactions = new WalletTransactionsApi(client);
    this.withdrawalTransfers = new WalletWithdrawalTransfersApi(client);
  }

}

export function createWalletApi(client: HttpClient): WalletApi {
  return new WalletApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
