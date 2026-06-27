import {
  createIdempotencyParams,
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  getSdkworkAppbaseBackendSdkClient,
  isRecord,
  readApiData,
  readApiRecord,
  readRequiredApiItems,
  readRequiredApiItem,
  readRequiredPositiveInt64String,
  requiredSafePathSegment,
  requiredPositiveInt64String,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type {
  AdminApiKeyCreateRequest,
} from '@sdkwork/clawrouter-backend-sdk';

const DEFAULT_USER_LIST_PAGE_SIZE = 200;
const MAX_USER_LIST_PAGE_SIZE = 500;

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  displayName: string;
  mobile: string;
  gender: string;
  country: string;
  province: string;
  city: string;
  district: string;
  address: string;
  role: string;
  group: string;
  balance: string;
  status: string;
  lastActive: string;
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  used: string;
  status: string;
}

export type UserCreateInput = {
  email: string;
  username?: string;
  balance?: string;
};

export type UserUpdateInput = {
  username?: string;
  group?: string;
  status?: UserListItem['status'];
};

export type ApiKeyCreateInput = {
  userId: string;
  name: string;
};

export type UserAdminTableData = {
  users: UserListItem[];
  apiKeysMap: Record<string, ApiKeyItem[]>;
  apiKeysLoadError: Error | null;
};

export type UserListQuery = {
  q?: string;
  pageSize?: number;
};

type UserAdminTableDataLoaders = {
  fetchUsers?: typeof UserService.fetchUsers;
  fetchApiKeysMap?: typeof UserService.fetchApiKeysMap;
};

type AppbaseOperationCommand = Record<string, unknown>;
type AppbaseBackendClient = ReturnType<typeof getSdkworkAppbaseBackendSdkClient>;
type IamUsersListParams = Parameters<AppbaseBackendClient['iam']['users']['list']>[0];

export class UserService {
  static async fetchUsers(query: UserListQuery = {}): Promise<UserListItem[]> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.users.list(
      toListUsersParams(query),
    );
    ensureSdkworkApiSuccess(result, 'admin.user.errors.fetchUsersFallback');
    return readRequiredApiItems(result, 'admin.user.errors.fetchUsersFallback')
      .map(normalizeUser);
  }

  static async fetchApiKeysMap(): Promise<Record<string, ApiKeyItem[]>> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.apiKeys.list();
    ensureSdkworkApiSuccess(result, 'admin.user.errors.fetchApiKeysFallback');
    return normalizeApiKeysMap(readApiData(result));
  }

  static async addUser(user: UserCreateInput): Promise<UserListItem> {
    const result = await getSdkworkAppbaseBackendSdkClient().iam.users.create(
      toCreateUserRequest(user),
    );
    ensureSdkworkApiSuccess(result, 'admin.user.errors.addUserFallback');
    return normalizeUser(readRequiredApiItem(result, 'admin.user.errors.addUserMissingData'));
  }

  static async updateUser(id: string, updates: UserUpdateInput): Promise<UserListItem> {
    const userId = requiredPositiveInt64String(id, 'id');
    const result = await getSdkworkAppbaseBackendSdkClient().iam.users.update(
      userId,
      toUpdateUserRequest(updates),
    );
    ensureSdkworkApiSuccess(result, 'admin.user.errors.updateUserFallback');
    return normalizeUser(readRequiredApiItem(result, 'admin.user.errors.updateUserMissingData'));
  }

  static async createApiKey(input: ApiKeyCreateInput): Promise<{ key: ApiKeyItem; rawKey: string }> {
    const result = await getClawRouterBackendSdkClient().iam.apiKeys.create(
      toCreateApiKeyRequest(input),
      createIdempotencyParams('admin-api-key-create'),
    );
    ensureSdkworkApiSuccess(result, 'admin.user.errors.createApiKeyFallback');
    const data = readApiRecord(result);
    const keyData = data.key;
    if (!isRecord(keyData)) {
      throw new Error('admin.user.errors.createApiKeyMissingData');
    }
    const key = normalizeApiKey(keyData);
    const rawKey = readString(data, 'rawKey');
    if (!rawKey) {
      throw new Error('admin.user.errors.createApiKeyMissingRawKey');
    }
    return {
      key,
      rawKey,
    };
  }

  static async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const result = await getClawRouterBackendSdkClient().iam.apiKeys.delete(
      requiredSafePathSegment(keyId, 'apiKeyId'),
    );
    ensureSdkworkApiSuccess(result, 'admin.user.errors.deleteApiKeyFallback');
    void userId;
  }

  static loadAdminTableData(
    queryOrLoaders: UserListQuery | UserAdminTableDataLoaders = {},
    maybeLoaders: UserAdminTableDataLoaders = {},
  ): Promise<UserAdminTableData> {
    const { query, loaders } = splitLoadAdminTableDataArgs(queryOrLoaders, maybeLoaders);
    const fetchUsers = loaders.fetchUsers ?? UserService.fetchUsers;
    const fetchApiKeysMap = loaders.fetchApiKeysMap ?? UserService.fetchApiKeysMap;

    return fetchUsers(query).then(async (users) => {
      try {
        const apiKeysMap = await fetchApiKeysMap();
        return {
          users,
          apiKeysMap,
          apiKeysLoadError: null,
        };
      } catch (error) {
        return {
          users,
          apiKeysMap: {},
          apiKeysLoadError: asError(error),
        };
      }
    });
  }
}

