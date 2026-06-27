export type SchemaTextFormat = "json" | "yaml" | "object";

export interface RemoteSchemaUrlPolicy {
  allowedHosts?: string[];
  blockedHosts?: string[];
  allowPrivateHosts?: boolean;
  allowUnresolvedHosts?: boolean;
}

export type SchemaInput =
  | {
      kind: "file";
      value: string;
    }
  | {
      kind: "url";
      value: string;
      headers?: Record<string, string>;
    }
  | {
      kind: "raw";
      value: string;
      format?: Exclude<SchemaTextFormat, "object">;
    }
  | {
      kind: "object";
      value: Record<string, unknown>;
    };

export interface LoadSchemaSourceOptions {
  schema: SchemaInput;
  fetchTimeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  remoteUrlPolicy?: RemoteSchemaUrlPolicy;
}

export interface LoadedSchemaSource {
  schema: Record<string, any>;
  rawContent: string | null;
  source: {
    kind: SchemaInput["kind"];
    format: SchemaTextFormat;
    resolvedPath?: string;
    url?: string;
    contentType?: string | null;
  };
}

export interface RetentionPolicyInput {
  ttlMs?: number;
  maxEntriesPerSchema?: number;
  maxTotalSizeBytes?: number;
}

export interface CreateRequestFingerprintInput {
  schemaFingerprint: string;
  language: string;
  sdkType: string;
  name: string;
  packageName?: string;
  namespace?: string;
  commonPackage?: string;
  baseUrl?: string;
  apiPrefix?: string;
  sdkVersion?: string;
  fixedSdkVersion?: string;
  sdkRoot?: string;
  sdkName?: string;
  npmPackageName?: string;
  npmRegistry?: string;
  syncPublishedVersion?: boolean;
  retention?: RetentionPolicyInput;
}
