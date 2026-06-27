import type {
  FileUploadProgress,
  UploadFileInput,
  UploadFileResult,
} from "../../sdkwork-file-sdk-ports/src/index";

export type FileUploadClientStatus = UploadFileResult["status"];

export type FileUploadClientProgress = FileUploadProgress;

export type FileUploadClientUpload = (input: UploadFileInput) => Promise<UploadFileResult>;

export interface FileUploadClient {
  uploadFile(input: UploadFileInput): Promise<UploadFileResult>;
}

export interface CreateDriveFileUploadClientOptions {
  uploadFile: FileUploadClientUpload;
}

export class FileUploadClientError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "FileUploadClientError";
    this.code = code;
    this.details = { ...details };
  }
}

export function createDriveFileUploadClient({
  uploadFile,
}: CreateDriveFileUploadClientOptions): FileUploadClient {
  if (typeof uploadFile !== "function") {
    throw new FileUploadClientError(
      "upload.drive_uploader_required",
      "Drive uploader uploadFile implementation is required.",
    );
  }

  return {
    uploadFile(input) {
      return uploadFile(input);
    },
  };
}

export const createFileUploadClient = createDriveFileUploadClient;
