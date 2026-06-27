import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DiagnosticsRouteSimulationCreateResult, DiagnosticsTestSendsCreateResult, MessagingProviderAccountCreateRequest, MessagingRouteRuleCreateRequest, MessagingRouteSimulationRequest, MessagingSenderIdentityCreateRequest, MessagingSuppressionCreateRequest, MessagingTemplateCreateRequest, MessagingTemplateSendRequest, MessagingTestSendRequest, ProviderAccountsCreateResult, ProviderAccountsListResult, RateLimitBucketsListResult, RouteRulesCreateResult, RouteRulesListResult, SenderIdentitiesCreateResult, SenderIdentitiesListResult, SendRequestsListResult, SuppressionsCreateResult, SuppressionsListResult, TemplatesCreateResult, TemplateSendsCreateResult, TemplatesListResult, TemplatesVersionsPublishResult, VerificationPoliciesListResult, VerificationPoliciesUpdateResult, VerificationPolicyUpdateRequest } from '../types';


export interface MessagingVerificationPoliciesListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingVerificationPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List verification policies */
  async list(params?: MessagingVerificationPoliciesListParams): Promise<VerificationPoliciesListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<VerificationPoliciesListResult>(appendQueryString(backendApiPath(`/messaging/verification_policies`), query));
  }

/** Update verification policy */
  async update(policyId: string, body: VerificationPolicyUpdateRequest): Promise<VerificationPoliciesUpdateResult> {
    return this.client.put<VerificationPoliciesUpdateResult>(backendApiPath(`/messaging/verification_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class MessagingTemplatesVersionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Publish messaging template version */
  async publish(templateId: string, versionId: string): Promise<TemplatesVersionsPublishResult> {
    return this.client.post<TemplatesVersionsPublishResult>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}/publish`));
  }
}

export interface MessagingTemplatesListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingTemplatesApi {
  private client: HttpClient;
  public readonly versions: MessagingTemplatesVersionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.versions = new MessagingTemplatesVersionsApi(client);
  }


/** List messaging templates */
  async list(params?: MessagingTemplatesListParams): Promise<TemplatesListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<TemplatesListResult>(appendQueryString(backendApiPath(`/messaging/templates`), query));
  }

/** Create messaging template */
  async create(body: MessagingTemplateCreateRequest): Promise<TemplatesCreateResult> {
    return this.client.post<TemplatesCreateResult>(backendApiPath(`/messaging/templates`), body, undefined, undefined, 'application/json');
  }
}

export class MessagingTemplateSendsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Send messaging template */
  async create(body: MessagingTemplateSendRequest): Promise<TemplateSendsCreateResult> {
    return this.client.post<TemplateSendsCreateResult>(backendApiPath(`/messaging/template_sends`), body, undefined, undefined, 'application/json');
  }
}

export interface MessagingSuppressionsListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingSuppressionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging suppressions */
  async list(params?: MessagingSuppressionsListParams): Promise<SuppressionsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<SuppressionsListResult>(appendQueryString(backendApiPath(`/messaging/suppressions`), query));
  }

/** Create messaging suppression */
  async create(body: MessagingSuppressionCreateRequest): Promise<SuppressionsCreateResult> {
    return this.client.post<SuppressionsCreateResult>(backendApiPath(`/messaging/suppressions`), body, undefined, undefined, 'application/json');
  }
}

export interface MessagingSenderIdentitiesListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingSenderIdentitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging sender identities */
  async list(params?: MessagingSenderIdentitiesListParams): Promise<SenderIdentitiesListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<SenderIdentitiesListResult>(appendQueryString(backendApiPath(`/messaging/sender_identities`), query));
  }

/** Create messaging sender identity */
  async create(body: MessagingSenderIdentityCreateRequest): Promise<SenderIdentitiesCreateResult> {
    return this.client.post<SenderIdentitiesCreateResult>(backendApiPath(`/messaging/sender_identities`), body, undefined, undefined, 'application/json');
  }
}

export interface MessagingSendRequestsListParams {
  page?: string;
  pageSize?: string;
  sceneCode?: string;
  targetHash?: string;
}

export class MessagingSendRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging send requests */
  async list(params?: MessagingSendRequestsListParams): Promise<SendRequestsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'scene_code', value: params?.sceneCode, style: 'form', explode: true, allowReserved: false },
      { name: 'target_hash', value: params?.targetHash, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<SendRequestsListResult>(appendQueryString(backendApiPath(`/messaging/send_requests`), query));
  }
}

