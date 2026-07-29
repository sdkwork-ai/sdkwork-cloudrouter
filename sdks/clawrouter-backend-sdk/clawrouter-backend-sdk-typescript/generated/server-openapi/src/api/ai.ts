import { backendApiPath } from './paths';
import type { ApiRequestOptions, HttpClient } from '../http/client';
import type { CreateUpstreamAccountCredentialRequest, CreateUpstreamAccountGroupRequest, CreateUpstreamAccountRequest, CreateUpstreamSupplierRequest, ExplainUpstreamAccountGroupRouteRequest, ReplaceUpstreamAccountGroupMembersRequest, ReplaceUpstreamAccountGroupResourcesRequest, ReplaceUpstreamSupplierAuthMethodsRequest, ReplaceUpstreamSupplierEndpointsRequest, ReplaceUpstreamSupplierResourcesRequest, UpdateUpstreamAccountGroupRequest, UpdateUpstreamAccountRequest, UpdateUpstreamSupplierRequest, UpstreamAccount, UpstreamAccountCredential, UpstreamAccountCredentialListResponse, UpstreamAccountGroup, UpstreamAccountGroupListResponse, UpstreamAccountGroupMemberCollection, UpstreamAccountGroupMemberListResponse, UpstreamAccountGroupResourceCollection, UpstreamAccountGroupResourceListResponse, UpstreamAccountGroupRouteExplanation, UpstreamAccountListResponse, UpstreamAccountVerification, UpstreamSupplier, UpstreamSupplierAuthMethodCollection, UpstreamSupplierAuthMethodListResponse, UpstreamSupplierEndpointCollection, UpstreamSupplierEndpointListResponse, UpstreamSupplierListResponse, UpstreamSupplierResourceCollection, UpstreamSupplierResourceListResponse, VerifyUpstreamAccountRequest } from '../types';
export interface AiUpstreamSuppliersResourcesUpdateParams {
  ifMatch: string;
}

export class AiUpstreamSuppliersResourcesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream supplier resources */
  async list(supplierId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierResourceListResponse> {
    return this.client.request<UpstreamSupplierResourceListResponse>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/resources`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Update upstream supplier resources */
  async update(supplierId: string, body: ReplaceUpstreamSupplierResourcesRequest, params: AiUpstreamSuppliersResourcesUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierResourceCollection> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamSupplierResourceCollection>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/resources`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamSuppliersEndpointsUpdateParams {
  ifMatch: string;
}

export class AiUpstreamSuppliersEndpointsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream supplier endpoints */
  async list(supplierId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierEndpointListResponse> {
    return this.client.request<UpstreamSupplierEndpointListResponse>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/endpoints`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Update upstream supplier endpoints */
  async update(supplierId: string, body: ReplaceUpstreamSupplierEndpointsRequest, params: AiUpstreamSuppliersEndpointsUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierEndpointCollection> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamSupplierEndpointCollection>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/endpoints`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamSuppliersAuthMethodsUpdateParams {
  ifMatch: string;
}

export class AiUpstreamSuppliersAuthMethodsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream supplier auth methods */
  async list(supplierId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierAuthMethodListResponse> {
    return this.client.request<UpstreamSupplierAuthMethodListResponse>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/auth_methods`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Update upstream supplier auth methods */
  async update(supplierId: string, body: ReplaceUpstreamSupplierAuthMethodsRequest, params: AiUpstreamSuppliersAuthMethodsUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierAuthMethodCollection> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamSupplierAuthMethodCollection>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}/auth_methods`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamSuppliersListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface AiUpstreamSuppliersCreateParams {
  idempotencyKey: string;
}

export interface AiUpstreamSuppliersDeleteParams {
  ifMatch: string;
}

export interface AiUpstreamSuppliersUpdateParams {
  ifMatch: string;
}

export class AiUpstreamSuppliersApi {
  private client: HttpClient;
  public readonly authMethods: AiUpstreamSuppliersAuthMethodsApi;
  public readonly endpoints: AiUpstreamSuppliersEndpointsApi;
  public readonly resources: AiUpstreamSuppliersResourcesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.authMethods = new AiUpstreamSuppliersAuthMethodsApi(client);
    this.endpoints = new AiUpstreamSuppliersEndpointsApi(client);
    this.resources = new AiUpstreamSuppliersResourcesApi(client);
  }


/** List upstream suppliers */
  async list(params?: AiUpstreamSuppliersListParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplierListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<UpstreamSupplierListResponse>(appendQueryString(backendApiPath(`/ai/upstream_suppliers`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create upstream supplier */
  async create(body: CreateUpstreamSupplierRequest, params: AiUpstreamSuppliersCreateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplier> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamSupplier>(backendApiPath(`/ai/upstream_suppliers`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Delete upstream supplier */
  async delete(supplierId: string, params: AiUpstreamSuppliersDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any, headers: requestHeaders });
  }

/** Get upstream supplier */
  async retrieve(supplierId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplier> {
    return this.client.request<UpstreamSupplier>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Update upstream supplier */
  async update(supplierId: string, body: UpdateUpstreamSupplierRequest, params: AiUpstreamSuppliersUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamSupplier> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamSupplier>(backendApiPath(`/ai/upstream_suppliers/${serializePathParameter(supplierId, { name: 'supplierId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamAccountsCredentialsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface AiUpstreamAccountsCredentialsCreateParams {
  idempotencyKey: string;
}

export class AiUpstreamAccountsCredentialsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream account credentials */
  async list(accountId: string, params?: AiUpstreamAccountsCredentialsListParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountCredentialListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<UpstreamAccountCredentialListResponse>(appendQueryString(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create upstream account credential */
  async create(accountId: string, body: CreateUpstreamAccountCredentialRequest, params: AiUpstreamAccountsCredentialsCreateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountCredential> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccountCredential>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Delete upstream account credential */
  async delete(accountId: string, credentialId: string, requestOptions?: ApiRequestOptions): Promise<void> {
    return this.client.request<void>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/credentials/${serializePathParameter(credentialId, { name: 'credentialId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any });
  }
}

export interface AiUpstreamAccountsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface AiUpstreamAccountsCreateParams {
  idempotencyKey: string;
}

export interface AiUpstreamAccountsDeleteParams {
  ifMatch: string;
}

export interface AiUpstreamAccountsUpdateParams {
  ifMatch: string;
}

export class AiUpstreamAccountsApi {
  private client: HttpClient;
  public readonly credentials: AiUpstreamAccountsCredentialsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.credentials = new AiUpstreamAccountsCredentialsApi(client);
  }


/** List upstream accounts */
  async list(params?: AiUpstreamAccountsListParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<UpstreamAccountListResponse>(appendQueryString(backendApiPath(`/ai/upstream_accounts`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create upstream account */
  async create(body: CreateUpstreamAccountRequest, params: AiUpstreamAccountsCreateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccount> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccount>(backendApiPath(`/ai/upstream_accounts`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Delete upstream account */
  async delete(accountId: string, params: AiUpstreamAccountsDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any, headers: requestHeaders });
  }

/** Get upstream account */
  async retrieve(accountId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamAccount> {
    return this.client.request<UpstreamAccount>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Update upstream account */
  async update(accountId: string, body: UpdateUpstreamAccountRequest, params: AiUpstreamAccountsUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccount> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccount>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Verify upstream account */
  async verify(accountId: string, body: VerifyUpstreamAccountRequest, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountVerification> {
    return this.client.request<UpstreamAccountVerification>(backendApiPath(`/ai/upstream_accounts/${serializePathParameter(accountId, { name: 'accountId', style: 'simple', explode: false })}/verify`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamAccountGroupsResourcesUpdateParams {
  ifMatch: string;
}

export class AiUpstreamAccountGroupsResourcesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream account group resources */
  async list(accountGroupId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupResourceListResponse> {
    return this.client.request<UpstreamAccountGroupResourceListResponse>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/resources`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Update upstream account group resources */
  async update(accountGroupId: string, body: ReplaceUpstreamAccountGroupResourcesRequest, params: AiUpstreamAccountGroupsResourcesUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupResourceCollection> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccountGroupResourceCollection>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/resources`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamAccountGroupsMembersUpdateParams {
  ifMatch: string;
}

export class AiUpstreamAccountGroupsMembersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List upstream account group members */
  async list(accountGroupId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupMemberListResponse> {
    return this.client.request<UpstreamAccountGroupMemberListResponse>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/members`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Update upstream account group members */
  async update(accountGroupId: string, body: ReplaceUpstreamAccountGroupMembersRequest, params: AiUpstreamAccountGroupsMembersUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupMemberCollection> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccountGroupMemberCollection>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/members`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PUT' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export interface AiUpstreamAccountGroupsListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

export interface AiUpstreamAccountGroupsCreateParams {
  idempotencyKey: string;
}

export interface AiUpstreamAccountGroupsDeleteParams {
  ifMatch: string;
}

export interface AiUpstreamAccountGroupsUpdateParams {
  ifMatch: string;
}

export class AiUpstreamAccountGroupsApi {
  private client: HttpClient;
  public readonly members: AiUpstreamAccountGroupsMembersApi;
  public readonly resources: AiUpstreamAccountGroupsResourcesApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.members = new AiUpstreamAccountGroupsMembersApi(client);
    this.resources = new AiUpstreamAccountGroupsResourcesApi(client);
  }


/** List upstream account groups */
  async list(params?: AiUpstreamAccountGroupsListParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupListResponse> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.request<UpstreamAccountGroupListResponse>(appendQueryString(backendApiPath(`/ai/upstream_account_groups`), query), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'page' });
  }

/** Create upstream account group */
  async create(body: CreateUpstreamAccountGroupRequest, params: AiUpstreamAccountGroupsCreateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroup> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccountGroup>(backendApiPath(`/ai/upstream_account_groups`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Delete upstream account group */
  async delete(accountGroupId: string, params: AiUpstreamAccountGroupsDeleteParams, requestOptions?: ApiRequestOptions): Promise<void> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<void>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'DELETE' as any, headers: requestHeaders });
  }

/** Get upstream account group */
  async retrieve(accountGroupId: string, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroup> {
    return this.client.request<UpstreamAccountGroup>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'item' });
  }

/** Update upstream account group */
  async update(accountGroupId: string, body: UpdateUpstreamAccountGroupRequest, params: AiUpstreamAccountGroupsUpdateParams, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroup> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.request<UpstreamAccountGroup>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'PATCH' as any, body, headers: requestHeaders, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }

/** Explain upstream account group route */
  async explain(accountGroupId: string, body: ExplainUpstreamAccountGroupRouteRequest, requestOptions?: ApiRequestOptions): Promise<UpstreamAccountGroupRouteExplanation> {
    return this.client.request<UpstreamAccountGroupRouteExplanation>(backendApiPath(`/ai/upstream_account_groups/${serializePathParameter(accountGroupId, { name: 'accountGroupId', style: 'simple', explode: false })}/route_explain`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'POST' as any, body, contentType: 'application/json', sdkworkUnwrapKind: 'item' });
  }
}

export class AiModelMappingOptionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


/** List model options catalog */
  async list(requestOptions?: ApiRequestOptions): Promise<Record<string, never>> {
    return this.client.request<Record<string, never>>(backendApiPath(`/ai/model_mapping_options`), { signal: requestOptions?.signal, timeout: requestOptions?.timeout, method: 'GET' as any, sdkworkUnwrapKind: 'data' });
  }
}

export class AiApi {
  private client: HttpClient;
  public readonly modelMappingOptions: AiModelMappingOptionsApi;
  public readonly upstreamAccountGroups: AiUpstreamAccountGroupsApi;
  public readonly upstreamAccounts: AiUpstreamAccountsApi;
  public readonly upstreamSuppliers: AiUpstreamSuppliersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.modelMappingOptions = new AiModelMappingOptionsApi(client);
    this.upstreamAccountGroups = new AiUpstreamAccountGroupsApi(client);
    this.upstreamAccounts = new AiUpstreamAccountsApi(client);
    this.upstreamSuppliers = new AiUpstreamSuppliersApi(client);
  }

}

export function createAiApi(client: HttpClient): AiApi {
  return new AiApi(client);
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
function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
