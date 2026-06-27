import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { AdminStorageDefaultBucket, AdminStoragePort } from "../../../../common/file/sdkwork-file-sdk-ports/src/index";
import { StorageOperationsSettings } from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork storage admin PC React blocks", () => {
  it("loads providers, bucket mappings, and default bucket policies through the admin storage port", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);

    expect(events).toEqual([
      "listProviders:storage-admin:providers:list",
      "listBuckets:storage-admin:buckets:list",
      "listDefaultBuckets:all:storage-admin:default-buckets:list",
    ]);
    expect(screen.getAllByText("tenant-private")).not.toHaveLength(0);
    expect(screen.getAllByText("tenant_private")).not.toHaveLength(0);
    expect(screen.getByText("Default provider")).not.toBeNull();
    expect(screen.getAllByText("aws_s3")).not.toHaveLength(0);
    expect(screen.queryByText(/accessKey|secret value|credential value|objectKey|presigned/i)).toBeNull();
  });

  it("sets the default bucket for a logical scope without using raw HTTP", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Default bucket"), { target: { value: "bucket_2" } });
    fireEvent.change(screen.getByLabelText("Change reason"), { target: { value: "verified secondary route" } });
    fireEvent.click(screen.getByRole("button", { name: "Save default" }));

    expect(await screen.findAllByText("secondary-s3")).not.toHaveLength(0);

    expect(events).toContain("setDefaultBucket:tenant_private:bucket_2:verified secondary route:storage-admin:default-buckets:set:tenant_private");
  });

  it("only offers active buckets on active providers as default upload route candidates", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);
    const select = screen.getByLabelText("Default bucket") as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((option) => option.textContent ?? "");

    expect(optionLabels).toEqual([
      "tenant-private / primary-s3",
      "tenant-private-secondary / secondary-s3",
    ]);
    expect(optionLabels.join("\n")).not.toContain("tenant-private-archived");
    expect(optionLabels.join("\n")).not.toContain("tenant-private-disabled-provider");
  });

  it("runs provider health checks through the admin storage port", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Run health check for primary-s3" }));

    expect(await screen.findByText("reachable")).not.toBeNull();
    expect(screen.getByText("2026-05-23T08:00:00.000Z")).not.toBeNull();
    expect(events).toContain("healthCheckProvider:provider_1:storage-admin:providers:health-check");
  });

  it("updates provider and bucket status through the admin storage port", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Provider status for primary-s3"), { target: { value: "disabled" } });
    fireEvent.change(screen.getByLabelText("Provider status reason for primary-s3"), { target: { value: "health check failed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save provider status for primary-s3" }));

    expect(await screen.findAllByText("disabled")).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Bucket status for tenant-private"), { target: { value: "archived" } });
    fireEvent.change(screen.getByLabelText("Bucket status reason for tenant-private"), { target: { value: "migration completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save bucket status for tenant-private" }));

    expect(await screen.findAllByText("archived")).not.toHaveLength(0);
    expect(events).toContain("updateProvider:provider_1:disabled:health check failed:storage-admin:providers:update");
    expect(events).toContain("updateBucket:bucket_1:archived:migration completed:storage-admin:buckets:update");
  });

  it("creates provider and bucket configuration through the admin storage port", async () => {
    const events: string[] = [];

    render(<StorageOperationsSettings port={createAdminStoragePort(events)} />);

    expect(await screen.findAllByText("primary-s3")).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Provider code"), { target: { value: "backup-s3" } });
    fireEvent.change(screen.getByLabelText("Provider type"), { target: { value: "s3_compatible" } });
    fireEvent.change(screen.getByLabelText("Credential reference"), { target: { value: "secret/storage/backup" } });
    fireEvent.click(screen.getByLabelText("Path-style addressing"));
    fireEvent.click(screen.getByLabelText("Lifecycle support"));
    fireEvent.click(screen.getByRole("button", { name: "Create provider" }));

    expect(await screen.findAllByText("backup-s3")).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Bucket provider"), { target: { value: "provider_2" } });
    fireEvent.change(screen.getByLabelText("Bucket logical scope"), { target: { value: "tenant_public_asset" } });
    fireEvent.change(screen.getByLabelText("Bucket name"), { target: { value: "tenant-public-assets" } });
    fireEvent.change(screen.getByLabelText("Bucket region"), { target: { value: "us-east-2" } });
    fireEvent.change(screen.getByLabelText("Object key prefix"), { target: { value: "tenants/public/" } });
    fireEvent.change(screen.getByLabelText("Default storage class"), { target: { value: "STANDARD_IA" } });
    fireEvent.change(screen.getByLabelText("Encryption mode"), { target: { value: "sse_kms" } });
    fireEvent.change(screen.getByLabelText("KMS key reference"), { target: { value: "kms/storage/public-assets" } });
    fireEvent.click(screen.getByLabelText("Versioning enabled"));
    fireEvent.click(screen.getByLabelText("Lifecycle enabled"));
    fireEvent.click(screen.getByRole("button", { name: "Create bucket" }));

    expect(await screen.findAllByText("tenant-public-assets")).not.toHaveLength(0);

    expect(events).toContain("createProvider:backup-s3:s3_compatible:secret/storage/backup:path-style:multipart:lifecycle:no-object-lock");
    expect(events).toContain("createBucket:tenant-public-assets:tenant_public_asset:provider_2:STANDARD_IA:sse_kms:tenants/public/:versioned:lifecycle:public-blocked");
  });
});

