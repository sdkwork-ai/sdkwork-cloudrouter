import React, { useEffect, useState } from "react";
import type { SdkworkFileRef } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import type { FileUploadTarget } from "../../../../common/file/sdkwork-file-sdk-ports/src/index";

export interface FileAttachmentListProps {
  files: readonly SdkworkFileRef[];
  onRemove?: (file: SdkworkFileRef) => void;
  title?: string;
}

export interface FileAttachmentManagerProps {
  onError?: (error: Error) => void;
  onRemoved?: (file: SdkworkFileRef) => void;
  requestIdFactory?: (phase: "delete" | "list", value: string) => string;
  service: FilePlatformService;
  slotCode: string;
  target: FileUploadTarget;
  title?: string;
}

type AttachmentManagerStatus = "failed" | "loading" | "ready" | "removing";

export function FileAttachmentList({
  files,
  onRemove,
  title = "Attachments",
}: FileAttachmentListProps): React.ReactElement {
  return (
    <section aria-label={title}>
      {files.length === 0 ? <p>No attachments</p> : null}
      <ul aria-label={title}>
        {files.map((file) => {
          const label = displayFileName(file);
          return (
            <li key={`${file.bindingId ?? "unbound"}:${file.fileId}:${file.versionId ?? "current"}`}>
              <span>{label}</span>
              <span>{file.purpose}</span>
              <span>{file.visibility}</span>
              {file.bindingId ? (
                <button onClick={() => onRemove?.(file)} type="button">
                  {`Remove ${label}`}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function FileAttachmentManager({
  onError,
  onRemoved,
  requestIdFactory = defaultRequestIdFactory,
  service,
  slotCode,
  target,
  title = "Attachments",
}: FileAttachmentManagerProps): React.ReactElement {
  const [files, setFiles] = useState<SdkworkFileRef[]>([]);
  const [status, setStatus] = useState<AttachmentManagerStatus>("loading");

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    void service
      .listBindings({
        requestId: requestIdFactory("list", `${slotCode}:${target.id}`),
        slotCode,
        target,
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
  }, [onError, requestIdFactory, service, slotCode, target]);

  async function removeAttachment(file: SdkworkFileRef): Promise<void> {
    if (!file.bindingId) {
      return;
    }
    setStatus("removing");
    try {
      await service.deleteBinding({
        bindingId: file.bindingId,
        requestId: requestIdFactory("delete", file.bindingId),
      });
      setFiles((current) => current.filter((item) => item.bindingId !== file.bindingId));
      setStatus("ready");
      onRemoved?.(file);
    } catch (error) {
      setStatus("failed");
      onError?.(normalizeError(error));
    }
  }

  return (
    <section aria-label={title} role="region">
      <h2>{title}</h2>
      {status === "loading" ? <p>Loading attachments</p> : null}
      {status === "failed" ? <p>Unable to load attachments</p> : null}
      {status === "removing" ? <p>Removing attachment</p> : null}
      <FileAttachmentList
        files={files}
        onRemove={(file) => {
          void removeAttachment(file);
        }}
        title={title}
      />
    </section>
  );
}

function defaultRequestIdFactory(phase: "delete" | "list", value: string): string {
  return `file-attachments:${phase}:${value}`;
}

function displayFileName(file: SdkworkFileRef): string {
  return file.displayName?.trim() || file.fileId;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
