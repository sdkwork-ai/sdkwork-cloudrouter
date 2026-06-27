import React, { useEffect, useMemo, useState } from "react";
import {
  SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
  SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  SDKWORK_STORAGE_ENCRYPTION_MODES,
  SDKWORK_STORAGE_PROVIDER_TYPES,
  SDKWORK_STORAGE_RESOURCE_STATUSES,
  type SdkworkStorageBucketLogicalScope,
  type SdkworkStorageBucketStorageClass,
  type SdkworkStorageEncryptionMode,
  type SdkworkStorageProviderType,
  type SdkworkStorageResourceStatus,
} from "../../../../common/file/sdkwork-file-contracts/src/index";
import type {
  AdminStorageDefaultBucket,
  AdminStorageProviderHealthCheckResult,
  AdminStoragePort,
} from "../../../../common/file/sdkwork-file-sdk-ports/src/index";

export type StorageAdminRequestAction =
  | "buckets:create"
  | "buckets:list"
  | "buckets:update"
  | "default-buckets:list"
  | "default-buckets:set"
  | "providers:create"
  | "providers:health-check"
  | "providers:list"
  | "providers:update";

export interface StorageOperationsSettingsProps {
  idempotencyKeyFactory?: (action: "buckets:create" | "providers:create", key: string) => string;
  onError?: (error: Error) => void;
  onSaved?: (result: { action: "bucket" | "bucketStatus" | "defaultBucket" | "provider" | "providerStatus"; requestId: string }) => void;
  port: AdminStoragePort;
  requestIdFactory?: (action: StorageAdminRequestAction, logicalScope?: SdkworkStorageBucketLogicalScope) => string;
  title?: string;
}

interface StorageProviderView {
  providerCode: string;
  providerId: string;
  providerType: SdkworkStorageProviderType;
  pathStyleEnabled?: boolean;
  region?: string;
  status?: SdkworkStorageResourceStatus;
  supportsLifecycle?: boolean;
  supportsMultipart?: boolean;
  supportsObjectLock?: boolean;
}

interface StorageBucketView {
  bucketId: string;
  bucketName: string;
  bucketRegion?: string;
  dataResidencyRegion?: string;
  defaultEncryptionMode?: SdkworkStorageEncryptionMode;
  defaultStorageClass?: SdkworkStorageBucketStorageClass;
  kmsKeyRef?: string;
  lifecycleEnabled?: boolean;
  logicalScope: SdkworkStorageBucketLogicalScope;
  objectKeyPrefix?: string;
  objectLockEnabled?: boolean;
  providerId: string;
  publicAccessBlocked?: boolean;
  status?: SdkworkStorageResourceStatus;
  versioningEnabled?: boolean;
}

interface ProviderFormState {
  credentialRef: string;
  endpointUrl: string;
  pathStyleEnabled: boolean;
  providerCode: string;
  providerType: SdkworkStorageProviderType;
  region: string;
  supportsLifecycle: boolean;
  supportsMultipart: boolean;
  supportsObjectLock: boolean;
}

interface BucketFormState {
  bucketName: string;
  bucketRegion: string;
  dataResidencyRegion: string;
  defaultEncryptionMode: SdkworkStorageEncryptionMode;
  defaultStorageClass: SdkworkStorageBucketStorageClass;
  kmsKeyRef: string;
  lifecycleEnabled: boolean;
  logicalScope: SdkworkStorageBucketLogicalScope;
  objectKeyPrefix: string;
  objectLockEnabled: boolean;
  providerId: string;
  publicAccessBlocked: boolean;
  versioningEnabled: boolean;
}

interface DefaultBucketFormState {
  bucketId: string;
  logicalScope: SdkworkStorageBucketLogicalScope;
  reason: string;
}

type StorageAdminStatus = "failed" | "loading" | "ready";

const DEFAULT_LOGICAL_SCOPE: SdkworkStorageBucketLogicalScope = "tenant_private";