function createAdminStoragePort(events: string[]): AdminStoragePort {
  const providers = [
    {
      providerCode: "primary-s3",
      providerId: "provider_1",
      providerType: "aws_s3",
      region: "us-east-1",
      pathStyleEnabled: false,
      status: "active",
      supportsLifecycle: true,
      supportsMultipart: true,
      supportsObjectLock: false,
    },
    {
      providerCode: "secondary-s3",
      providerId: "provider_3",
      providerType: "minio",
      region: "us-west-2",
      pathStyleEnabled: true,
      status: "active",
      supportsLifecycle: false,
      supportsMultipart: true,
      supportsObjectLock: false,
    },
    {
      providerCode: "disabled-s3",
      providerId: "provider_4",
      providerType: "s3_compatible",
      region: "us-east-2",
      pathStyleEnabled: false,
      status: "disabled",
      supportsLifecycle: true,
      supportsMultipart: true,
      supportsObjectLock: false,
    },
  ];
  const buckets = [
    {
      bucketId: "bucket_1",
      bucketName: "tenant-private",
      bucketRegion: "us-east-1",
      dataResidencyRegion: "us-east-1",
      defaultEncryptionMode: "sse_s3",
      defaultStorageClass: "STANDARD",
      lifecycleEnabled: true,
      logicalScope: "tenant_private",
      objectKeyPrefix: "tenants/private/",
      objectLockEnabled: false,
      providerId: "provider_1",
      publicAccessBlocked: true,
      status: "active",
      versioningEnabled: true,
    },
    {
      bucketId: "bucket_2",
      bucketName: "tenant-private-secondary",
      bucketRegion: "us-west-2",
      dataResidencyRegion: "us-west-2",
      defaultEncryptionMode: "sse_s3",
      defaultStorageClass: "STANDARD_IA",
      lifecycleEnabled: false,
      logicalScope: "tenant_private",
      objectKeyPrefix: "tenants/private-secondary/",
      objectLockEnabled: false,
      providerId: "provider_3",
      publicAccessBlocked: true,
      status: "active",
      versioningEnabled: false,
    },
    {
      bucketId: "bucket_4",
      bucketName: "tenant-private-archived",
      bucketRegion: "us-east-1",
      dataResidencyRegion: "us-east-1",
      defaultEncryptionMode: "sse_s3",
      defaultStorageClass: "STANDARD",
      lifecycleEnabled: false,
      logicalScope: "tenant_private",
      objectKeyPrefix: "tenants/private-archived/",
      objectLockEnabled: false,
      providerId: "provider_1",
      publicAccessBlocked: true,
      status: "archived",
      versioningEnabled: false,
    },
    {
      bucketId: "bucket_5",
      bucketName: "tenant-private-disabled-provider",
      bucketRegion: "us-east-2",
      dataResidencyRegion: "us-east-2",
      defaultEncryptionMode: "sse_s3",
      defaultStorageClass: "STANDARD",
      lifecycleEnabled: false,
      logicalScope: "tenant_private",
      objectKeyPrefix: "tenants/private-disabled-provider/",
      objectLockEnabled: false,
      providerId: "provider_4",
      publicAccessBlocked: true,
      status: "active",
      versioningEnabled: false,
    },
  ];
  let defaultBuckets: AdminStorageDefaultBucket[] = [
    {
      bucketId: "bucket_1",
      bucketName: "tenant-private",
      logicalScope: "tenant_private",
      providerCode: "primary-s3",
      providerId: "provider_1",
      providerType: "aws_s3",
      status: "active",
    },
  ];

  return {
    async createBucket(input) {
      events.push([
        `createBucket:${input.bucketName}:${input.logicalScope}:${input.providerId}`,
        input.defaultStorageClass ?? "storage-class-default",
        input.defaultEncryptionMode ?? "encryption-default",
        input.objectKeyPrefix ?? "prefix-empty",
        input.versioningEnabled ? "versioned" : "unversioned",
        input.lifecycleEnabled ? "lifecycle" : "no-lifecycle",
        input.publicAccessBlocked ? "public-blocked" : "public-open",
      ].join(":"));
      const bucket = {
        bucketId: "bucket_3",
        bucketName: input.bucketName,
        bucketRegion: input.bucketRegion,
        dataResidencyRegion: input.dataResidencyRegion,
        defaultEncryptionMode: input.defaultEncryptionMode,
        defaultStorageClass: input.defaultStorageClass,
        kmsKeyRef: input.kmsKeyRef,
        lifecycleEnabled: input.lifecycleEnabled,
        logicalScope: input.logicalScope,
        objectKeyPrefix: input.objectKeyPrefix,
        objectLockEnabled: input.objectLockEnabled,
        providerId: input.providerId,
        publicAccessBlocked: input.publicAccessBlocked,
        status: "active",
        versioningEnabled: input.versioningEnabled,
      };
      buckets.push(bucket);
      return { bucket, requestId: input.requestId };
    },
    async updateBucket(input) {
      events.push(`updateBucket:${input.bucketId}:${input.status}:${input.reason}:${input.requestId}`);
      const bucket = buckets.find((item) => item.bucketId === input.bucketId);
      const updated = {
        ...bucket,
        bucketId: input.bucketId,
        bucketName: bucket?.bucketName ?? input.bucketId,
        logicalScope: bucket?.logicalScope ?? "tenant_private",
        providerId: bucket?.providerId ?? "provider_1",
        status: input.status,
      };
      const index = buckets.findIndex((item) => item.bucketId === input.bucketId);
      if (index >= 0) {
        buckets[index] = updated;
      } else {
        buckets.push(updated);
      }
      return { bucket: updated, requestId: input.requestId };
    },
    async createGarbageCollectionJob(input) {
      return { job: { jobType: input.jobType }, requestId: input.requestId };
    },
    async healthCheckProvider(input) {
      events.push(`healthCheckProvider:${input.providerId}:${input.requestId}`);
      return {
        checkedAt: "2026-05-23T08:00:00.000Z",
        healthy: true,
        providerId: input.providerId,
        requestId: input.requestId,
        status: "reachable",
      };
    },
    async createProvider(input) {
      events.push([
        `createProvider:${input.providerCode}:${input.providerType}:${input.credentialRef}`,
        input.pathStyleEnabled ? "path-style" : "virtual-hosted",
        input.supportsMultipart ? "multipart" : "singlepart",
        input.supportsLifecycle ? "lifecycle" : "no-lifecycle",
        input.supportsObjectLock ? "object-lock" : "no-object-lock",
      ].join(":"));
      const provider = {
        pathStyleEnabled: input.pathStyleEnabled,
        providerCode: input.providerCode,
        providerId: "provider_2",
        providerType: input.providerType,
        region: input.region,
        status: "active",
        supportsLifecycle: input.supportsLifecycle,
        supportsMultipart: input.supportsMultipart,
        supportsObjectLock: input.supportsObjectLock,
      };
      providers.push(provider);
      return { provider, requestId: input.requestId };
    },
    async updateProvider(input) {
      events.push(`updateProvider:${input.providerId}:${input.status}:${input.reason}:${input.requestId}`);
      const provider = providers.find((item) => item.providerId === input.providerId);
      const updated = {
        ...provider,
        providerCode: provider?.providerCode ?? input.providerId,
        providerId: input.providerId,
        providerType: provider?.providerType ?? "s3_compatible",
        status: input.status,
      };
      const index = providers.findIndex((item) => item.providerId === input.providerId);
      if (index >= 0) {
        providers[index] = updated;
      } else {
        providers.push(updated);
      }
      return { provider: updated, requestId: input.requestId };
    },
    async createQuotaPolicy(input) {
      return { quotaPolicy: { scopeId: input.scopeId }, requestId: input.requestId };
    },
    async createReconciliationRun(input) {
      return { reconciliationRun: { runType: input.runType }, requestId: input.requestId };
    },
    async listBuckets(input) {
      events.push(`listBuckets:${input.requestId}`);
      return { items: buckets, requestId: input.requestId };
    },
    async listDefaultBuckets(input) {
      events.push(`listDefaultBuckets:${input.logicalScope ?? "all"}:${input.requestId}`);
      return {
        items: input.logicalScope
          ? defaultBuckets.filter((bucket) => bucket.logicalScope === input.logicalScope)
          : defaultBuckets,
        requestId: input.requestId,
      };
    },
    async listProviders(input) {
      events.push(`listProviders:${input.requestId}`);
      return { items: providers, requestId: input.requestId };
    },
    async listQuotaPolicies(input) {
      return { items: [], requestId: input.requestId };
    },
    async listReconciliationRuns(input) {
      return { items: [], requestId: input.requestId };
    },
    async listUsageCounters(input) {
      return { items: [], requestId: input.requestId };
    },
    async listUsageLedger(input) {
      return { items: [], requestId: input.requestId };
    },
    async listUsageSnapshots(input) {
      return { items: [], requestId: input.requestId };
    },
    async setDefaultBucket(input) {
      events.push(`setDefaultBucket:${input.logicalScope}:${input.bucketId}:${input.reason}:${input.requestId}`);
      const selected = buckets.find((bucket) => bucket.bucketId === input.bucketId);
      const provider = providers.find((item) => item.providerId === selected?.providerId);
      const defaultBucket: AdminStorageDefaultBucket = {
        bucketId: input.bucketId,
        bucketName: selected?.bucketName ?? input.bucketId,
        dataResidencyRegion: selected?.dataResidencyRegion,
        logicalScope: input.logicalScope,
        providerCode: provider?.providerCode ?? "unknown-provider",
        providerId: provider?.providerId ?? "unknown-provider",
        providerType: provider?.providerType === "minio" ? "minio" : "aws_s3",
        status: "active",
      };
      defaultBuckets = [
        ...defaultBuckets.filter((bucket) => bucket.logicalScope !== input.logicalScope),
        defaultBucket,
      ];
      return { defaultBucket, requestId: input.requestId };
    },
  };
}
