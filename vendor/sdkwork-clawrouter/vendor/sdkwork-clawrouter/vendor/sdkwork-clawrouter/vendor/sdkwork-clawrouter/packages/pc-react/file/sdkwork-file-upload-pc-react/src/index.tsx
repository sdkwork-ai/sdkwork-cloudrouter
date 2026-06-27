import React, { useId, useRef, useState } from "react";
import type { SdkworkFileRef } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type {
  FilePlatformService,
} from "../../../../common/file/sdkwork-file-service/src/index";
import type { FileUploadProgress, FileUploadTarget } from "../../../../common/file/sdkwork-file-sdk-ports/src/index";

export type FileUploadButtonStatus =
  | "completed"
  | "failed"
  | "idle"
  | "uploading";

export interface FileUploadButtonCompletedResult {
  driveNodeId: string;
  driveSpaceId: string;
  driveUri: string;
  fileRef: SdkworkFileRef;
  uploadId: string;
}

export interface FileUploadButtonProps {
  accept?: string;
  disabled?: boolean;
  idempotencyKeyFactory?: (file: File) => string;
  label?: string;
  onCompleted?: (result: FileUploadButtonCompletedResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: FileUploadProgress) => void;
  requestIdFactory?: (phase: "upload", file: File) => string;
  service: FilePlatformService;
  slotCode: string;
  target: FileUploadTarget;
}

export type FileUploadQueueItemStatus =
  | "completed"
  | "failed"
  | "queued"
  | "uploading";

export interface FileUploadQueueItem {
  filename: string;
  id: string;
  progress: number;
  status: FileUploadQueueItemStatus;
}

export interface FileUploadQueueProps {
  items: readonly FileUploadQueueItem[];
  title?: string;
}

export function FileUploadButton({
  accept,
  disabled = false,
  idempotencyKeyFactory = defaultIdempotencyKey,
  label = "Upload file",
  onCompleted,
  onError,
  onProgress,
  requestIdFactory = defaultRequestId,
  service,
  slotCode,
  target,
}: FileUploadButtonProps): React.ReactElement {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<FileUploadButtonStatus>("idle");

  async function handleFile(file: File): Promise<void> {
    try {
      setStatus("uploading");
      const uploaded = await service.uploadFile({
        contentType: file.type || "application/octet-stream",
        file,
        filename: file.name,
        idempotencyKey: idempotencyKeyFactory(file),
        onProgress,
        requestId: requestIdFactory("upload", file),
        sizeBytes: file.size,
        slotCode,
        target,
      });

      setStatus("completed");
      onCompleted?.({
        driveNodeId: uploaded.driveNodeId,
        driveSpaceId: uploaded.driveSpaceId,
        driveUri: uploaded.driveUri,
        fileRef: uploaded.fileRef,
        uploadId: uploaded.uploadId,
      });
    } catch (error) {
      const normalized = normalizeError(error);
      setStatus("failed");
      onError?.(normalized);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <>
      <button
        data-upload-status={status}
        disabled={disabled || status === "uploading"}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {label}
      </button>
      <input
        accept={accept}
        aria-label={`${label} input`}
        id={inputId}
        onChange={handleInputChange}
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
      />
    </>
  );
}

export function FileUploadQueue({
  items,
  title = "File uploads",
}: FileUploadQueueProps): React.ReactElement {
  return (
    <section aria-label={title}>
      <ul aria-label={title}>
        {items.map((item) => (
          <li data-upload-status={item.status} key={item.id}>
            <span>{item.filename}</span>
            <span>{item.status}</span>
            <span>{formatProgress(item.progress)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function defaultIdempotencyKey(file: File): string {
  return `upload:${file.name}:${file.size}:${file.lastModified}`;
}

function defaultRequestId(phase: "upload", file: File): string {
  return `file-upload:${phase}:${file.name}:${file.size}:${file.lastModified}`;
}

function formatProgress(progress: number): string {
  const bounded = Math.max(0, Math.min(100, Math.round(progress)));
  return `${bounded}%`;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