export function StorageOperationsSettings({
  idempotencyKeyFactory = defaultIdempotencyKeyFactory,
  onError,
  onSaved,
  port,
  requestIdFactory = defaultRequestIdFactory,
  title = "Storage operations",
}: StorageOperationsSettingsProps): React.ReactElement {
  const [buckets, setBuckets] = useState<StorageBucketView[]>([]);
  const [busyAction, setBusyAction] = useState<StorageAdminRequestAction | null>(null);
  const [defaultBuckets, setDefaultBuckets] = useState<AdminStorageDefaultBucket[]>([]);
  const [bucketStatusReasonDrafts, setBucketStatusReasonDrafts] = useState<Record<string, string>>({});
  const [bucketStatusDrafts, setBucketStatusDrafts] = useState<Record<string, SdkworkStorageResourceStatus>>({});
  const [providerHealthChecks, setProviderHealthChecks] = useState<Record<string, AdminStorageProviderHealthCheckResult>>({});
  const [providerStatusReasonDrafts, setProviderStatusReasonDrafts] = useState<Record<string, string>>({});
  const [providerStatusDrafts, setProviderStatusDrafts] = useState<Record<string, SdkworkStorageResourceStatus>>({});
  const [providers, setProviders] = useState<StorageProviderView[]>([]);
  const [status, setStatus] = useState<StorageAdminStatus>("loading");
  const [bucketForm, setBucketForm] = useState<BucketFormState>({
    bucketName: "",
    bucketRegion: "",
    dataResidencyRegion: "",
    defaultEncryptionMode: "sse_s3",
    defaultStorageClass: "STANDARD",
    kmsKeyRef: "",
    lifecycleEnabled: false,
    logicalScope: DEFAULT_LOGICAL_SCOPE,
    objectKeyPrefix: "",
    objectLockEnabled: false,
    providerId: "",
    publicAccessBlocked: true,
    versioningEnabled: false,
  });
  const [defaultForm, setDefaultForm] = useState<DefaultBucketFormState>({
    bucketId: "",
    logicalScope: DEFAULT_LOGICAL_SCOPE,
    reason: "",
  });
  const [providerForm, setProviderForm] = useState<ProviderFormState>({
    credentialRef: "",
    endpointUrl: "",
    pathStyleEnabled: false,
    providerCode: "",
    providerType: "aws_s3",
    region: "",
    supportsLifecycle: false,
    supportsMultipart: true,
    supportsObjectLock: false,
  });

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    void Promise.all([
      port.listProviders({ requestId: requestIdFactory("providers:list") }),
      port.listBuckets({ requestId: requestIdFactory("buckets:list") }),
      port.listDefaultBuckets({ requestId: requestIdFactory("default-buckets:list") }),
    ])
      .then(([providerResult, bucketResult, defaultBucketResult]) => {
        if (disposed) {
          return;
        }
        const normalizedProviders = providerResult.items.map(normalizeProvider).filter(isPresent);
        const normalizedBuckets = bucketResult.items.map(normalizeBucket).filter(isPresent);
        setProviders(normalizedProviders);
        setBuckets(normalizedBuckets);
        setDefaultBuckets(defaultBucketResult.items);
        setBucketForm((current) => ({
          ...current,
          providerId: current.providerId || normalizedProviders[0]?.providerId || "",
        }));
        setDefaultForm((current) => {
          const existingDefault = defaultBucketResult.items.find((item) => item.logicalScope === current.logicalScope);
          const providerMap = new Map(normalizedProviders.map((provider) => [provider.providerId, provider]));
          const firstBucket = normalizedBuckets.find((item) => (
            item.logicalScope === current.logicalScope
            && isActiveStorageResource(item.status)
            && isActiveStorageResource(providerMap.get(item.providerId)?.status)
          ));
          return {
            ...current,
            bucketId: current.bucketId || existingDefault?.bucketId || firstBucket?.bucketId || "",
          };
        });
        setStatus("ready");
      })
      .catch((error) => {
        if (!disposed) {
          setStatus("failed");
          reportError(error, onError);
        }
      });

    return () => {
      disposed = true;
    };
  }, [onError, port, requestIdFactory]);

  const providerById = useMemo(
    () => new Map(providers.map((provider) => [provider.providerId, provider])),
    [providers],
  );
  const bucketsForDefaultScope = buckets.filter((bucket) => (
    bucket.logicalScope === defaultForm.logicalScope
    && isActiveStorageResource(bucket.status)
    && isActiveStorageResource(providerById.get(bucket.providerId)?.status)
  ));
  const selectedDefaultBucketId = bucketsForDefaultScope.some((bucket) => bucket.bucketId === defaultForm.bucketId)
    ? defaultForm.bucketId
    : bucketsForDefaultScope[0]?.bucketId ?? "";

  async function createProvider(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const providerCode = requiredTrimmed(providerForm.providerCode, "Provider code is required.");
    const credentialRef = requiredTrimmed(providerForm.credentialRef, "Credential reference is required.");
    const requestId = requestIdFactory("providers:create");
    setBusyAction("providers:create");
    try {
      const result = await port.createProvider({
        credentialRef,
        idempotencyKey: idempotencyKeyFactory("providers:create", providerCode),
        pathStyleEnabled: providerForm.pathStyleEnabled,
        providerCode,
        providerType: providerForm.providerType,
        requestId,
        supportsLifecycle: providerForm.supportsLifecycle,
        supportsMultipart: providerForm.supportsMultipart,
        supportsObjectLock: providerForm.supportsObjectLock,
        ...optionalField("endpointUrl", providerForm.endpointUrl),
        ...optionalField("region", providerForm.region),
      });
      const provider = normalizeProvider(result.provider);
      if (provider) {
        setProviders((current) => upsertBy(current, provider, (item) => item.providerId));
        setBucketForm((current) => ({
          ...current,
          providerId: current.providerId || provider.providerId,
        }));
      }
      setProviderForm({
        credentialRef: "",
        endpointUrl: "",
        pathStyleEnabled: false,
        providerCode: "",
        providerType: "aws_s3",
        region: "",
        supportsLifecycle: false,
        supportsMultipart: true,
        supportsObjectLock: false,
      });
      onSaved?.({ action: "provider", requestId: result.requestId });
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  async function createBucket(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const providerId = requiredTrimmed(bucketForm.providerId || providers[0]?.providerId || "", "Bucket provider is required.");
    const bucketName = requiredTrimmed(bucketForm.bucketName, "Bucket name is required.");
    const requestId = requestIdFactory("buckets:create", bucketForm.logicalScope);
    setBusyAction("buckets:create");
    try {
      const result = await port.createBucket({
        bucketName,
        defaultEncryptionMode: bucketForm.defaultEncryptionMode,
        defaultStorageClass: bucketForm.defaultStorageClass,
        idempotencyKey: idempotencyKeyFactory("buckets:create", `${providerId}:${bucketName}`),
        lifecycleEnabled: bucketForm.lifecycleEnabled,
        logicalScope: bucketForm.logicalScope,
        objectLockEnabled: bucketForm.objectLockEnabled,
        providerId,
        publicAccessBlocked: bucketForm.publicAccessBlocked,
        requestId,
        versioningEnabled: bucketForm.versioningEnabled,
        ...optionalField("bucketRegion", bucketForm.bucketRegion),
        ...optionalField("dataResidencyRegion", bucketForm.dataResidencyRegion),
        ...optionalField("kmsKeyRef", bucketForm.kmsKeyRef),
        ...optionalField("objectKeyPrefix", bucketForm.objectKeyPrefix),
      });
      const bucket = normalizeBucket(result.bucket);
      if (bucket) {
        setBuckets((current) => upsertBy(current, bucket, (item) => item.bucketId));
        setDefaultForm((current) => (
          current.logicalScope === bucket.logicalScope && !current.bucketId
            ? { ...current, bucketId: bucket.bucketId }
            : current
        ));
      }
      setBucketForm((current) => ({
        ...current,
        bucketName: "",
        bucketRegion: "",
        dataResidencyRegion: "",
        defaultEncryptionMode: "sse_s3",
        defaultStorageClass: "STANDARD",
        kmsKeyRef: "",
        lifecycleEnabled: false,
        objectKeyPrefix: "",
        objectLockEnabled: false,
        publicAccessBlocked: true,
        versioningEnabled: false,
      }));
      onSaved?.({ action: "bucket", requestId: result.requestId });
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  async function setDefaultBucket(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const bucketId = requiredTrimmed(selectedDefaultBucketId, "Default bucket is required.");
    const reason = requiredTrimmed(defaultForm.reason, "Change reason is required.");
    const requestId = requestIdFactory("default-buckets:set", defaultForm.logicalScope);
    setBusyAction("default-buckets:set");
    try {
      const result = await port.setDefaultBucket({
        bucketId,
        logicalScope: defaultForm.logicalScope,
        reason,
        requestId,
      });
      setDefaultBuckets((current) => upsertBy(current, result.defaultBucket, (item) => item.logicalScope));
      setDefaultForm((current) => ({
        ...current,
        bucketId: result.defaultBucket.bucketId,
        reason: "",
      }));
      onSaved?.({ action: "defaultBucket", requestId: result.requestId });
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  async function healthCheckProvider(provider: StorageProviderView): Promise<void> {
    const requestId = requestIdFactory("providers:health-check");
    setBusyAction("providers:health-check");
    try {
      const result = await port.healthCheckProvider({
        providerId: provider.providerId,
        requestId,
      });
      setProviderHealthChecks((current) => ({
        ...current,
        [provider.providerId]: result,
      }));
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  async function updateProviderStatus(provider: StorageProviderView): Promise<void> {
    const requestId = requestIdFactory("providers:update");
    const statusValue = providerStatusDrafts[provider.providerId] ?? provider.status ?? "active";
    const reason = requiredTrimmed(providerStatusReasonDrafts[provider.providerId] ?? "", "Provider status reason is required.");
    setBusyAction("providers:update");
    try {
      const result = await port.updateProvider({
        providerId: provider.providerId,
        reason,
        requestId,
        status: statusValue,
      });
      const updated = normalizeProvider(result.provider) ?? { ...provider, status: statusValue };
      setProviders((current) => upsertBy(current, updated, (item) => item.providerId));
      setProviderStatusReasonDrafts((current) => omitKey(current, provider.providerId));
      setProviderStatusDrafts((current) => omitKey(current, provider.providerId));
      onSaved?.({ action: "providerStatus", requestId: result.requestId });
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  async function updateBucketStatus(bucket: StorageBucketView): Promise<void> {
    const requestId = requestIdFactory("buckets:update");
    const statusValue = bucketStatusDrafts[bucket.bucketId] ?? bucket.status ?? "active";
    const reason = requiredTrimmed(bucketStatusReasonDrafts[bucket.bucketId] ?? "", "Bucket status reason is required.");
    setBusyAction("buckets:update");
    try {
      const result = await port.updateBucket({
        bucketId: bucket.bucketId,
        reason,
        requestId,
        status: statusValue,
      });
      const updated = normalizeBucket(result.bucket) ?? { ...bucket, status: statusValue };
      setBuckets((current) => upsertBy(current, updated, (item) => item.bucketId));
      setBucketStatusReasonDrafts((current) => omitKey(current, bucket.bucketId));
      setBucketStatusDrafts((current) => omitKey(current, bucket.bucketId));
      onSaved?.({ action: "bucketStatus", requestId: result.requestId });
    } catch (error) {
      reportError(error, onError);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section aria-label={title} role="region">
      <h2>{title}</h2>
      {status === "loading" ? <p>Loading storage operations</p> : null}
      {status === "failed" ? <p>Unable to load storage operations</p> : null}
      <section aria-label="Storage providers">
        <h3>Storage providers</h3>
        <ul>
          {providers.map((provider) => (
            <ProviderListItem
              busy={busyAction === "providers:health-check" || busyAction === "providers:update"}
              healthCheck={providerHealthChecks[provider.providerId]}
              key={provider.providerId}
              onHealthCheck={(selectedProvider) => { void healthCheckProvider(selectedProvider); }}
              onStatusChange={(selectedProvider, statusValue) => {
                setProviderStatusDrafts((current) => ({
                  ...current,
                  [selectedProvider.providerId]: statusValue,
                }));
              }}
              onStatusReasonChange={(selectedProvider, reason) => {
                setProviderStatusReasonDrafts((current) => ({
                  ...current,
                  [selectedProvider.providerId]: reason,
                }));
              }}
              onStatusSave={(selectedProvider) => { void updateProviderStatus(selectedProvider); }}
              provider={provider}
              statusReason={providerStatusReasonDrafts[provider.providerId] ?? ""}
              statusValue={providerStatusDrafts[provider.providerId] ?? provider.status ?? "active"}
            />
          ))}
        </ul>
        <form aria-label="Create storage provider" onSubmit={(event) => { void createProvider(event); }}>
          <label>
            Provider code
            <input
              aria-label="Provider code"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setProviderForm((current) => ({ ...current, providerCode: value }));
              }}
              required
              value={providerForm.providerCode}
            />
          </label>
          <label>
            Provider type
            <select
              aria-label="Provider type"
              onChange={(event) => {
                const value = event.currentTarget.value as SdkworkStorageProviderType;
                setProviderForm((current) => ({
                  ...current,
                  providerType: value,
                }));
              }}
              value={providerForm.providerType}
            >
              {SDKWORK_STORAGE_PROVIDER_TYPES.map((providerType) => (
                <option key={providerType} value={providerType}>{providerType}</option>
              ))}
            </select>
          </label>
          <label>
            Credential reference
            <input
              aria-label="Credential reference"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setProviderForm((current) => ({ ...current, credentialRef: value }));
              }}
              required
              value={providerForm.credentialRef}
            />
          </label>
          <label>
            Endpoint URL
            <input
              aria-label="Endpoint URL"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setProviderForm((current) => ({ ...current, endpointUrl: value }));
              }}
              value={providerForm.endpointUrl}
            />
          </label>
          <label>
            Region
            <input
              aria-label="Region"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setProviderForm((current) => ({ ...current, region: value }));
              }}
              value={providerForm.region}
            />
          </label>
          <label>
            <input
              aria-label="Path-style addressing"
              checked={providerForm.pathStyleEnabled}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setProviderForm((current) => ({ ...current, pathStyleEnabled: checked }));
              }}
              type="checkbox"
            />
            Path-style addressing
          </label>
          <label>
            <input
              aria-label="Multipart uploads"
              checked={providerForm.supportsMultipart}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setProviderForm((current) => ({ ...current, supportsMultipart: checked }));
              }}
              type="checkbox"
            />
            Multipart uploads
          </label>
          <label>
            <input
              aria-label="Object lock support"
              checked={providerForm.supportsObjectLock}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setProviderForm((current) => ({ ...current, supportsObjectLock: checked }));
              }}
              type="checkbox"
            />
            Object lock support
          </label>
          <label>
            <input
              aria-label="Lifecycle support"
              checked={providerForm.supportsLifecycle}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setProviderForm((current) => ({ ...current, supportsLifecycle: checked }));
              }}
              type="checkbox"
            />
            Lifecycle support
          </label>
          <button disabled={busyAction === "providers:create"} type="submit">Create provider</button>
        </form>
      </section>

      <section aria-label="Storage buckets">
        <h3>Storage buckets</h3>
        <ul>
          {buckets.map((bucket) => {
            const provider = providerById.get(bucket.providerId);
            return (
              <li key={bucket.bucketId}>
                <strong>{bucket.bucketName}</strong>
                <span>{bucket.logicalScope}</span>
                <span>{provider?.providerCode ?? bucket.providerId}</span>
                {bucket.bucketRegion ? <span>{bucket.bucketRegion}</span> : null}
                {bucket.dataResidencyRegion ? <span>{bucket.dataResidencyRegion}</span> : null}
                {bucket.defaultStorageClass ? <span>{bucket.defaultStorageClass}</span> : null}
                {bucket.defaultEncryptionMode ? <span>{bucket.defaultEncryptionMode}</span> : null}
                {bucket.objectKeyPrefix ? <span>{bucket.objectKeyPrefix}</span> : null}
                {bucket.versioningEnabled ? <span>versioned</span> : null}
                {bucket.lifecycleEnabled ? <span>lifecycle</span> : null}
                {bucket.publicAccessBlocked ? <span>public-blocked</span> : null}
                {bucket.status ? <span>{bucket.status}</span> : null}
                <label>
                  Bucket status
                  <select
                    aria-label={`Bucket status for ${bucket.bucketName}`}
                    onChange={(event) => {
                      const value = event.currentTarget.value as SdkworkStorageResourceStatus;
                      setBucketStatusDrafts((current) => ({
                        ...current,
                        [bucket.bucketId]: value,
                      }));
                    }}
                    value={bucketStatusDrafts[bucket.bucketId] ?? bucket.status ?? "active"}
                  >
                    {SDKWORK_STORAGE_RESOURCE_STATUSES.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>{statusValue}</option>
                    ))}
                  </select>
                </label>
                <button
                  aria-label={`Save bucket status for ${bucket.bucketName}`}
                  disabled={busyAction === "buckets:update"}
                  onClick={() => { void updateBucketStatus(bucket); }}
                  type="button"
                >
                  Save status
                </button>
                <label>
                  Bucket status reason
                  <input
                    aria-label={`Bucket status reason for ${bucket.bucketName}`}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setBucketStatusReasonDrafts((current) => ({
                        ...current,
                        [bucket.bucketId]: value,
                      }));
                    }}
                    required
                    value={bucketStatusReasonDrafts[bucket.bucketId] ?? ""}
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <form aria-label="Create storage bucket" onSubmit={(event) => { void createBucket(event); }}>
          <label>
            Bucket provider
            <select
              aria-label="Bucket provider"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, providerId: value }));
              }}
              required
              value={bucketForm.providerId || providers[0]?.providerId || ""}
            >
              {providers.map((provider) => (
                <option key={provider.providerId} value={provider.providerId}>{provider.providerCode}</option>
              ))}
            </select>
          </label>
          <label>
            Bucket logical scope
            <select
              aria-label="Bucket logical scope"
              onChange={(event) => {
                const value = event.currentTarget.value as SdkworkStorageBucketLogicalScope;
                setBucketForm((current) => ({
                  ...current,
                  logicalScope: value,
                }));
              }}
              value={bucketForm.logicalScope}
            >
              {SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES.map((logicalScope) => (
                <option key={logicalScope} value={logicalScope}>{logicalScope}</option>
              ))}
            </select>
          </label>
          <label>
            Bucket name
            <input
              aria-label="Bucket name"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, bucketName: value }));
              }}
              required
              value={bucketForm.bucketName}
            />
          </label>
          <label>
            Data residency region
            <input
              aria-label="Data residency region"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, dataResidencyRegion: value }));
              }}
              value={bucketForm.dataResidencyRegion}
            />
          </label>
          <label>
            Bucket region
            <input
              aria-label="Bucket region"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, bucketRegion: value }));
              }}
              value={bucketForm.bucketRegion}
            />
          </label>
          <label>
            Object key prefix
            <input
              aria-label="Object key prefix"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, objectKeyPrefix: value }));
              }}
              value={bucketForm.objectKeyPrefix}
            />
          </label>
          <label>
            Default storage class
            <select
              aria-label="Default storage class"
              onChange={(event) => {
                const value = event.currentTarget.value as SdkworkStorageBucketStorageClass;
                setBucketForm((current) => ({ ...current, defaultStorageClass: value }));
              }}
              value={bucketForm.defaultStorageClass}
            >
              {SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES.map((storageClass) => (
                <option key={storageClass} value={storageClass}>{storageClass}</option>
              ))}
            </select>
          </label>
          <label>
            Encryption mode
            <select
              aria-label="Encryption mode"
              onChange={(event) => {
                const value = event.currentTarget.value as SdkworkStorageEncryptionMode;
                setBucketForm((current) => ({ ...current, defaultEncryptionMode: value }));
              }}
              value={bucketForm.defaultEncryptionMode}
            >
              {SDKWORK_STORAGE_ENCRYPTION_MODES.map((encryptionMode) => (
                <option key={encryptionMode} value={encryptionMode}>{encryptionMode}</option>
              ))}
            </select>
          </label>
          <label>
            KMS key reference
            <input
              aria-label="KMS key reference"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setBucketForm((current) => ({ ...current, kmsKeyRef: value }));
              }}
              value={bucketForm.kmsKeyRef}
            />
          </label>
          <label>
            <input
              aria-label="Versioning enabled"
              checked={bucketForm.versioningEnabled}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setBucketForm((current) => ({ ...current, versioningEnabled: checked }));
              }}
              type="checkbox"
            />
            Versioning enabled
          </label>
          <label>
            <input
              aria-label="Object lock enabled"
              checked={bucketForm.objectLockEnabled}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setBucketForm((current) => ({ ...current, objectLockEnabled: checked }));
              }}
              type="checkbox"
            />
            Object lock enabled
          </label>
          <label>
            <input
              aria-label="Lifecycle enabled"
              checked={bucketForm.lifecycleEnabled}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setBucketForm((current) => ({ ...current, lifecycleEnabled: checked }));
              }}
              type="checkbox"
            />
            Lifecycle enabled
          </label>
          <label>
            <input
              aria-label="Public access blocked"
              checked={bucketForm.publicAccessBlocked}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setBucketForm((current) => ({ ...current, publicAccessBlocked: checked }));
              }}
              type="checkbox"
            />
            Public access blocked
          </label>
          <button disabled={busyAction === "buckets:create" || providers.length === 0} type="submit">Create bucket</button>
        </form>
      </section>

      <section aria-label="Default storage buckets">
        <h3>Default storage buckets</h3>
        <dl>
          {defaultBuckets.map((defaultBucket) => (
            <React.Fragment key={defaultBucket.logicalScope}>
              <dt>{defaultBucket.logicalScope}</dt>
              <dd>
                <span>{defaultBucket.bucketName}</span>
                <span>Default provider</span>
                <span>{defaultBucket.providerCode}</span>
                <span>{defaultBucket.providerType}</span>
                <span>{defaultBucket.status}</span>
              </dd>
            </React.Fragment>
          ))}
        </dl>
        <form aria-label="Set default storage bucket" onSubmit={(event) => { void setDefaultBucket(event); }}>
          <label>
            Default logical scope
            <select
              aria-label="Default logical scope"
              onChange={(event) => {
                const logicalScope = event.currentTarget.value as SdkworkStorageBucketLogicalScope;
                const existing = defaultBuckets.find((item) => item.logicalScope === logicalScope);
                const firstBucket = buckets.find((bucket) => (
                  bucket.logicalScope === logicalScope
                  && isActiveStorageResource(bucket.status)
                  && isActiveStorageResource(providerById.get(bucket.providerId)?.status)
                ));
                setDefaultForm((current) => ({
                  ...current,
                  bucketId: existing?.bucketId ?? firstBucket?.bucketId ?? "",
                  logicalScope,
                }));
              }}
              value={defaultForm.logicalScope}
            >
              {SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES.map((logicalScope) => (
                <option key={logicalScope} value={logicalScope}>{logicalScope}</option>
              ))}
            </select>
          </label>
          <label>
            Default bucket
            <select
              aria-label="Default bucket"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDefaultForm((current) => ({ ...current, bucketId: value }));
              }}
              required
              value={selectedDefaultBucketId}
            >
              {bucketsForDefaultScope.map((bucket) => {
                const provider = providerById.get(bucket.providerId);
                return (
                  <option key={bucket.bucketId} value={bucket.bucketId}>
                    {`${bucket.bucketName} / ${provider?.providerCode ?? bucket.providerId}`}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Change reason
            <input
              aria-label="Change reason"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDefaultForm((current) => ({ ...current, reason: value }));
              }}
              value={defaultForm.reason}
              required
            />
          </label>
          <button disabled={busyAction === "default-buckets:set" || bucketsForDefaultScope.length === 0} type="submit">Save default</button>
        </form>
      </section>
    </section>
  );
}

