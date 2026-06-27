import React, { useState } from "react";
import type { SdkworkFileRef } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";

export interface FilePreviewSummaryProps {
  file: SdkworkFileRef;
  title?: string;
}

export interface FileAccessUrlResult {
  expiresAt: string;
  requestId: string;
  url: string;
}

export interface FileAccessActionsProps {
  file: SdkworkFileRef;
  onDownloadUrl?: (result: FileAccessUrlResult) => void;
  onError?: (error: Error) => void;
  onPreviewUrl?: (result: FileAccessUrlResult) => void;
  requestIdFactory?: (phase: "download" | "preview", file: SdkworkFileRef) => string;
  service: FilePlatformService;
}

type FileAccessActionStatus = "download_ready" | "failed" | "idle" | "issuing" | "preview_ready";

export function FilePreviewSummary({
  file,
  title = "File preview",
}: FilePreviewSummaryProps): React.ReactElement {
  return (
    <section aria-label={title} role="region">
      <h2>{title}</h2>
      <dl>
        <dt>Name</dt>
        <dd>{displayFileName(file)}</dd>
        <dt>File</dt>
        <dd>{file.fileId}</dd>
        <dt>Purpose</dt>
        <dd>{file.purpose}</dd>
        <dt>Visibility</dt>
        <dd>{file.visibility}</dd>
      </dl>
    </section>
  );
}

export function FileAccessActions({
  file,
  onDownloadUrl,
  onError,
  onPreviewUrl,
  requestIdFactory = defaultRequestIdFactory,
  service,
}: FileAccessActionsProps): React.ReactElement {
  const [status, setStatus] = useState<FileAccessActionStatus>("idle");
  const label = displayFileName(file);

  async function issuePreview(): Promise<void> {
    setStatus("issuing");
    try {
      const result = await service.issuePreviewUrl({
        fileId: file.fileId,
        requestId: requestIdFactory("preview", file),
        ...(file.versionId ? { versionId: file.versionId } : {}),
      });
      setStatus("preview_ready");
      onPreviewUrl?.(result);
    } catch (error) {
      setStatus("failed");
      onError?.(normalizeError(error));
    }
  }

  async function issueDownload(): Promise<void> {
    setStatus("issuing");
    try {
      const result = await service.issueDownloadUrl({
        fileId: file.fileId,
        requestId: requestIdFactory("download", file),
        ...(file.versionId ? { versionId: file.versionId } : {}),
      });
      setStatus("download_ready");
      onDownloadUrl?.(result);
    } catch (error) {
      setStatus("failed");
      onError?.(normalizeError(error));
    }
  }

  return (
    <section aria-label={`${label} file access`}>
      <button disabled={status === "issuing"} onClick={() => void issuePreview()} type="button">
        {`Preview ${label}`}
      </button>
      <button disabled={status === "issuing"} onClick={() => void issueDownload()} type="button">
        {`Download ${label}`}
      </button>
      {status === "issuing" ? <p>Issuing file access URL</p> : null}
      {status === "preview_ready" ? <p>Preview ready</p> : null}
      {status === "download_ready" ? <p>Download ready</p> : null}
      {status === "failed" ? <p>Unable to issue file access URL</p> : null}
    </section>
  );
}

function defaultRequestIdFactory(phase: "download" | "preview", file: SdkworkFileRef): string {
  return `file-preview:${phase}:${file.fileId}:${file.versionId ?? "current"}`;
}

function displayFileName(file: SdkworkFileRef): string {
  return file.displayName?.trim() || file.fileId;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
