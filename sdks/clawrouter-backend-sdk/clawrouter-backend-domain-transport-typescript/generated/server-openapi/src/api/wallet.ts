import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CommerceApiResult, CommerceOperationCommand } from '../types';


export interface WalletExchangeRulesManagementListParams {
  sourceAssetType?: string;
  targetAssetType?: string;
  status?: string;
}

export class WalletExchangeRulesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet exchange Rules management list. */
  async list(params?: WalletExchangeRulesManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'source_asset_type', value: params?.sourceAssetType, style: 'form', explode: true, allowReserved: false },
      { name: 'target_asset_type', value: params?.targetAssetType, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/wallet/exchange_rules`), query));
  }
}

export class WalletExchangeRulesApi {
  private client: HttpClient;
  public readonly management: WalletExchangeRulesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new WalletExchangeRulesManagementApi(client);
  }


/** Wallet exchange Rules update. */
  async update(body?: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.put<CommerceApiResult>(backendApiPath(`/wallet/exchange_rules`), body, undefined, undefined, 'application/json');
  }
}

export interface WalletHoldsListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

export class WalletHoldsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet holds list. */
  async list(params?: WalletHoldsListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/wallet/holds`), query));
  }
}

export class WalletAdjustmentsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet adjustments management create. */
  async create(body: CommerceOperationCommand): Promise<CommerceApiResult> {
    return this.client.post<CommerceApiResult>(backendApiPath(`/wallet/adjustments`), body, undefined, undefined, 'application/json');
  }
}

export class WalletAdjustmentsApi {
  private client: HttpClient;
  public readonly management: WalletAdjustmentsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new WalletAdjustmentsManagementApi(client);
  }

}

export interface WalletLedgerEntriesManagementListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

export class WalletLedgerEntriesManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet ledger Entries management list. */
  async list(params?: WalletLedgerEntriesManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'start_time', value: params?.startTime, style: 'form', explode: true, allowReserved: false },
      { name: 'end_time', value: params?.endTime, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/wallet/ledger_entries`), query));
  }
}

export class WalletLedgerEntriesApi {
  private client: HttpClient;
  public readonly management: WalletLedgerEntriesManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new WalletLedgerEntriesManagementApi(client);
  }

}

export interface WalletAccountsManagementListParams {
  userId?: string;
  assetType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export class WalletAccountsManagementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Wallet accounts management list. */
  async list(params?: WalletAccountsManagementListParams): Promise<CommerceApiResult> {
    const query = buildQueryString([
      { name: 'user_id', value: params?.userId, style: 'form', explode: true, allowReserved: false },
      { name: 'asset_type', value: params?.assetType, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CommerceApiResult>(appendQueryString(backendApiPath(`/wallet/accounts`), query));
  }
}

export class WalletAccountsApi {
  private client: HttpClient;
  public readonly management: WalletAccountsManagementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.management = new WalletAccountsManagementApi(client);
  }

}

export class WalletApi {
  private client: HttpClient;
  public readonly accounts: WalletAccountsApi;
  public readonly ledgerEntries: WalletLedgerEntriesApi;
  public readonly adjustments: WalletAdjustmentsApi;
  public readonly holds: WalletHoldsApi;
  public readonly exchangeRules: WalletExchangeRulesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.accounts = new WalletAccountsApi(client);
    this.ledgerEntries = new WalletLedgerEntriesApi(client);
    this.adjustments = new WalletAdjustmentsApi(client);
    this.holds = new WalletHoldsApi(client);
    this.exchangeRules = new WalletExchangeRulesApi(client);
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
