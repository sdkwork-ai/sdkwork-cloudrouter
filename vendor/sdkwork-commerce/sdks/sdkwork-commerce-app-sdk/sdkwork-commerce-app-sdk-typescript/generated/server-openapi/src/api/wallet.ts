import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface WalletTransactionsListParams {
  assetType?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class WalletTransactionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet transactions list. */
  async list(params?: WalletTransactionsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'asset_type', value: params?.assetType, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/wallet/transactions`), query));
  }

/** Wallet transactions retrieve. */
  async retrieve(transactionId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/transactions/${serializePathParameter(transactionId, { name: 'transactionId', style: 'simple', explode: false })}`));
  }
}

export class WalletAdjustmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet adjustments create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/adjustments`), body, undefined, undefined, 'application/json');
  }
}

export class WalletRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet requests retrieve. */
  async retrieve(requestNo: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/requests/${serializePathParameter(requestNo, { name: 'requestNo', style: 'simple', explode: false })}`));
  }
}

export class WalletWithdrawalTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet withdrawal Transfers create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/withdrawal_transfers`), body, undefined, undefined, 'application/json');
  }
}

export class WalletTopupTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet topup Transfers create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/topup_transfers`), body, undefined, undefined, 'application/json');
  }
}

export class WalletPointExchangesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet point Exchanges create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/point_exchanges`), body, undefined, undefined, 'application/json');
  }

/** Wallet point Exchanges retrieve. */
  async retrieve(exchangeNo: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/point_exchanges/${serializePathParameter(exchangeNo, { name: 'exchangeNo', style: 'simple', explode: false })}`));
  }
}

export class WalletPointTransfersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet point Transfers create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/point_transfers`), body, undefined, undefined, 'application/json');
  }
}

export class WalletTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet tokens retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/tokens`));
  }
}

export class WalletPointsExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet points exchange Rules list. */
  async list(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/points/exchanges/rules`));
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

export interface WalletExchangeRulesListParams {
  sourceAssetType?: string;
  targetAssetType?: string;
}

export class WalletExchangeRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet exchange Rules list. */
  async list(params?: WalletExchangeRulesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'source_asset_type', value: params?.sourceAssetType, style: 'form', explode: true, allowReserved: false },
      { name: 'target_asset_type', value: params?.targetAssetType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/wallet/exchange_rules`), query));
  }
}

export class WalletExchangeRateApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet exchange Rate retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/exchange_rate`));
  }
}

export class WalletHoldsSettlementsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet holds settlements create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/holds/settlements`), body, undefined, undefined, 'application/json');
  }
}

export class WalletHoldsReleasesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet holds releases create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/holds/releases`), body, undefined, undefined, 'application/json');
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


/** Wallet holds create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(appApiPath(`/wallet/holds`), body, undefined, undefined, 'application/json');
  }
}

export interface WalletLedgerEntriesPointsListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class WalletLedgerEntriesPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet ledger Entries points list. */
  async list(params?: WalletLedgerEntriesPointsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/wallet/ledger_entries/points`), query));
  }
}

export interface WalletLedgerEntriesListParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export class WalletLedgerEntriesApi {
  private client: HttpClient;
  public readonly points: WalletLedgerEntriesPointsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.points = new WalletLedgerEntriesPointsApi(client);
  }


/** Wallet ledger Entries list. */
  async list(params?: WalletLedgerEntriesListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/wallet/ledger_entries`), query));
  }

/** Wallet ledger Entries retrieve. */
  async retrieve(ledgerEntryId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/ledger_entries/${serializePathParameter(ledgerEntryId, { name: 'ledgerEntryId', style: 'simple', explode: false })}`));
  }
}

export class WalletAccountsTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet accounts tokens retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/accounts/tokens`));
  }
}

export class WalletAccountsPointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet accounts points retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/accounts/points`));
  }
}

export class WalletAccountsOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet accounts overview retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/accounts/overview`));
  }
}

export interface WalletAccountsListParams {
  assetType?: string;
}

export class WalletAccountsApi {
  private client: HttpClient;
  public readonly overview: WalletAccountsOverviewApi;
  public readonly points: WalletAccountsPointsApi;
  public readonly tokens: WalletAccountsTokensApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new WalletAccountsOverviewApi(client);
    this.points = new WalletAccountsPointsApi(client);
    this.tokens = new WalletAccountsTokensApi(client);
  }


/** Wallet accounts list. */
  async list(params?: WalletAccountsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'asset_type', value: params?.assetType, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(appApiPath(`/wallet/accounts`), query));
  }

/** Wallet accounts retrieve. */
  async retrieve(accountId: string): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`));
  }
}

export class WalletOverviewApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet overview retrieve. */
  async retrieve(): Promise<CommerceApiResult> {
    return this.client.get<CommerceApiResult>(appApiPath(`/wallet/overview`));
  }
}

export class WalletApi {
  private client: HttpClient;
  public readonly overview: WalletOverviewApi;
  public readonly accounts: WalletAccountsApi;
  public readonly ledgerEntries: WalletLedgerEntriesApi;
  public readonly holds: WalletHoldsApi;
  public readonly exchangeRate: WalletExchangeRateApi;
  public readonly exchangeRules: WalletExchangeRulesApi;
  public readonly points: WalletPointsApi;
  public readonly tokens: WalletTokensApi;
  public readonly pointTransfers: WalletPointTransfersApi;
  public readonly pointExchanges: WalletPointExchangesApi;
  public readonly topupTransfers: WalletTopupTransfersApi;
  public readonly withdrawalTransfers: WalletWithdrawalTransfersApi;
  public readonly requests: WalletRequestsApi;
  public readonly adjustments: WalletAdjustmentsApi;
  public readonly transactions: WalletTransactionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.overview = new WalletOverviewApi(client);
    this.accounts = new WalletAccountsApi(client);
    this.ledgerEntries = new WalletLedgerEntriesApi(client);
    this.holds = new WalletHoldsApi(client);
    this.exchangeRate = new WalletExchangeRateApi(client);
    this.exchangeRules = new WalletExchangeRulesApi(client);
    this.points = new WalletPointsApi(client);
    this.tokens = new WalletTokensApi(client);
    this.pointTransfers = new WalletPointTransfersApi(client);
    this.pointExchanges = new WalletPointExchangesApi(client);
    this.topupTransfers = new WalletTopupTransfersApi(client);
    this.withdrawalTransfers = new WalletWithdrawalTransfersApi(client);
    this.requests = new WalletRequestsApi(client);
    this.adjustments = new WalletAdjustmentsApi(client);
    this.transactions = new WalletTransactionsApi(client);
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
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
