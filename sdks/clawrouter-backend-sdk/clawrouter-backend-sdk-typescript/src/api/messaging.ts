import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { DiagnosticsRouteSimulationCreateResult, DiagnosticsTestSendsCreateResult, PageInfo, ProviderAccountsCreateResult, RouteRulesCreateResult, SenderIdentitiesCreateResult, SuppressionsCreateResult, TemplatesCreateResult, TemplateSendsCreateResult, TemplatesVersionsPublishResult, VerificationPoliciesUpdateResult } from '../types';


export class MessagingVerificationPoliciesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/verification_policies`));
  }

/** Update */
  async update(policyId: string): Promise<VerificationPoliciesUpdateResult> {
    return this.client.put<VerificationPoliciesUpdateResult>(backendApiPath(`/messaging/verification_policies/${serializePathParameter(policyId, { name: 'policyId', style: 'simple', explode: false })}`));
  }
}

export class MessagingTemplatesVersionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Publish */
  async publish(templateId: string, versionId: string): Promise<TemplatesVersionsPublishResult> {
    return this.client.post<TemplatesVersionsPublishResult>(backendApiPath(`/messaging/templates/${serializePathParameter(templateId, { name: 'templateId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}/publish`));
  }
}

export class MessagingTemplatesApi {
  private client: HttpClient;
  public readonly versions: MessagingTemplatesVersionsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.versions = new MessagingTemplatesVersionsApi(client);
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/templates`));
  }

/** Create */
  async create(): Promise<TemplatesCreateResult> {
    return this.client.post<TemplatesCreateResult>(backendApiPath(`/messaging/templates`));
  }
}

export class MessagingTemplateSendsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<TemplateSendsCreateResult> {
    return this.client.post<TemplateSendsCreateResult>(backendApiPath(`/messaging/template_sends`));
  }
}

export class MessagingSuppressionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/suppressions`));
  }

/** Create */
  async create(): Promise<SuppressionsCreateResult> {
    return this.client.post<SuppressionsCreateResult>(backendApiPath(`/messaging/suppressions`));
  }
}

export class MessagingSenderIdentitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/sender_identities`));
  }

/** Create */
  async create(): Promise<SenderIdentitiesCreateResult> {
    return this.client.post<SenderIdentitiesCreateResult>(backendApiPath(`/messaging/sender_identities`));
  }
}

export class MessagingSendRequestsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/send_requests`));
  }
}

export class MessagingRouteRulesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/route_rules`));
  }

/** Create */
  async create(): Promise<RouteRulesCreateResult> {
    return this.client.post<RouteRulesCreateResult>(backendApiPath(`/messaging/route_rules`));
  }
}

export class MessagingRateLimitBucketsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/rate_limit_buckets`));
  }
}

export class MessagingProviderAccountsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List */
  async list(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(backendApiPath(`/messaging/provider_accounts`));
  }

/** Create */
  async create(): Promise<ProviderAccountsCreateResult> {
    return this.client.post<ProviderAccountsCreateResult>(backendApiPath(`/messaging/provider_accounts`));
  }
}

export class MessagingDiagnosticsTestSendsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<DiagnosticsTestSendsCreateResult> {
    return this.client.post<DiagnosticsTestSendsCreateResult>(backendApiPath(`/messaging/diagnostics/test_sends`));
  }
}

export class MessagingDiagnosticsRouteSimulationApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** Create */
  async create(): Promise<DiagnosticsRouteSimulationCreateResult> {
    return this.client.post<DiagnosticsRouteSimulationCreateResult>(backendApiPath(`/messaging/diagnostics/route_simulation`));
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
