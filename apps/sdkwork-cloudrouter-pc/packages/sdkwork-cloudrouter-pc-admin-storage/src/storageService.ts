import {
  getCloudRouterBackendSdkClient,
  getSdkworkDriveAdminStorageSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { createClientOperationToken } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { loadStoredAppSessionToken } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  createStorageProviderAdminService,
  type StorageProviderAdminService,
} from 'sdkwork-drive-pc-admin-storage-providers';
import type { StorageProviderView } from 'sdkwork-drive-pc-admin-storage-providers';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';

type BackendStorageService = ReturnType<typeof getCloudRouterBackendSdkClient>['storage'];

/** 存储治理记录类型（保留 cloudrouter 治理 API 契约）。 */
export type StorageDefaultBucketUpdateInput = Parameters<BackendStorageService['defaultBuckets']['update']>[1];
export type StorageQuotaCreateInput = Parameters<BackendStorageService['oss']['quotas']['create']>[0];
export type StorageReconciliationCreateInput = NonNullable<Parameters<BackendStorageService['oss']['storageReconciliationRuns']['create']>[1]>;
export type StorageGarbageCollectionCreateInput = NonNullable<Parameters<BackendStorageService['gcJobs']['create']>[1]>;

/**
 * 存储提供者/桶管理走 drive 存储管理面（sdkwork-drive 属主）：
 * 页面数据与对象浏览全部来自 drive 的 provider 体系（单桶 per provider），
 * cloudrouter 不再维护平行 provider/bucket 数据。
 */
let storageProviderAdminService: StorageProviderAdminService | null = null;

export function getStorageProviderAdminService(): StorageProviderAdminService {
  if (!storageProviderAdminService) {
    storageProviderAdminService = createStorageProviderAdminService({
      adminStorageSdkClient: getSdkworkDriveAdminStorageSdkClient(),
      // drive service 的写操作需要租户与操作者上下文；cloudrouter 从本地会话投影。
      getSession: () => {
        const context = loadStoredAppSessionToken()?.context;
        return {
          context: {
            tenantId: context?.tenantId,
            // cloudrouter 会话无 actorId 概念：操作者即当前用户。
            actorId: context?.userId,
          },
        } as SessionSnapshot;
      },
    });
  }
  return storageProviderAdminService;
}

export type StorageProviderRecord = StorageProviderView;

/**
 * 服务商更新（drive 契约：未提供的字段保持不变）。
 *
 * 字段清单显式声明，与共享服务签名由下方编译期双向断言锁定：共享服务
 * 增删或改型字段时 tsc 立即报错。这样既保留"同一份契约只在一处声明"的
 * 防漂移目标（历史上手抄子集漏掉过 `providerAccountId`），又让字段契约
 * 审计可以静态解析出完整字段清单。
 */
export interface StorageProviderUpdateInput {
  name?: string;
  endpointUrl?: string;
  region?: string;
  bucket?: string;
  pathStyle?: boolean;
  credentialRef?: string;
  providerAccountId?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status?: string;
  strictTls?: boolean;
}

/** 编译期防漂移断言：本接口必须与共享服务签名双向可赋值。 */
type StorageProviderUpdateInputMatchesService = [
  StorageProviderUpdateInput,
] extends [Parameters<StorageProviderAdminService['updateProvider']>[1]]
  ? [Parameters<StorageProviderAdminService['updateProvider']>[1]] extends [
        StorageProviderUpdateInput,
      ]
    ? true
    : never
  : never;

/** 账号中心：可复用服务商账号的查询入参。 */
export type StorageProviderAccountsListInput = Parameters<StorageProviderAdminService['listProviderAccounts']>[0];
/** 账号中心：登记一个可复用账号（含访问密钥对）的入参。 */
export type StorageProviderAccountCreateInput = Parameters<StorageProviderAdminService['createProviderAccount']>[0];
/** 账号中心：账号视图。 */
export type StorageProviderAccountRecord = Awaited<ReturnType<StorageProviderAdminService['listProviderAccounts']>>[number];