function ProviderListItem({
  busy,
  healthCheck,
  onHealthCheck,
  onStatusChange,
  onStatusReasonChange,
  onStatusSave,
  provider,
  statusReason,
  statusValue,
}: {
  busy: boolean;
  healthCheck?: AdminStorageProviderHealthCheckResult;
  onHealthCheck: (provider: StorageProviderView) => void;
  onStatusChange: (provider: StorageProviderView, status: SdkworkStorageResourceStatus) => void;
  onStatusReasonChange: (provider: StorageProviderView, reason: string) => void;
  onStatusSave: (provider: StorageProviderView) => void;
  provider: StorageProviderView;
  statusReason: string;
  statusValue: SdkworkStorageResourceStatus;
}): React.ReactElement {
  return (
    <li>
      <strong>{provider.providerCode}</strong>
      <span>{provider.providerType}</span>
      <span>{provider.pathStyleEnabled ? "path-style" : "virtual-hosted"}</span>
      <span>{provider.supportsMultipart === false ? "singlepart" : "multipart"}</span>
      {provider.supportsLifecycle ? <span>lifecycle</span> : null}
      {provider.supportsObjectLock ? <span>object-lock</span> : null}
      {provider.region ? <span>{provider.region}</span> : null}
      {provider.status ? <span>{provider.status}</span> : null}
      <label>
        Provider status
        <select
          aria-label={`Provider status for ${provider.providerCode}`}
          onChange={(event) => {
            onStatusChange(provider, event.currentTarget.value as SdkworkStorageResourceStatus);
          }}
          value={statusValue}
        >
          {SDKWORK_STORAGE_RESOURCE_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <button
        aria-label={`Save provider status for ${provider.providerCode}`}
        disabled={busy}
        onClick={() => {
          onStatusSave(provider);
        }}
        type="button"
      >
        Save status
      </button>
      <label>
        Provider status reason
        <input
          aria-label={`Provider status reason for ${provider.providerCode}`}
          onChange={(event) => {
            onStatusReasonChange(provider, event.currentTarget.value);
          }}
          required
          value={statusReason}
        />
      </label>
      {healthCheck ? (
        <span>
          <span>{healthCheck.healthy ? "healthy" : "unhealthy"}</span>
          <span>{healthCheck.status}</span>
          {healthCheck.checkedAt ? <span>{healthCheck.checkedAt}</span> : null}
        </span>
      ) : null}
      <button
        aria-label={`Run health check for ${provider.providerCode}`}
        disabled={busy}
        onClick={() => {
          onHealthCheck(provider);
        }}
        type="button"
      >
        Check
      </button>
    </li>
  );
}

function normalizeProvider(value: unknown): StorageProviderView | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const providerCode = readString(record, "providerCode") ?? readString(record, "provider_code");
  const providerId = readString(record, "providerId") ?? readString(record, "provider_id") ?? providerCode;
  const providerType = readStorageProviderType(readString(record, "providerType") ?? readString(record, "provider_type"));
  if (!providerCode || !providerId || !providerType) {
    return null;
  }
  return {
    providerCode,
    providerId,
    providerType,
    ...optionalBooleanField("pathStyleEnabled", readBoolean(record, "pathStyleEnabled") ?? readBoolean(record, "path_style_enabled")),
    ...optionalField("region", readString(record, "region")),
    ...optionalField("status", readStorageResourceStatus(readString(record, "status"))),
    ...optionalBooleanField("supportsLifecycle", readBoolean(record, "supportsLifecycle") ?? readBoolean(record, "supports_lifecycle")),
    ...optionalBooleanField("supportsMultipart", readBoolean(record, "supportsMultipart") ?? readBoolean(record, "supports_multipart")),
    ...optionalBooleanField("supportsObjectLock", readBoolean(record, "supportsObjectLock") ?? readBoolean(record, "supports_object_lock")),
  };
}

