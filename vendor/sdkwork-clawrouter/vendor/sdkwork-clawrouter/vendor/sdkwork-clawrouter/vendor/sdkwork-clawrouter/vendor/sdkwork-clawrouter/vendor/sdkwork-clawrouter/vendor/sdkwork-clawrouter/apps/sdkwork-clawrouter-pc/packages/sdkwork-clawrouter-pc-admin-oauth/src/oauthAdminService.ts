import { getSdkworkAppbaseBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

export type OAuthListParams = {
  page?: string;
  pageSize?: string;
  providerCode?: string;
  status?: string;
  resourceAccountKind?: string;
  q?: string;
};

export type OAuthResourceRecord = Record<string, unknown>;

type OAuthListResource = {
  list(params?: OAuthListParams): Promise<unknown>;
};

type OAuthResourceAccountResource = OAuthListResource & {
  create(input?: OAuthResourceRecord, options?: OAuthResourceRecord): Promise<unknown>;
  retrieve?(resourceAccountId: string): Promise<unknown>;
  update(resourceAccountId: string, input?: OAuthResourceRecord): Promise<unknown>;
};

type OAuthResources = {
  resourceAccounts: OAuthResourceAccountResource;
};

type OAuthClient = {
  iam?: {
    oauth?: Partial<OAuthResources>;
  };
  iamOauth?: {
    iam?: {
      oauth?: Partial<OAuthResources>;
    };
  };
};

export const OAUTH_SDK_RESOURCE_UNAVAILABLE_ERROR = 'oauth.sdk_resource_unavailable';

export const DEFAULT_OAUTH_PAGE_PARAMS = {
  page: '1',
  pageSize: '100',
} as const satisfies OAuthListParams;

export async function listOAuthResourceAccounts(params?: OAuthListParams) {
  return oauthResourceAccounts().list(params);
}

export async function createOAuthResourceAccount(input: OAuthResourceRecord) {
  return oauthResourceAccounts().create(input);
}

export async function updateOAuthResourceAccount(resourceAccountId: string, input: OAuthResourceRecord) {
  return oauthResourceAccounts().update(resourceAccountId, input);
}

function oauthResourceAccounts(): OAuthResourceAccountResource {
  const resource = resolveOAuthResourceTree().resourceAccounts;
  if (!resource || typeof resource.list !== 'function') {
    throw createOAuthSdkResourceUnavailableError('iam.oauth.resourceAccounts');
  }
  if (typeof resource.create !== 'function') {
    throw createOAuthSdkResourceUnavailableError('iam.oauth.resourceAccounts.create');
  }
  if (typeof resource.update !== 'function') {
    throw createOAuthSdkResourceUnavailableError('iam.oauth.resourceAccounts.update');
  }
  return resource;
}

function resolveOAuthResourceTree(): Partial<OAuthResources> {
  const client = getSdkworkAppbaseBackendSdkClient() as unknown as OAuthClient;
  const oauth = client.iam?.oauth ?? client.iamOauth?.iam?.oauth;
  if (!oauth) {
    throw createOAuthSdkResourceUnavailableError('iam.oauth');
  }
  return oauth;
}

function createOAuthSdkResourceUnavailableError(resourceName: string): Error {
  return new Error(`${OAUTH_SDK_RESOURCE_UNAVAILABLE_ERROR}:${resourceName}`);
}