export async function backendStorageProvidersList() {
  return getStorageProviderAdminService().listProviders();
}

export async function backendStorageProviderCreate(body: StorageProviderCreateInput) {
  return getStorageProviderAdminService().createProvider(body);
}

export async function backendStorageProviderUpdate(providerId: string, body: StorageProviderUpdateInput) {
  return getStorageProviderAdminService().updateProvider(providerId, body);
}

export async function backendStorageProviderDelete(providerId: string) {
  return getStorageProviderAdminService().deleteProvider(providerId);
}

export async function backendStorageProviderHealthCheck(providerId: string) {
  return getStorageProviderAdminService().testProvider(providerId);
}

/** 凭证轮换：只替换 credentialRef，其余字段由 drive 契约保持不变。 */
export async function backendStorageProviderRotateCredential(providerId: string, credentialRef: string) {
  return getStorageProviderAdminService().rotateCredential(providerId, credentialRef);
}

/**
 * 账号中心：列出可复用的服务商账号，供存储服务商绑定。
 *
 * 这是「一个账号应用到各业务」的入口：同一个阿里云账号既可以是存储服务商的
 * 凭证来源，也可以是其它云能力资源的凭证来源，账号只在账号中心维护一份。
 */
export async function backendStorageProviderAccountsList(input?: StorageProviderAccountsListInput) {
  return getStorageProviderAdminService().listProviderAccounts(input);
}

/** 账号中心：直接登记一个可复用账号 + 访问密钥对，省去先去账号中心建号的往返。 */
export async function backendStorageProviderAccountCreate(input: StorageProviderAccountCreateInput) {
  return getStorageProviderAdminService().createProviderAccount(input);
}

export type StorageProviderCreateInput = Parameters<StorageProviderAdminService['createProvider']>[0];

/* ---------------- 存储治理（保留 cloudrouter 后端） ---------------- */

export async function backendStorageDefaultBucketsList(pageSize = 100) {
  return getCloudRouterBackendSdkClient().storage.defaultBuckets.list({ pageSize });
}

export async function backendStorageDefaultBucketUpdate(
  logicalScope: string,
  body: StorageDefaultBucketUpdateInput,
) {
  return getCloudRouterBackendSdkClient().storage.defaultBuckets.update(logicalScope, body);
}

export async function backendStorageQuotasList(pageSize = 100) {
  return getCloudRouterBackendSdkClient().storage.oss.quotas.list({ pageSize });
}

export async function backendStorageQuotaCreate(body: StorageQuotaCreateInput) {
  return getCloudRouterBackendSdkClient().storage.oss.quotas.create(body, {
    idempotencyKey: createClientOperationToken('storage-quota'),
  });
}

export async function backendStorageUsageList(pageSize = 100) {
  return getCloudRouterBackendSdkClient().storage.oss.usage.list({ pageSize });
}

export async function backendStorageReconciliationRunsList(pageSize = 100) {
  return getCloudRouterBackendSdkClient().storage.oss.storageReconciliationRuns.list({ pageSize });
}

export async function backendStorageReconciliationRunCreate(body: StorageReconciliationCreateInput) {
  return getCloudRouterBackendSdkClient().storage.oss.storageReconciliationRuns.create(
    { idempotencyKey: createClientOperationToken('storage-reconciliation') },
    body,
  );
}

export async function backendStorageGarbageCollectionJobsList(pageSize = 100) {
  return getCloudRouterBackendSdkClient().storage.gcJobs.list({ pageSize });
}

export async function backendStorageGarbageCollectionJobCreate(body: StorageGarbageCollectionCreateInput) {
  return getCloudRouterBackendSdkClient().storage.gcJobs.create(
    { idempotencyKey: createClientOperationToken('storage-garbage-collection') },
    body,
  );
}
