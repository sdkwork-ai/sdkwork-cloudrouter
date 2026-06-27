import React, { useEffect, useState } from "react";
import type {
  SdkworkStorageUsageScopeType,
  SdkworkStorageUsageSnapshot,
} from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";

export interface StorageUsageBarProps {
  label?: string;
  quotaBytes?: number;
  usedBytes: number;
}

export interface StorageQuotaCardProps {
  onError?: (error: Error) => void;
  requestId?: string;
  scopeId: string;
  scopeType: SdkworkStorageUsageScopeType;
  service: FilePlatformService;
  title?: string;
}

type StorageQuotaCardStatus = "failed" | "loading" | "ready";

export function StorageUsageBar({
  label = "Storage usage",
  quotaBytes,
  usedBytes,
}: StorageUsageBarProps): React.ReactElement {
  const percent = calculateQuotaPercent(usedBytes, quotaBytes);
  const hasQuota = typeof quotaBytes === "number" && quotaBytes > 0;

  return (
    <section aria-label={label}>
      <span>{label}</span>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        aria-valuetext={hasQuota ? `${percent}% of quota used` : "No quota limit"}
        data-quota-state={resolveQuotaState(percent, hasQuota)}
        role="progressbar"
      >
        <span style={{ display: "block", width: `${percent}%` }} />
      </div>
      <span>{formatStorageBytes(usedBytes)}</span>
      {hasQuota ? <span>{formatStorageBytes(quotaBytes)}</span> : <span>Unlimited</span>}
    </section>
  );
}

export function StorageQuotaCard({
  onError,
  requestId,
  scopeId,
  scopeType,
  service,
  title = "Storage usage",
}: StorageQuotaCardProps): React.ReactElement {
  const resolvedRequestId = requestId ?? `storage-usage:${scopeType}:${scopeId}`;
  const [status, setStatus] = useState<StorageQuotaCardStatus>("loading");
  const [usage, setUsage] = useState<SdkworkStorageUsageSnapshot | null>(null);

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    void service
      .getStorageUsage({
        requestId: resolvedRequestId,
        scopeId,
        scopeType,
      })
      .then((result) => {
        if (!disposed) {
          setUsage(result);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!disposed) {
          setUsage(null);
          setStatus("failed");
          onError?.(normalizeError(error));
        }
      });

    return () => {
      disposed = true;
    };
  }, [onError, resolvedRequestId, scopeId, scopeType, service]);

  return (
    <section aria-label={title} role="region">
      <h2>{title}</h2>
      {status === "loading" ? <p>Loading storage usage</p> : null}
      {status === "failed" ? <p>Unable to load storage usage</p> : null}
      {status === "ready" && usage ? (
        <>
          <StorageUsageBar
            label={`${title} quota`}
            quotaBytes={usage.quotaLimitBytes}
            usedBytes={usage.usedBillableBytes}
          />
          <dl>
            <dt>Scope</dt>
            <dd>{`${usage.scopeType}:${usage.scopeId}`}</dd>
            <dt>Logical bytes</dt>
            <dd>{formatStorageBytes(usage.usedLogicalBytes)}</dd>
            <dt>Physical bytes</dt>
            <dd>{formatStorageBytes(usage.usedPhysicalBytes)}</dd>
            <dt>Billable bytes</dt>
            <dd>{formatStorageBytes(usage.usedBillableBytes)}</dd>
            <dt>Retained bytes</dt>
            <dd>{formatStorageBytes(usage.retainedBytes)}</dd>
            <dt>Trash bytes</dt>
            <dd>{formatStorageBytes(usage.trashBytes)}</dd>
            <dt>Variant bytes</dt>
            <dd>{formatStorageBytes(usage.variantBytes)}</dd>
            <dt>Files</dt>
            <dd>{usage.fileCount.toString()}</dd>
            <dt>Objects</dt>
            <dd>{usage.objectCount.toString()}</dd>
            <dt>Versions</dt>
            <dd>{usage.versionCount.toString()}</dd>
          </dl>
        </>
      ) : null}
    </section>
  );
}

export function calculateQuotaPercent(usedBytes: number, quotaBytes: number | undefined): number {
  if (quotaBytes === undefined || quotaBytes <= 0 || usedBytes <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((usedBytes / quotaBytes) * 100)));
}

export function formatStorageBytes(bytes: number): string {
  const normalized = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let value = normalized;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function resolveQuotaState(percent: number, hasQuota: boolean): "near_limit" | "normal" | "over_limit" | "unmetered" {
  if (!hasQuota) {
    return "unmetered";
  }
  if (percent >= 100) {
    return "over_limit";
  }
  if (percent >= 90) {
    return "near_limit";
  }
  return "normal";
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
