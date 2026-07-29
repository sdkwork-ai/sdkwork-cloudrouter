import { createIdempotencyParams } from '@sdkwork/clawroutes-pc-commons/idempotency';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';
import type {
  AiUpstreamAccountGroupsListParams,
  AiUpstreamAccountsCredentialsListParams,
  AiUpstreamAccountsListParams,
  AiUpstreamSuppliersListParams,
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
  UpstreamAccountGroup,
  UpstreamSupplier,
  VerifyUpstreamAccountRequest,
} from '@sdkwork/clawrouter-pc-admin-core/sdk';

export async function listUpstreamSuppliers(query: AiUpstreamSuppliersListParams = {}) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.list(query);
}

export async function getUpstreamSupplier(supplierId: string) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.retrieve(supplierId);
}

export async function createUpstreamSupplier(input: CreateUpstreamSupplierRequest) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.create(
    input,
    createIdempotencyParams('create-upstream-supplier'),
  );
}

export async function updateUpstreamSupplier(
  supplier: UpstreamSupplier,
  input: UpdateUpstreamSupplierRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function deleteUpstreamSupplier(supplier: UpstreamSupplier) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.delete(
    supplier.id,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierEndpoints(supplierId: string) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierEndpoints(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierEndpointsRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierAuthMethods(supplierId: string) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierAuthMethods(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierAuthMethodsRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierResources(supplierId: string) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamSuppliers.resources.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierResources(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierResourcesRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamSuppliers.resources.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamAccounts(query: AiUpstreamAccountsListParams = {}) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.list(query);
}

export async function getUpstreamAccount(accountId: string) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.retrieve(accountId);
}

export async function createUpstreamAccount(input: CreateUpstreamAccountRequest) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.create(
    input,
    createIdempotencyParams('create-upstream-account'),
  );
}

export async function updateUpstreamAccount(
  account: UpstreamAccount,
  input: UpdateUpstreamAccountRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.update(
    account.id,
    input,
    { ifMatch: account.version },
  );
}

export async function deleteUpstreamAccount(account: UpstreamAccount) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.delete(
    account.id,
    { ifMatch: account.version },
  );
}

export async function listUpstreamAccountCredentials(
  accountId: string,
  query: AiUpstreamAccountsCredentialsListParams = {},
) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.list(
    accountId,
    query,
  );
  return response.items;
}

export async function createUpstreamAccountCredential(
  accountId: string,
  input: CreateUpstreamAccountCredentialRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.create(
    accountId,
    input,
    createIdempotencyParams('create-upstream-account-credential'),
  );
}

export async function deleteUpstreamAccountCredential(accountId: string, credentialId: string) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.credentials.delete(
    accountId,
    credentialId,
  );
}

export async function verifyUpstreamAccount(
  accountId: string,
  input: VerifyUpstreamAccountRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccounts.verify(accountId, input);
}

export async function listUpstreamAccountGroups(query: AiUpstreamAccountGroupsListParams = {}) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.list(query);
}

export async function getUpstreamAccountGroup(accountGroupId: string) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.retrieve(accountGroupId);
}

export async function createUpstreamAccountGroup(input: CreateUpstreamAccountGroupRequest) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.create(
    input,
    createIdempotencyParams('create-upstream-account-group'),
  );
}

export async function updateUpstreamAccountGroup(
  accountGroup: UpstreamAccountGroup,
  input: UpdateUpstreamAccountGroupRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function deleteUpstreamAccountGroup(accountGroup: UpstreamAccountGroup) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.delete(
    accountGroup.id,
    { ifMatch: accountGroup.version },
  );
}

export async function listUpstreamAccountGroupMembers(accountGroupId: string) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamAccountGroups.members.list(accountGroupId);
  return response.items;
}

export async function updateUpstreamAccountGroupMembers(
  accountGroup: UpstreamAccountGroup,
  input: ReplaceUpstreamAccountGroupMembersRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.members.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function listUpstreamAccountGroupResources(accountGroupId: string) {
  const response = await getClawRouterBackendSdkClient().ai.upstreamAccountGroups.resources.list(accountGroupId);
  return response.items;
}

export async function updateUpstreamAccountGroupResources(
  accountGroup: UpstreamAccountGroup,
  input: ReplaceUpstreamAccountGroupResourcesRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.resources.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function explainUpstreamAccountGroupRoute(
  accountGroupId: string,
  input: ExplainUpstreamAccountGroupRouteRequest,
) {
  return getClawRouterBackendSdkClient().ai.upstreamAccountGroups.explain(accountGroupId, input);
}

export const upstreamService = {
  suppliers: {
    list: listUpstreamSuppliers,
    retrieve: getUpstreamSupplier,
    create: createUpstreamSupplier,
    update: updateUpstreamSupplier,
    delete: deleteUpstreamSupplier,
    listEndpoints: listUpstreamSupplierEndpoints,
    replaceEndpoints: updateUpstreamSupplierEndpoints,
    listAuthMethods: listUpstreamSupplierAuthMethods,
    replaceAuthMethods: updateUpstreamSupplierAuthMethods,
    listResources: listUpstreamSupplierResources,
    replaceResources: updateUpstreamSupplierResources,
  },
  accounts: {
    list: listUpstreamAccounts,
    retrieve: getUpstreamAccount,
    create: createUpstreamAccount,
    update: updateUpstreamAccount,
    delete: deleteUpstreamAccount,
    listCredentials: listUpstreamAccountCredentials,
    createCredential: createUpstreamAccountCredential,
    deleteCredential: deleteUpstreamAccountCredential,
    verify: verifyUpstreamAccount,
  },
  accountGroups: {
    list: listUpstreamAccountGroups,
    retrieve: getUpstreamAccountGroup,
    create: createUpstreamAccountGroup,
    update: updateUpstreamAccountGroup,
    delete: deleteUpstreamAccountGroup,
    listMembers: listUpstreamAccountGroupMembers,
    replaceMembers: updateUpstreamAccountGroupMembers,
    listResources: listUpstreamAccountGroupResources,
    replaceResources: updateUpstreamAccountGroupResources,
    explain: explainUpstreamAccountGroupRoute,
  },
};