export interface MessagingRouteRulesListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingRouteRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging route rules */
  async list(params?: MessagingRouteRulesListParams): Promise<RouteRulesListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RouteRulesListResult>(appendQueryString(backendApiPath(`/messaging/route_rules`), query));
  }

/** Create messaging route rule */
  async create(body: MessagingRouteRuleCreateRequest): Promise<RouteRulesCreateResult> {
    return this.client.post<RouteRulesCreateResult>(backendApiPath(`/messaging/route_rules`), body, undefined, undefined, 'application/json');
  }
}

export interface MessagingRateLimitBucketsListParams {
  page?: string;
  pageSize?: string;
}

export class MessagingRateLimitBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging rate limit buckets */
  async list(params?: MessagingRateLimitBucketsListParams): Promise<RateLimitBucketsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RateLimitBucketsListResult>(appendQueryString(backendApiPath(`/messaging/rate_limit_buckets`), query));
  }
}

export interface MessagingProviderAccountsListParams {
  page?: string;
  pageSize?: string;
  q?: string;
  status?: string;
  channel?: string;
  providerCode?: string;
}

export class MessagingProviderAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List messaging provider accounts */
  async list(params?: MessagingProviderAccountsListParams): Promise<ProviderAccountsListResult> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'channel', value: params?.channel, style: 'form', explode: true, allowReserved: false },
      { name: 'provider_code', value: params?.providerCode, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ProviderAccountsListResult>(appendQueryString(backendApiPath(`/messaging/provider_accounts`), query));
  }

/** Create messaging provider account */
  async create(body: MessagingProviderAccountCreateRequest): Promise<ProviderAccountsCreateResult> {
    return this.client.post<ProviderAccountsCreateResult>(backendApiPath(`/messaging/provider_accounts`), body, undefined, undefined, 'application/json');
  }
}

export class MessagingDiagnosticsTestSendsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Test messaging send */
  async create(body: MessagingTestSendRequest): Promise<DiagnosticsTestSendsCreateResult> {
    return this.client.post<DiagnosticsTestSendsCreateResult>(backendApiPath(`/messaging/diagnostics/test_sends`), body, undefined, undefined, 'application/json');
  }
}

export class MessagingDiagnosticsRouteSimulationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Simulate messaging route */
  async create(body: MessagingRouteSimulationRequest): Promise<DiagnosticsRouteSimulationCreateResult> {
    return this.client.post<DiagnosticsRouteSimulationCreateResult>(backendApiPath(`/messaging/diagnostics/route_simulation`), body, undefined, undefined, 'application/json');
  }
}

export class MessagingDiagnosticsApi {
  private client: HttpClient;
  public readonly routeSimulation: MessagingDiagnosticsRouteSimulationApi;
  public readonly testSends: MessagingDiagnosticsTestSendsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.routeSimulation = new MessagingDiagnosticsRouteSimulationApi(client);
    this.testSends = new MessagingDiagnosticsTestSendsApi(client);
  }

}

export class MessagingApi {
  private client: HttpClient;
  public readonly diagnostics: MessagingDiagnosticsApi;
  public readonly providerAccounts: MessagingProviderAccountsApi;
  public readonly rateLimitBuckets: MessagingRateLimitBucketsApi;
  public readonly routeRules: MessagingRouteRulesApi;
  public readonly sendRequests: MessagingSendRequestsApi;
  public readonly senderIdentities: MessagingSenderIdentitiesApi;
  public readonly suppressions: MessagingSuppressionsApi;
  public readonly templateSends: MessagingTemplateSendsApi;
  public readonly templates: MessagingTemplatesApi;
  public readonly verificationPolicies: MessagingVerificationPoliciesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.diagnostics = new MessagingDiagnosticsApi(client);
    this.providerAccounts = new MessagingProviderAccountsApi(client);
    this.rateLimitBuckets = new MessagingRateLimitBucketsApi(client);
    this.routeRules = new MessagingRouteRulesApi(client);
    this.sendRequests = new MessagingSendRequestsApi(client);
    this.senderIdentities = new MessagingSenderIdentitiesApi(client);
    this.suppressions = new MessagingSuppressionsApi(client);
    this.templateSends = new MessagingTemplateSendsApi(client);
    this.templates = new MessagingTemplatesApi(client);
    this.verificationPolicies = new MessagingVerificationPoliciesApi(client);
  }

}

export function createMessagingApi(client: HttpClient): MessagingApi {
  return new MessagingApi(client);
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
