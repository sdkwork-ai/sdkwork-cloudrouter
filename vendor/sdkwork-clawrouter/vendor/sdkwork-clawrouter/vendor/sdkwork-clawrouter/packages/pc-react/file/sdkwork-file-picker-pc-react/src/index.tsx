import React, { useEffect, useMemo, useState } from "react";
import type { SdkworkFileRef } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import type { FileUploadTarget } from "../../../../common/file/sdkwork-file-sdk-ports/src/index";

export interface FilePickerDialogProps {
  multiple?: boolean;
  onConfirm?: (files: SdkworkFileRef[]) => void;
  onError?: (error: Error) => void;
  open: boolean;
  requestId?: string;
  service: FilePlatformService;
  slotCode: string;
  target?: FileUploadTarget;
  title?: string;
}

export interface FileSelectedListProps {
  files: readonly SdkworkFileRef[];
  title?: string;
}

export function FilePickerDialog({
  multiple = false,
  onConfirm,
  onError,
  open,
  requestId = "file-picker:list",
  service,
  slotCode,
  target,
  title = "Choose file",
}: FilePickerDialogProps): React.ReactElement | null {
  const [files, setFiles] = useState<SdkworkFileRef[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  useEffect(() => {
    let disposed = false;
    if (!open) {
      return;
    }

    setStatus("loading");
    void service
      .listFiles({
        purpose: slotCode,
        requestId,
        ...(target ? { target } : {}),
      })
      .then((result) => {
        if (!disposed) {
          setFiles(result.items);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!disposed) {
          setStatus("failed");
          onError?.(normalizeError(error));
        }
      });

    return () => {
      disposed = true;
    };
  }, [onError, open, requestId, service, slotCode, target]);

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedIds.has(file.fileId)),
    [files, selectedIds],
  );

  if (!open) {
    return null;
  }

  function toggleFile(file: SdkworkFileRef): void {
    setSelectedIds((current) => {
      if (!multiple) {
        return new Set(current.has(file.fileId) ? [] : [file.fileId]);
      }
      const next = new Set(current);
      if (next.has(file.fileId)) {
        next.delete(file.fileId);
      } else {
        next.add(file.fileId);
      }
      return next;
    });
  }

  return (
    <section aria-label={title} role="dialog">
      <h2>{title}</h2>
      {status === "loading" ? <p>Loading</p> : null}
      {status === "failed" ? <p>Unable to load files</p> : null}
      <ul aria-label={`${title} files`}>
        {files.map((file) => (
          <li key={file.fileId}>
            <span>{displayFileName(file)}</span>
            <span>{file.purpose}</span>
            <button
              aria-pressed={selectedIds.has(file.fileId)}
              onClick={() => toggleFile(file)}
              type="button"
            >
              {selectedIds.has(file.fileId) ? `Unselect ${displayFileName(file)}` : `Select ${displayFileName(file)}`}
            </button>
          </li>
        ))}
      </ul>
      <button
        disabled={selectedFiles.length === 0}
        onClick={() => onConfirm?.(selectedFiles)}
        type="button"
      >
        Confirm selection
      </button>
    </section>
  );
}

export function FileSelectedList({
  files,
  title = "Selected files",
}: FileSelectedListProps): React.ReactElement {
  return (
    <section aria-label={title}>
      <ul aria-label={title}>
        {files.map((file) => (
          <li key={`${file.fileId}:${file.versionId ?? "current"}:${file.bindingId ?? "unbound"}`}>
            <span>{file.fileId}</span>
            <span>{file.purpose}</span>
            <span>{file.visibility}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function displayFileName(file: SdkworkFileRef): string {
  return file.displayName?.trim() || file.fileId;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
