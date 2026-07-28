import { createIdempotencyParams } from '@sdkwork/clawroutes-pc-commons/idempotency';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  CreateUpstreamAccountCredentialRequest,
  CreateUpstreamAccountGroupRequest,
  CreateUpstreamAccountRequest,
  CreateUpstreamSupplierRequest,
  ExplainUpstreamAccountGroupRouteRequest,
  ReplaceUpstreamAccountGroupMembersRequest,
  ReplaceUpstreamAccountGroupResourcesRequest,
  ReplaceUpstreamSupplierAuthMethodsRequest,
  ReplaceUpstreamSupplierEndpointsRequest,
  ReplaceUpstreamSupplierResourcesRequest,
  UpdateUpstreamAccountGroupRequest,
  UpdateUpstreamAccountRequest,
  UpdateUpstreamSupplierRequest,
  UpstreamAccount,
  UpstreamAccountCredential,
  UpstreamAccountCredentialCreated,
  UpstreamAccountGroup,
  UpstreamAccountGroupMember,
  UpstreamAccountGroupRouteExplanation,
  UpstreamAccountVerification,
  UpstreamResourceEntitlement,
  UpstreamSupplier,
  UpstreamSupplierAuthMethod,
  UpstreamSupplierEndpoint,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';

export type UpstreamListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type UpstreamPage<T> = {
  items: T[];
  pageInfo: {
    mode: string;
    page: number;
    pageSize: number;
    totalItems: string;
    totalPages: number;
    hasMore: boolean;
  };
};

export const upstreamService = {
  suppliers: {
    list: (query: UpstreamListQuery = {}) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.list(query) as Promise<UpstreamPage<UpstreamSupplier>>,
    retrieve: (supplierId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.retrieve(supplierId),
    create: (input: CreateUpstreamSupplierRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.create(
        input,
        createIdempotencyParams('create-upstream-supplier'),
      ),
    update: (supplier: UpstreamSupplier, input: UpdateUpstreamSupplierRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.update(
        supplier.id,
        input,
        { ifMatch: supplier.version },
      ),
    delete: (supplier: UpstreamSupplier) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.delete(
        supplier.id,
        { ifMatch: supplier.version },
      ),
    listEndpoints: (supplierId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.list(supplierId)
        .then((response) => response.items as UpstreamSupplierEndpoint[]),
    replaceEndpoints: (
      supplier: UpstreamSupplier,
      input: ReplaceUpstreamSupplierEndpointsRequest,
    ) => getClawRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.update(
      supplier.id,
      input,
      { ifMatch: supplier.version },
    ),
    listAuthMethods: (supplierId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.list(supplierId)
        .then((response) => response.items as UpstreamSupplierAuthMethod[]),
    replaceAuthMethods: (
      supplier: UpstreamSupplier,
      input: ReplaceUpstreamSupplierAuthMethodsRequest,
    ) => getClawRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.update(
      supplier.id,
      input,
      { ifMatch: supplier.version },
    ),
    listResources: (supplierId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamSuppliers.resources.list(supplierId)
        .then((response) => response.items as UpstreamResourceEntitlement[]),
    replaceResources: (
      supplier: UpstreamSupplier,
      input: ReplaceUpstreamSupplierResourcesRequest,
    ) => getClawRouterBackendSdkClient().ai.upstreamSuppliers.resources.update(
      supplier.id,
      input,
      { ifMatch: supplier.version },
    ),
  },
  accounts: {
    list: (query: UpstreamListQuery = {}) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.list(query) as Promise<UpstreamPage<UpstreamAccount>>,
    retrieve: (accountId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.retrieve(accountId),
    create: (input: CreateUpstreamAccountRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.create(
        input,
        createIdempotencyParams('create-upstream-account'),
      ),
    update: (account: UpstreamAccount, input: UpdateUpstreamAccountRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.update(
        account.id,
        input,
        { ifMatch: account.version },
      ),
    delete: (account: UpstreamAccount) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.delete(
        account.id,
        { ifMatch: account.version },
      ),
    listCredentials: (accountId: string, query: UpstreamListQuery = {}) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.list(accountId, query)
        .then((response) => response.items as UpstreamAccountCredential[]),
    createCredential: (accountId: string, input: CreateUpstreamAccountCredentialRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.create(
        accountId,
        input,
        createIdempotencyParams('create-upstream-account-credential'),
      ) as Promise<UpstreamAccountCredentialCreated>,
    deleteCredential: (accountId: string, credentialId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.delete(accountId, credentialId),
    verify: (accountId: string, input: { endpointId?: string; credentialId?: string; timeoutMs?: number }) =>
      getClawRouterBackendSdkClient().ai.upstreamAccounts.verify(accountId, input) as Promise<UpstreamAccountVerification>,
  },
  accountGroups: {
    list: (query: UpstreamListQuery = {}) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.list(query) as Promise<UpstreamPage<UpstreamAccountGroup>>,
    retrieve: (accountGroupId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.retrieve(accountGroupId),
    create: (input: CreateUpstreamAccountGroupRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.create(
        input,
        createIdempotencyParams('create-upstream-account-group'),
      ),
    update: (accountGroup: UpstreamAccountGroup, input: UpdateUpstreamAccountGroupRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.update(
        accountGroup.id,
        input,
        { ifMatch: accountGroup.version },
      ),
    delete: (accountGroup: UpstreamAccountGroup) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.delete(
        accountGroup.id,
        { ifMatch: accountGroup.version },
      ),
    listMembers: (accountGroupId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.members.list(accountGroupId)
        .then((response) => response.items as UpstreamAccountGroupMember[]),
    replaceMembers: (
      accountGroup: UpstreamAccountGroup,
      input: ReplaceUpstreamAccountGroupMembersRequest,
    ) => getClawRouterBackendSdkClient().ai.upstreamAccountGroups.members.update(
      accountGroup.id,
      input,
      { ifMatch: accountGroup.version },
    ),
    listResources: (accountGroupId: string) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.resources.list(accountGroupId)
        .then((response) => response.items as UpstreamResourceEntitlement[]),
    replaceResources: (
      accountGroup: UpstreamAccountGroup,
      input: ReplaceUpstreamAccountGroupResourcesRequest,
    ) => getClawRouterBackendSdkClient().ai.upstreamAccountGroups.resources.update(
      accountGroup.id,
      input,
      { ifMatch: accountGroup.version },
    ),
    explain: (accountGroupId: string, input: ExplainUpstreamAccountGroupRouteRequest) =>
      getClawRouterBackendSdkClient().ai.upstreamAccountGroups.explain.create(accountGroupId, input)
        as Promise<UpstreamAccountGroupRouteExplanation>,
  },
};
