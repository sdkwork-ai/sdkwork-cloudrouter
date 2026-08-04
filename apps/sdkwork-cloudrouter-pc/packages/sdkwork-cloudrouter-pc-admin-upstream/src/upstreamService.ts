import { createIdempotencyParams } from '@sdkwork/cloudroutes-pc-commons/idempotency';
import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
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
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';

export async function listUpstreamSuppliers(query: AiUpstreamSuppliersListParams = {}) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.list(query);
}

export async function getUpstreamSupplier(supplierId: string) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.retrieve(supplierId);
}

export async function createUpstreamSupplier(input: CreateUpstreamSupplierRequest) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.create(
    input,
    createIdempotencyParams('create-upstream-supplier'),
  );
}

export async function updateUpstreamSupplier(
  supplier: UpstreamSupplier,
  input: UpdateUpstreamSupplierRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function deleteUpstreamSupplier(supplier: UpstreamSupplier) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.delete(
    supplier.id,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierEndpoints(supplierId: string) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierEndpoints(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierEndpointsRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.endpoints.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierAuthMethods(supplierId: string) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierAuthMethods(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierAuthMethodsRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.authMethods.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamSupplierResources(supplierId: string) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamSuppliers.resources.list(supplierId);
  return response.items;
}

export async function updateUpstreamSupplierResources(
  supplier: UpstreamSupplier,
  input: ReplaceUpstreamSupplierResourcesRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamSuppliers.resources.update(
    supplier.id,
    input,
    { ifMatch: supplier.version },
  );
}

export async function listUpstreamAccounts(query: AiUpstreamAccountsListParams = {}) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.list(query);
}

export async function getUpstreamAccount(accountId: string) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.retrieve(accountId);
}

export async function createUpstreamAccount(input: CreateUpstreamAccountRequest) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.create(
    input,
    createIdempotencyParams('create-upstream-account'),
  );
}

export async function updateUpstreamAccount(
  account: UpstreamAccount,
  input: UpdateUpstreamAccountRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.update(
    account.id,
    input,
    { ifMatch: account.version },
  );
}

export async function deleteUpstreamAccount(account: UpstreamAccount) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.delete(
    account.id,
    { ifMatch: account.version },
  );
}

export async function listUpstreamAccountCredentials(
  accountId: string,
  query: AiUpstreamAccountsCredentialsListParams = {},
) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamAccounts.credentials.list(
    accountId,
    query,
  );
  return response.items;
}

export async function createUpstreamAccountCredential(
  accountId: string,
  input: CreateUpstreamAccountCredentialRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.credentials.create(
    accountId,
    input,
    createIdempotencyParams('create-upstream-account-credential'),
  );
}

export async function deleteUpstreamAccountCredential(accountId: string, credentialId: string) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.credentials.delete(
    accountId,
    credentialId,
  );
}

export async function verifyUpstreamAccount(
  accountId: string,
  input: VerifyUpstreamAccountRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccounts.verify(accountId, input);
}

export async function listUpstreamAccountGroups(query: AiUpstreamAccountGroupsListParams = {}) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.list(query);
}

export async function getUpstreamAccountGroup(accountGroupId: string) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.retrieve(accountGroupId);
}

export async function createUpstreamAccountGroup(input: CreateUpstreamAccountGroupRequest) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.create(
    input,
    createIdempotencyParams('create-upstream-account-group'),
  );
}

export async function updateUpstreamAccountGroup(
  accountGroup: UpstreamAccountGroup,
  input: UpdateUpstreamAccountGroupRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function deleteUpstreamAccountGroup(accountGroup: UpstreamAccountGroup) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.delete(
    accountGroup.id,
    { ifMatch: accountGroup.version },
  );
}

export async function listUpstreamAccountGroupMembers(accountGroupId: string) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.members.list(accountGroupId);
  return response.items;
}

export async function updateUpstreamAccountGroupMembers(
  accountGroup: UpstreamAccountGroup,
  input: ReplaceUpstreamAccountGroupMembersRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.members.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function listUpstreamAccountGroupResources(accountGroupId: string) {
  const response = await getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.resources.list(accountGroupId);
  return response.items;
}

export async function updateUpstreamAccountGroupResources(
  accountGroup: UpstreamAccountGroup,
  input: ReplaceUpstreamAccountGroupResourcesRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.resources.update(
    accountGroup.id,
    input,
    { ifMatch: accountGroup.version },
  );
}

export async function explainUpstreamAccountGroupRoute(
  accountGroupId: string,
  input: ExplainUpstreamAccountGroupRouteRequest,
) {
  return getCloudRouterBackendSdkClient().ai.upstreamAccountGroups.explain(accountGroupId, input);
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