function normalizeBucket(value: unknown): StorageBucketView | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const bucketId = readString(record, "bucketId") ?? readString(record, "bucket_id");
  const bucketName = readString(record, "bucketName") ?? readString(record, "bucket_name");
  const logicalScope = readStorageBucketLogicalScope(readString(record, "logicalScope") ?? readString(record, "logical_scope"));
  const providerId = readString(record, "providerId") ?? readString(record, "provider_id");
  if (!bucketId || !bucketName || !logicalScope || !providerId) {
    return null;
  }
  return {
    bucketId,
    bucketName,
    logicalScope,
    providerId,
    ...optionalField("bucketRegion", readString(record, "bucketRegion") ?? readString(record, "bucket_region")),
    ...optionalField("dataResidencyRegion", readString(record, "dataResidencyRegion") ?? readString(record, "data_residency_region")),
    ...optionalField("defaultEncryptionMode", readStorageEncryptionMode(readString(record, "defaultEncryptionMode") ?? readString(record, "default_encryption_mode"))),
    ...optionalField("defaultStorageClass", readStorageBucketStorageClass(readString(record, "defaultStorageClass") ?? readString(record, "default_storage_class"))),
    ...optionalField("kmsKeyRef", readString(record, "kmsKeyRef") ?? readString(record, "kms_key_ref")),
    ...optionalBooleanField("lifecycleEnabled", readBoolean(record, "lifecycleEnabled") ?? readBoolean(record, "lifecycle_enabled")),
    ...optionalField("objectKeyPrefix", readString(record, "objectKeyPrefix") ?? readString(record, "object_key_prefix")),
    ...optionalBooleanField("objectLockEnabled", readBoolean(record, "objectLockEnabled") ?? readBoolean(record, "object_lock_enabled")),
    ...optionalBooleanField("publicAccessBlocked", readBoolean(record, "publicAccessBlocked") ?? readBoolean(record, "public_access_blocked")),
    ...optionalField("status", readStorageResourceStatus(readString(record, "status"))),
    ...optionalBooleanField("versioningEnabled", readBoolean(record, "versioningEnabled") ?? readBoolean(record, "versioning_enabled")),
  };
}