function splitLoadAdminTableDataArgs(
  queryOrLoaders: UserListQuery | UserAdminTableDataLoaders,
  maybeLoaders: UserAdminTableDataLoaders,
): { query: UserListQuery; loaders: UserAdminTableDataLoaders } {
  if (isUserAdminTableDataLoaders(queryOrLoaders)) {
    return {
      query: {},
      loaders: queryOrLoaders,
    };
  }
  return {
    query: queryOrLoaders,
    loaders: maybeLoaders,
  };
}

function isUserAdminTableDataLoaders(value: UserListQuery | UserAdminTableDataLoaders): value is UserAdminTableDataLoaders {
  return 'fetchUsers' in value || 'fetchApiKeysMap' in value;
}

function toListUsersParams(query: UserListQuery): IamUsersListParams {
  const q = optionalText(query.q);
  return {
    pageSize: normalizeUserListPageSize(query.pageSize),
    ...(q ? { q } : {}),
  };
}

function normalizeUserListPageSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return DEFAULT_USER_LIST_PAGE_SIZE;
  }
  return Math.min(Math.trunc(value), MAX_USER_LIST_PAGE_SIZE);
}

function toCreateUserRequest(user: UserCreateInput): AppbaseOperationCommand {
  return pruneUndefined({
    email: requiredText(user.email, 'email'),
    username: optionalText(user.username),
    balance: optionalText(user.balance),
  });
}

function toUpdateUserRequest(updates: UserUpdateInput): AppbaseOperationCommand {
  return pruneUndefined({
    username: optionalText(updates.username),
    group: optionalText(updates.group),
    status: updates.status,
  });
}

function toCreateApiKeyRequest(input: ApiKeyCreateInput): AdminApiKeyCreateRequest {
  return {
    userId: requiredPositiveInt64String(input.userId, 'userId'),
    name: requiredText(input.name, 'name'),
  };
}

function requiredText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function pruneUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function normalizeUser(value: unknown): UserListItem {
  const item = readRequiredRecord(value, 'User record is required');
  return {
    id: readRequiredPositiveInt64String(item, 'id', 'User id is required'),
    email: readRequiredString(item, 'email', 'User email is required'),
    username: readFirstString(item, ['username', 'userName', 'account']),
    displayName: readFirstString(item, ['displayName', 'name', 'nickname', 'title']),
    mobile: readFirstString(item, ['mobile', 'phone', 'phoneNumber']),
    gender: readFirstString(item, ['gender', 'sex']),
    country: readFirstString(item, ['country', 'countryCode', 'countryName', 'nation']),
    province: readFirstString(item, ['province', 'state', 'region']),
    city: readFirstString(item, ['city', 'locality']),
    district: readFirstString(item, ['district', 'county', 'area']),
    address: readFirstString(item, ['address', 'streetAddress', 'addressLine']),
    role: readString(item, 'role'),
    group: readString(item, 'group'),
    balance: readString(item, 'balance'),
    status: readUserStatus(item),
    lastActive: readString(item, 'lastActive'),
    lastUsed: readString(item, 'lastUsed'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function readUserStatus(item: ApiRecord): UserListItem['status'] {
  const status = readString(item, 'status').trim();
  if (status === 'active' || status === 'banned') {
    return status;
  }
  throw new Error(status ? `Unsupported user status: ${status}` : 'User status is required');
}

function normalizeApiKey(value: unknown): ApiKeyItem {
  const item = readRequiredRecord(value, 'API key record is required');
  return {
    id: readRequiredString(item, 'id', 'API key id is required'),
    name: readRequiredString(item, 'name', 'API key name is required'),
    key: readRequiredString(item, 'key', 'API key value is required'),
    used: readRequiredString(item, 'used', 'API key usage is required'),
    status: readRequiredString(item, 'status', 'API key status is required'),
  };
}

function normalizeApiKeysMap(data: unknown): Record<string, ApiKeyItem[]> {
  const result: Record<string, ApiKeyItem[]> = {};
  if (!isRecord(data)) {
    throw new Error('API key map is required');
  }
  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value)) {
      throw new Error(`API key list for user ${key} is required`);
    }
    const userId = requiredPositiveInt64String(key, 'API key map user id');
    if (userId !== key) {
      throw new Error('API key map user id must be a positive int64 string');
    }
    result[userId] = value.map(normalizeApiKey);
  }
  return result;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readFirstString(record: ApiRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = readString(record, key).trim();
    if (value) {
      return value;
    }
  }
  return fallback;
}