function defaultRequestIdFactory(action: StorageAdminRequestAction, logicalScope?: SdkworkStorageBucketLogicalScope): string {
  return logicalScope ? `storage-admin:${action}:${logicalScope}` : `storage-admin:${action}`;
}

function defaultIdempotencyKeyFactory(action: "buckets:create" | "providers:create", key: string): string {
  return `storage-admin:${action}:${key}`;
}

function optionalField<TKey extends string, TValue extends string>(key: TKey, value: TValue | undefined): { [K in TKey]?: TValue } {
  return value?.trim() ? { [key]: value } as { [K in TKey]?: TValue } : {};
}

function optionalBooleanField<TKey extends string>(key: TKey, value: boolean | undefined): { [K in TKey]?: boolean } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: boolean };
}

function requiredTrimmed(value: string, message: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

function upsertBy<T>(items: readonly T[], next: T, key: (item: T) => string): T[] {
  const nextKey = key(next);
  const replaced = items.map((item) => (key(item) === nextKey ? next : item));
  return replaced.some((item) => key(item) === nextKey) ? replaced : [...items, next];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readStorageProviderType(value: string | undefined): SdkworkStorageProviderType | undefined {
  return SDKWORK_STORAGE_PROVIDER_TYPES.includes(value as SdkworkStorageProviderType)
    ? value as SdkworkStorageProviderType
    : undefined;
}

function readStorageBucketLogicalScope(value: string | undefined): SdkworkStorageBucketLogicalScope | undefined {
  return SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES.includes(value as SdkworkStorageBucketLogicalScope)
    ? value as SdkworkStorageBucketLogicalScope
    : undefined;
}

function readStorageBucketStorageClass(value: string | undefined): SdkworkStorageBucketStorageClass | undefined {
  return SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES.includes(value as SdkworkStorageBucketStorageClass)
    ? value as SdkworkStorageBucketStorageClass
    : undefined;
}

function readStorageEncryptionMode(value: string | undefined): SdkworkStorageEncryptionMode | undefined {
  return SDKWORK_STORAGE_ENCRYPTION_MODES.includes(value as SdkworkStorageEncryptionMode)
    ? value as SdkworkStorageEncryptionMode
    : undefined;
}

function readStorageResourceStatus(value: string | undefined): SdkworkStorageResourceStatus | undefined {
  return SDKWORK_STORAGE_RESOURCE_STATUSES.includes(value as SdkworkStorageResourceStatus)
    ? value as SdkworkStorageResourceStatus
    : undefined;
}

function isActiveStorageResource(status: SdkworkStorageResourceStatus | undefined): boolean {
  return status === "active";
}

function omitKey<TValue>(record: Record<string, TValue>, key: string): Record<string, TValue> {
  const { [key]: _removed, ...next } = record;
  return next;
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function reportError(error: unknown, onError: ((error: Error) => void) | undefined): void {
  onError?.(error instanceof Error ? error : new Error(String(error)));
}

export type {
  AdminStorageDefaultBucket,
  AdminStoragePort,
  SdkworkStorageBucketLogicalScope,
  SdkworkStorageProviderType,
  SdkworkStorageResourceStatus,
};
