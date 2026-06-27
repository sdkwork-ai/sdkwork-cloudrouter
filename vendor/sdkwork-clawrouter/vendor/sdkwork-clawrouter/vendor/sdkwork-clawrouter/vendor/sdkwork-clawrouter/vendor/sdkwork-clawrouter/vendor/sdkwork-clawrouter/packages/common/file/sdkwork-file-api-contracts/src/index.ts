import {
  SDKWORK_FILE_API_ROUTES,
  SDKWORK_FILE_SLOT_STATUSES,
  SDKWORK_FILE_VISIBILITIES,
  SDKWORK_FILE_OPERATION_IDS,
  SDKWORK_FILE_STANDARD,
  SDKWORK_DRIVE_NODE_TYPES,
  SDKWORK_DRIVE_SPACE_STATUSES,
  SDKWORK_DRIVE_SPACE_TYPES,
  SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
  SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  SDKWORK_STORAGE_ENCRYPTION_MODES,
  SDKWORK_STORAGE_JOB_STATUSES,
  SDKWORK_STORAGE_RESOURCE_STATUSES,
  SDKWORK_STORAGE_PROVIDER_TYPES,
  SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
  type SdkworkFileApiSurface,
} from "../../sdkwork-file-contracts/src/index";

type HttpMethod = "delete" | "get" | "patch" | "post";
type JsonSchema = {
  additionalProperties?: boolean | JsonSchema;
  description?: string;
  enum?: readonly string[];
  format?: string;
  items?: JsonSchema | { $ref: string };
  maximum?: number;
  minimum?: number;
  nullable?: boolean;
  properties?: Record<string, JsonSchema | { $ref: string }>;
  required?: readonly string[];
  type?: "array" | "boolean" | "integer" | "number" | "object" | "string";
};

interface OpenApiParameter {
  in: "path" | "query";
  name: string;
  required: boolean;
  schema: JsonSchema;
}

interface OpenApiOperation {
  "x-sdkwork-admin-rbac"?: {
    audit: boolean;
    permission: string;
    scope: "file-platform-admin";
  };
  description?: string;
  operationId: string;
  parameters?: readonly OpenApiParameter[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  summary: string;
  tags: readonly string[];
}

type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>>;

export interface SdkworkFileOpenApiDocument {
  components: {
    schemas: Record<string, JsonSchema>;
  };
  info: {
    title: string;
    version: string;
  };
  openapi: string;
  paths: Record<string, OpenApiPathItem>;
  servers: Array<{ url: string }>;
  tags: Array<{ name: string }>;
}

export interface SdkworkFileApiContractBundle {
  app: SdkworkFileOpenApiDocument;
  backend: SdkworkFileOpenApiDocument;
}

export const SDKWORK_FILE_API_CONTRACT_VERSION = "2026.05.file-platform.api.v1";

const DURABLE_APP_RESOURCE_SCHEMAS = [
  "FileRef",
  "DriveSpace",
  "DriveNode",
  "StorageUsageSnapshot",
  "FileBinding",
] as const;

const FORBIDDEN_DURABLE_STORAGE_FIELDS = [
  "bucket",
  "bucketname",
  "objectkey",
  "objecturi",
  "presignedurl",
  "providerid",
  "publicurl",
  "s3url",
  "signedurl",
] as const;

const STORAGE_QUOTA_POLICY_SCOPE_TYPES = SDKWORK_STORAGE_USAGE_SCOPE_TYPES.filter((scopeType) => scopeType !== "business_domain");

const REQUIRED_SCHEMA_ENUM_CONTRACTS = [
  {
    propertyName: "nodeType",
    schemaName: "DriveNode",
    values: SDKWORK_DRIVE_NODE_TYPES,
  },
  {
    propertyName: "status",
    schemaName: "DriveSpace",
    values: SDKWORK_DRIVE_SPACE_STATUSES,
  },
  {
    propertyName: "type",
    schemaName: "DriveSpace",
    values: SDKWORK_DRIVE_SPACE_TYPES,
  },
  {
    propertyName: "visibility",
    schemaName: "AdminFileRecord",
    values: SDKWORK_FILE_VISIBILITIES,
  },
  {
    propertyName: "visibility",
    schemaName: "FileBinding",
    values: SDKWORK_FILE_VISIBILITIES,
  },
  {
    propertyName: "visibility",
    schemaName: "FileRef",
    values: SDKWORK_FILE_VISIBILITIES,
  },
  {
    propertyName: "status",
    schemaName: "FileSlotDefinition",
    values: SDKWORK_FILE_SLOT_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "StorageBucketConfig",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "UpdateStorageBucketRequest",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "defaultStorageClass",
    schemaName: "CreateStorageBucketRequest",
    values: SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  },
  {
    propertyName: "defaultStorageClass",
    schemaName: "StorageBucketConfig",
    values: SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  },
  {
    propertyName: "defaultEncryptionMode",
    schemaName: "CreateStorageBucketRequest",
    values: SDKWORK_STORAGE_ENCRYPTION_MODES,
  },
  {
    propertyName: "defaultEncryptionMode",
    schemaName: "StorageBucketConfig",
    values: SDKWORK_STORAGE_ENCRYPTION_MODES,
  },
  {
    propertyName: "logicalScope",
    schemaName: "StorageDefaultBucketConfig",
    values: SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
  },
  {
    propertyName: "providerType",
    schemaName: "StorageDefaultBucketConfig",
    values: SDKWORK_STORAGE_PROVIDER_TYPES,
  },
  {
    propertyName: "status",
    schemaName: "StorageDefaultBucketConfig",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "StorageGarbageCollectionJob",
    values: SDKWORK_STORAGE_JOB_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "StorageProviderConfig",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "UpdateStorageProviderRequest",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "StorageQuotaPolicy",
    values: SDKWORK_STORAGE_RESOURCE_STATUSES,
  },
  {
    propertyName: "status",
    schemaName: "StorageReconciliationRun",
    values: SDKWORK_STORAGE_JOB_STATUSES,
  },
  {
    propertyName: "scopeType",
    schemaName: "StorageUsageSnapshot",
    values: SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
  },
] as const;

const BACKEND_STORAGE_CONFIGURATION_COMMANDS = [
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.providers,
    responseSchemaName: "StorageProviderMutationResponse",
    schemaName: "CreateStorageProviderRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.buckets,
    responseSchemaName: "StorageBucketMutationResponse",
    schemaName: "CreateStorageBucketRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.quotas,
    responseSchemaName: "StorageQuotaPolicyMutationResponse",
    schemaName: "CreateStorageQuotaPolicyRequest",
  },
] as const;

const BACKEND_STORAGE_OPERATION_COMMANDS = [
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns,
    responseSchemaName: "StorageReconciliationRunMutationResponse",
    schemaName: "CreateStorageReconciliationRunRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.gcJobs,
    responseSchemaName: "StorageGarbageCollectionJobMutationResponse",
    schemaName: "CreateStorageGarbageCollectionJobRequest",
  },
] as const;

const BACKEND_STORAGE_DEFAULT_BUCKET_COMMANDS = [
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket,
    responseSchemaName: "StorageDefaultBucketMutationResponse",
    schemaName: "SetStorageDefaultBucketRequest",
  },
] as const;

const BACKEND_STORAGE_GOVERNANCE_COMMANDS = [
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.provider,
    responseSchemaName: "StorageProviderMutationResponse",
    schemaName: "UpdateStorageProviderRequest",
  },
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.backend.storage.bucket,
    responseSchemaName: "StorageBucketMutationResponse",
    schemaName: "UpdateStorageBucketRequest",
  },
] as const;

const APP_FILE_COMMANDS = [
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.files.issueDownloadUrl,
    responseSchemaName: "FileAccessUrl",
    schemaName: "IssueFileAccessUrlRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.files.issuePreviewUrl,
    responseSchemaName: "FileAccessUrl",
    schemaName: "IssueFileAccessUrlRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.fileBindings.collection,
    responseSchemaName: "FileBindingMutationResponse",
    schemaName: "CreateFileBindingRequest",
  },
  {
    method: "delete",
    path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
    responseSchemaName: "DeleteFileBindingResponse",
    schemaName: "DeleteFileBindingRequest",
  },
] as const;

const APP_FOUNDATION_COMMANDS = [
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.app.files.update,
    responseSchemaName: "FileMutationResponse",
    schemaName: "UpdateFileRequest",
  },
  {
    method: "delete",
    path: SDKWORK_FILE_API_ROUTES.app.files.delete,
    responseSchemaName: "DeleteFileResponse",
    schemaName: "DeleteFileRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.drive.createFolder,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "CreateDriveFolderRequest",
  },
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.app.drive.updateNode,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "UpdateDriveNodeRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.drive.moveNode,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "MoveDriveNodeRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.drive.copyNode,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "CopyDriveNodeRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.drive.trashNode,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "TrashDriveNodeRequest",
  },
  {
    method: "post",
    path: SDKWORK_FILE_API_ROUTES.app.drive.restoreNode,
    responseSchemaName: "DriveNodeMutationResponse",
    schemaName: "RestoreDriveNodeRequest",
  },
  {
    method: "patch",
    path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
    responseSchemaName: "FileBindingDetailResponse",
    schemaName: "UpdateFileBindingRequest",
  },
] as const;

const FOUNDATION_READ_RESPONSE_CONTRACTS = [
  {
    operationId: "files.list",
    responseSchemaName: "FileListResponse",
    surface: "app",
  },
  {
    operationId: "files.retrieve",
    responseSchemaName: "FileDetailResponse",
    surface: "app",
  },
  {
    operationId: "files.versions.list",
    responseSchemaName: "FileVersionListResponse",
    surface: "app",
  },
  {
    operationId: "drive.changes.list",
    responseSchemaName: "DriveChangeListResponse",
    surface: "app",
  },
  {
    operationId: "fileBindings.list",
    responseSchemaName: "FileBindingListResponse",
    surface: "app",
  },
  {
    operationId: "drive.spaces.list",
    responseSchemaName: "DriveSpaceListResponse",
    surface: "app",
  },
  {
    operationId: "drive.nodes.list",
    responseSchemaName: "DriveNodeListResponse",
    surface: "app",
  },
  {
    operationId: "storage.usage.retrieve",
    responseSchemaName: "StorageUsageSnapshot",
    surface: "app",
  },
  {
    operationId: "storage.usage.spaces.list",
    responseSchemaName: "StorageSpaceUsageListResponse",
    surface: "app",
  },
  {
    operationId: "storage.quotas.current.retrieve",
    responseSchemaName: "StorageQuota",
    surface: "app",
  },
  {
    operationId: "oss.providers.list",
    responseSchemaName: "StorageProviderListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.buckets.list",
    responseSchemaName: "StorageBucketListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.defaultBuckets.list",
    responseSchemaName: "StorageDefaultBucketListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.quotas.list",
    responseSchemaName: "StorageQuotaPolicyListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.reconciliationRuns.list",
    responseSchemaName: "StorageReconciliationRunListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.usage.list",
    responseSchemaName: "StorageUsageCounterListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.usage.ledger.list",
    responseSchemaName: "StorageUsageLedgerListResponse",
    surface: "backend",
  },
  {
    operationId: "oss.usage.snapshots.list",
    responseSchemaName: "StorageUsageSnapshotListResponse",
    surface: "backend",
  },
] as const;

const FOUNDATION_QUERY_PARAMETER_CONTRACTS = [
  {
    operationId: "files.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalStringQueryParameter("purpose", "File slot code filter."),
      optionalStringQueryParameter("targetType", "Business target type filter."),
      optionalStringQueryParameter("targetId", "Business target id filter."),
    ],
    surface: "app",
  },
  {
    operationId: "files.retrieve",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("versionId", "Stable file version id."),
    ],
    surface: "app",
  },
  {
    operationId: "files.versions.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
    ],
    surface: "app",
  },
  {
    operationId: "fileBindings.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("purpose", "File slot code filter."),
      requiredStringQueryParameter("targetType", "Business target type."),
      requiredStringQueryParameter("targetId", "Business target id."),
    ],
    surface: "app",
  },
  {
    operationId: "drive.spaces.list",
    parameters: [requestIdQueryParameter()],
    surface: "app",
  },
  {
    operationId: "drive.nodes.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("parentNodeId", "Parent drive node id."),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
    ],
    surface: "app",
  },
  {
    operationId: "drive.changes.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("spaceId", "Drive space id filter."),
      optionalStringQueryParameter("cursor", "Change cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 500),
    ],
    surface: "app",
  },
  {
    operationId: "storage.usage.retrieve",
    parameters: [
      requestIdQueryParameter(),
      requiredEnumQueryParameter("scopeType", "Usage scope type.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      requiredStringQueryParameter("scopeId", "Usage scope id."),
    ],
    surface: "app",
  },
  {
    operationId: "storage.usage.spaces.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
    ],
    surface: "app",
  },
  {
    operationId: "storage.quotas.current.retrieve",
    parameters: [
      requestIdQueryParameter(),
      requiredEnumQueryParameter("scopeType", "Quota scope type.", STORAGE_QUOTA_POLICY_SCOPE_TYPES),
      requiredStringQueryParameter("scopeId", "Quota scope id."),
    ],
    surface: "app",
  },
  {
    operationId: "oss.providers.list",
    parameters: [requestIdQueryParameter()],
    surface: "backend",
  },
  {
    operationId: "oss.buckets.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalEnumQueryParameter("logicalScope", "Logical bucket scope filter.", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      optionalStringQueryParameter("providerId", "Storage provider id filter."),
      optionalStringQueryParameter("status", "Bucket mapping status filter."),
    ],
    surface: "backend",
  },
  {
    operationId: "oss.defaultBuckets.list",
    parameters: [
      requestIdQueryParameter(),
      optionalEnumQueryParameter("logicalScope", "Logical bucket scope filter.", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
    ],
    surface: "backend",
  },
  {
    operationId: "oss.quotas.list",
    parameters: [requestIdQueryParameter()],
    surface: "backend",
  },
  {
    operationId: "oss.reconciliationRuns.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalStringQueryParameter("runType", "Reconciliation run type filter."),
      optionalStringQueryParameter("status", "Reconciliation run status filter."),
    ],
    surface: "backend",
  },
  {
    operationId: "oss.usage.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalEnumQueryParameter("scopeType", "Usage scope type filter.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      optionalStringQueryParameter("scopeId", "Usage scope id filter."),
    ],
    surface: "backend",
  },
  {
    operationId: "oss.usage.ledger.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalEnumQueryParameter("scopeType", "Usage scope type filter.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      optionalStringQueryParameter("scopeId", "Usage scope id filter."),
      optionalDateTimeQueryParameter("occurredAfter", "Ledger event lower time bound."),
      optionalDateTimeQueryParameter("occurredBefore", "Ledger event upper time bound."),
    ],
    surface: "backend",
  },
  {
    operationId: "oss.usage.snapshots.list",
    parameters: [
      requestIdQueryParameter(),
      optionalStringQueryParameter("cursor", "Pagination cursor."),
      optionalIntegerQueryParameter("limit", "Page size.", 1, 200),
      optionalEnumQueryParameter("scopeType", "Usage scope type filter.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      optionalStringQueryParameter("scopeId", "Usage scope id filter."),
      optionalDateTimeQueryParameter("periodStartAt", "Snapshot period lower time bound."),
      optionalDateTimeQueryParameter("periodEndAt", "Snapshot period upper time bound."),
      optionalStringQueryParameter("snapshotType", "Snapshot cadence or type filter."),
    ],
    surface: "backend",
  },
] as const;

export const SDKWORK_FILE_APP_OPENAPI: SdkworkFileOpenApiDocument = createOpenApiDocument("app");
export const SDKWORK_FILE_BACKEND_OPENAPI: SdkworkFileOpenApiDocument = createOpenApiDocument("backend");

export function createFileApiContractBundle(): SdkworkFileApiContractBundle {
  return {
    app: SDKWORK_FILE_APP_OPENAPI,
    backend: SDKWORK_FILE_BACKEND_OPENAPI,
  };
}

export function validateFileApiContractStandard(
  bundle: SdkworkFileApiContractBundle = createFileApiContractBundle(),
): string[] {
  const violations: string[] = [];
  const appPaths = Object.keys(bundle.app.paths);
  const backendPaths = Object.keys(bundle.backend.paths);
  const operationIds = [
    ...collectOperationIds(bundle.app),
    ...collectOperationIds(bundle.backend),
  ];

  if (bundle.app.openapi !== SDKWORK_FILE_STANDARD.api.openapi) {
    violations.push("app_openapi_version");
  }
  if (bundle.backend.openapi !== SDKWORK_FILE_STANDARD.api.openapi) {
    violations.push("backend_openapi_version");
  }
  if (appPaths.some((path) => !path.startsWith(SDKWORK_FILE_STANDARD.api.appPrefix))) {
    violations.push("app_path_prefix");
  }
  if (backendPaths.some((path) => !path.startsWith(SDKWORK_FILE_STANDARD.api.backendPrefix))) {
    violations.push("backend_path_prefix");
  }
  for (const [surface, document] of [
    ["app", bundle.app],
    ["backend", bundle.backend],
  ] as const) {
    for (const ref of collectUnresolvedSchemaRefs(document)) {
      violations.push(`unresolved_schema_ref:${surface}:${ref}`);
    }
    for (const schemaPath of collectUnboundedObjectSchemaPaths(document.components.schemas)) {
      violations.push(`unbounded_object_schema:${surface}:${schemaPath}`);
    }
    for (const contract of REQUIRED_SCHEMA_ENUM_CONTRACTS) {
      const schema = document.components.schemas[contract.schemaName];
      if (!schema) {
        continue;
      }
      const propertySchema = schema.properties?.[contract.propertyName];
      if (!isEnumStringSchema(propertySchema, contract.values)) {
        violations.push(`schema_enum:${surface}:${contract.schemaName}.${contract.propertyName}`);
      }
    }
  }
  for (const document of [bundle.app, bundle.backend]) {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const operation of Object.values(pathItem)) {
        for (const parameterName of pathParameterNames(path)) {
          if (!hasRequiredPathParameter(operation, parameterName)) {
            violations.push(`missing_path_parameter:${operation.operationId}:${parameterName}`);
          }
        }
      }
    }
  }
  if (new Set(operationIds).size !== operationIds.length) {
    violations.push("duplicate_operation_id");
  }
  if (!sameStringSet(operationIds, Object.values(SDKWORK_FILE_OPERATION_IDS).map((operation) => operation.operationId))) {
    violations.push("operation_contract_mismatch");
  }
  const operationContractsById = new Map(
    Object.values(SDKWORK_FILE_OPERATION_IDS).map((operation) => [operation.operationId, operation]),
  );
  for (const [surface, document] of [
    ["app", bundle.app],
    ["backend", bundle.backend],
  ] as const) {
    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const operation of Object.values(pathItem)) {
        const contract = operationContractsById.get(operation.operationId);
        if (!contract) {
          continue;
        }
        if (contract.apiSurface !== surface || contract.path !== path || operation.tags[0] !== contract.tag) {
          violations.push(`operation_contract_metadata_mismatch:${operation.operationId}`);
        }
      }
    }
  }

  for (const operation of collectOperations(bundle.backend)) {
    if (!operation["x-sdkwork-admin-rbac"]?.audit || operation["x-sdkwork-admin-rbac"].scope !== "file-platform-admin") {
      violations.push(`backend_rbac:${operation.operationId}`);
    }
  }

  for (const schemaName of DURABLE_APP_RESOURCE_SCHEMAS) {
    const schema = bundle.app.components.schemas[schemaName];
    if (!schema) {
      violations.push(`missing_app_schema:${schemaName}`);
      continue;
    }
    const serialized = JSON.stringify(schema).toLowerCase();
    for (const forbidden of FORBIDDEN_DURABLE_STORAGE_FIELDS) {
      if (serialized.includes(forbidden)) {
        violations.push(`app_storage_internal_schema:${schemaName}:${forbidden}`);
      }
    }
  }

  for (const command of BACKEND_STORAGE_CONFIGURATION_COMMANDS) {
    const operation = bundle.backend.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_backend_storage_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`backend_storage_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`backend_storage_command_response_body:${operation.operationId}`);
    }
    const schema = bundle.backend.components.schemas[command.schemaName];
    if (!schema) {
      violations.push(`missing_backend_storage_command_schema:${command.schemaName}`);
      continue;
    }
    if (!schema.required?.includes("idempotencyKey") || !schema.required.includes("requestId")) {
      violations.push(`backend_storage_command_idempotency:${command.schemaName}`);
    }
  }
  for (const command of BACKEND_STORAGE_OPERATION_COMMANDS) {
    const operation = bundle.backend.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_backend_storage_operation_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`backend_storage_operation_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`backend_storage_operation_command_response_body:${operation.operationId}`);
    }
    const schema = bundle.backend.components.schemas[command.schemaName];
    if (!schema) {
      violations.push(`missing_backend_storage_operation_command_schema:${command.schemaName}`);
      continue;
    }
    if (!schema.required?.includes("idempotencyKey") || !schema.required.includes("requestId")) {
      violations.push(`backend_storage_operation_command_idempotency:${command.schemaName}`);
    }
  }
  for (const command of BACKEND_STORAGE_DEFAULT_BUCKET_COMMANDS) {
    const operation = bundle.backend.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_backend_storage_default_bucket_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`backend_storage_default_bucket_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`backend_storage_default_bucket_command_response_body:${operation.operationId}`);
    }
    const schema = bundle.backend.components.schemas[command.schemaName];
    if (!schema) {
      violations.push(`missing_backend_storage_default_bucket_command_schema:${command.schemaName}`);
      continue;
    }
    if (schema.required?.includes("idempotencyKey") || !schema.required?.includes("requestId") || !schema.required.includes("bucketId") || !schema.required.includes("reason")) {
      violations.push(`backend_storage_default_bucket_command_shape:${command.schemaName}`);
    }
  }
  for (const command of BACKEND_STORAGE_GOVERNANCE_COMMANDS) {
    const operation = bundle.backend.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_backend_storage_governance_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`backend_storage_governance_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`backend_storage_governance_command_response_body:${operation.operationId}`);
    }
    const schema = bundle.backend.components.schemas[command.schemaName];
    if (!schema) {
      violations.push(`missing_backend_storage_governance_command_schema:${command.schemaName}`);
      continue;
    }
    if (schema.required?.includes("idempotencyKey") || !schema.required?.includes("requestId") || !schema.required.includes("reason") || !schema.required.includes("status")) {
      violations.push(`backend_storage_governance_command_shape:${command.schemaName}`);
    }
  }
  for (const command of APP_FILE_COMMANDS) {
    const operation = bundle.app.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_app_file_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`app_file_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`app_file_command_response_body:${operation.operationId}`);
    }
  }
  for (const command of APP_FOUNDATION_COMMANDS) {
    const operation = bundle.app.paths[command.path]?.[command.method];
    if (!operation) {
      violations.push(`missing_app_foundation_command:${command.path}:${command.method}`);
      continue;
    }
    if (!isJsonRequestBodyRef(operation.requestBody, command.schemaName)) {
      violations.push(`app_foundation_command_request_body:${operation.operationId}`);
    }
    if (!isJsonResponseRef(operation.responses["200"], command.responseSchemaName)) {
      violations.push(`app_foundation_operation_response_body:${operation.operationId}`);
    }
  }
  const appOperationsById = collectOperationsById(bundle.app);
  const backendOperationsById = collectOperationsById(bundle.backend);
  for (const contract of FOUNDATION_QUERY_PARAMETER_CONTRACTS) {
    const operation = contract.surface === "app"
      ? appOperationsById.get(contract.operationId)
      : backendOperationsById.get(contract.operationId);
    if (!operation) {
      violations.push(`missing_query_parameter_contract:${contract.operationId}`);
      continue;
    }
    for (const parameter of contract.parameters) {
      if (!hasQueryParameter(operation, parameter)) {
        violations.push(`missing_query_parameter:${contract.operationId}:${parameter.name}`);
      }
    }
  }
  for (const contract of FOUNDATION_READ_RESPONSE_CONTRACTS) {
    const operation = contract.surface === "app"
      ? appOperationsById.get(contract.operationId)
      : backendOperationsById.get(contract.operationId);
    if (!operation) {
      violations.push(`missing_operation_response_contract:${contract.operationId}`);
      continue;
    }
    if (!isJsonResponseRef(operation.responses["200"], contract.responseSchemaName)) {
      violations.push(`operation_response_body:${contract.operationId}`);
    }
  }
  for (const [document] of [
    [bundle.app],
    [bundle.backend],
  ] as const) {
    for (const entry of collectOperationEntries(document)) {
      if (!hasJsonResponseRef(entry.operation.responses["200"])) {
        violations.push(`standard_operation_response_body:${entry.operation.operationId}`);
      }
      if (entry.method !== "get" && !hasJsonRequestBodyWithRequestId(entry.operation, document)) {
        violations.push(`standard_command_request_body:${entry.operation.operationId}`);
      }
    }
  }

  return violations;
}

function createOpenApiDocument(surface: SdkworkFileApiSurface): SdkworkFileOpenApiDocument {
  const paths = withQueryParameters(withPathParameters(surface === "app" ? createAppPaths() : createBackendPaths()), surface);
  return {
    components: {
      schemas: createReachableSchemas(paths, createSchemas()),
    },
    info: {
      title: surface === "app" ? "SDKWork File App API" : "SDKWork File Backend API",
      version: SDKWORK_FILE_API_CONTRACT_VERSION,
    },
    openapi: SDKWORK_FILE_STANDARD.api.openapi,
    paths,
    servers: [{ url: surface === "app" ? SDKWORK_FILE_STANDARD.api.appPrefix : SDKWORK_FILE_STANDARD.api.backendPrefix }],
    tags: SDKWORK_FILE_STANDARD.sdkNamespaces.map((name) => ({ name })),
  };
}

function withPathParameters(paths: Record<string, OpenApiPathItem>): Record<string, OpenApiPathItem> {
  return Object.fromEntries(
    Object.entries(paths).map(([path, pathItem]) => [
      path,
      Object.fromEntries(
        Object.entries(pathItem).map(([method, operation]) => [
          method,
          withOperationPathParameters(operation, pathParameterNames(path)),
        ]),
      ) as OpenApiPathItem,
    ]),
  );
}

function withQueryParameters(
  paths: Record<string, OpenApiPathItem>,
  surface: SdkworkFileApiSurface,
): Record<string, OpenApiPathItem> {
  const queryParametersByOperationId = new Map<string, readonly OpenApiParameter[]>(
    FOUNDATION_QUERY_PARAMETER_CONTRACTS
      .filter((contract) => contract.surface === surface)
      .map((contract) => [contract.operationId, contract.parameters]),
  );

  return Object.fromEntries(
    Object.entries(paths).map(([path, pathItem]) => [
      path,
      Object.fromEntries(
        Object.entries(pathItem).map(([method, operation]) => [
          method,
          withOperationQueryParameters(operation, queryParametersByOperationId.get(operation.operationId) ?? []),
        ]),
      ) as OpenApiPathItem,
    ]),
  );
}

function withOperationPathParameters(operation: OpenApiOperation, parameterNames: readonly string[]): OpenApiOperation {
  if (parameterNames.length === 0) {
    return operation;
  }

  const existing = operation.parameters ?? [];
  const existingPathParameterNames = new Set(
    existing.filter((parameter) => parameter.in === "path").map((parameter) => parameter.name),
  );
  const pathParameters = parameterNames
    .filter((parameterName) => !existingPathParameterNames.has(parameterName))
    .map((parameterName) => pathParameter(parameterName));

  return {
    ...operation,
    parameters: [...existing, ...pathParameters],
  };
}

function withOperationQueryParameters(operation: OpenApiOperation, parameters: readonly OpenApiParameter[]): OpenApiOperation {
  if (parameters.length === 0) {
    return operation;
  }

  const existing = operation.parameters ?? [];
  const existingQueryParameterNames = new Set(
    existing.filter((parameter) => parameter.in === "query").map((parameter) => parameter.name),
  );
  const queryParameters = parameters.filter((parameter) => !existingQueryParameterNames.has(parameter.name));

  return {
    ...operation,
    parameters: [...existing, ...queryParameters],
  };
}

function pathParameter(name: string): OpenApiParameter {
  return {
    in: "path",
    name,
    required: true,
    schema: {
      type: "string",
    },
  };
}

function requestIdQueryParameter(): OpenApiParameter {
  return requiredStringQueryParameter("requestId", "Client request id for tracing.");
}

function requiredStringQueryParameter(name: string, description: string): OpenApiParameter {
  return queryParameter(name, true, stringSchema(description));
}

function optionalStringQueryParameter(name: string, description: string): OpenApiParameter {
  return queryParameter(name, false, stringSchema(description));
}

function optionalIntegerQueryParameter(name: string, description: string, minimum: number, maximum: number): OpenApiParameter {
  return queryParameter(name, false, integerSchema(description, minimum, maximum));
}

function requiredEnumQueryParameter(name: string, description: string, values: readonly string[]): OpenApiParameter {
  return queryParameter(name, true, enumStringSchema(description, values));
}

function optionalEnumQueryParameter(name: string, description: string, values: readonly string[]): OpenApiParameter {
  return queryParameter(name, false, enumStringSchema(description, values));
}

function optionalDateTimeQueryParameter(name: string, description: string): OpenApiParameter {
  return queryParameter(name, false, dateTimeSchema(description));
}

function queryParameter(name: string, required: boolean, schema: JsonSchema): OpenApiParameter {
  return {
    in: "query",
    name,
    required,
    schema,
  };
}

function createReachableSchemas(
  paths: Record<string, OpenApiPathItem>,
  schemas: Record<string, JsonSchema>,
): Record<string, JsonSchema> {
  const reachable = new Set<string>();
  const queue = collectSchemaRefs(paths);

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName || reachable.has(schemaName)) {
      continue;
    }

    const schema = schemas[schemaName];
    if (!schema) {
      continue;
    }

    reachable.add(schemaName);
    queue.push(...collectSchemaRefs(schema));
  }

  return Object.fromEntries(
    Object.entries(schemas).filter(([schemaName]) => reachable.has(schemaName)),
  );
}

function collectSchemaRefs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectSchemaRefs(entry));
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const ownRef = typeof record.$ref === "string" && record.$ref.startsWith("#/components/schemas/")
    ? [record.$ref.replace("#/components/schemas/", "")]
    : [];

  return [
    ...ownRef,
    ...Object.values(record).flatMap((entry) => collectSchemaRefs(entry)),
  ];
}

function createAppPaths(): Record<string, OpenApiPathItem> {
  const routes = SDKWORK_FILE_API_ROUTES.app;

  return {
    [routes.files.collection]: {
      get: appOperation("files.list", "files", "List files", "List stable file references visible to the caller.", {
        responseSchemaName: "FileListResponse",
      }),
    },
    [routes.files.get]: {
      get: appOperation("files.retrieve", "files", "Get file", "Read a stable file reference and display metadata.", {
        responseSchemaName: "FileDetailResponse",
      }),
      patch: appOperation("files.update", "files", "Update file", "Update user-editable file metadata.", {
        requestSchemaName: "UpdateFileRequest",
        responseSchemaName: "FileMutationResponse",
      }),
      delete: appOperation("files.delete", "files", "Delete file", "Trash or delete a file according to policy.", {
        requestSchemaName: "DeleteFileRequest",
        responseSchemaName: "DeleteFileResponse",
      }),
    },
    [routes.files.versions]: {
      get: appOperation("files.versions.list", "files", "List file versions", "List file versions visible to the caller.", {
        responseSchemaName: "FileVersionListResponse",
      }),
    },
    [routes.files.issueDownloadUrl]: {
      post: appOperation("files.downloadUrl.create", "files", "Create download URL", "Issue a short-lived download URL after permission checks.", {
        requestSchemaName: "IssueFileAccessUrlRequest",
        responseSchemaName: "FileAccessUrl",
      }),
    },
    [routes.files.issuePreviewUrl]: {
      post: appOperation("files.previewUrl.create", "files", "Create preview URL", "Issue a short-lived preview URL after permission checks.", {
        requestSchemaName: "IssueFileAccessUrlRequest",
        responseSchemaName: "FileAccessUrl",
      }),
    },
    [routes.drive.listSpaces]: {
      get: appOperation("drive.spaces.list", "drive", "List drive spaces", "List drive spaces available to the caller.", {
        responseSchemaName: "DriveSpaceListResponse",
      }),
    },
    [routes.drive.listNodes]: {
      get: appOperation("drive.nodes.list", "drive", "List drive nodes", "List nodes under a drive space parent.", {
        responseSchemaName: "DriveNodeListResponse",
      }),
    },
    [routes.drive.createFolder]: {
      post: appOperation("drive.folders.create", "drive", "Create folder", "Create a folder in a drive space.", {
        requestSchemaName: "CreateDriveFolderRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.updateNode]: {
      patch: appOperation("drive.nodes.update", "drive", "Update drive node", "Rename or update drive node metadata.", {
        requestSchemaName: "UpdateDriveNodeRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.moveNode]: {
      post: appOperation("drive.nodes.move", "drive", "Move drive node", "Move a drive node to another parent.", {
        requestSchemaName: "MoveDriveNodeRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.copyNode]: {
      post: appOperation("drive.nodes.copy", "drive", "Copy drive node", "Copy a drive node according to policy.", {
        requestSchemaName: "CopyDriveNodeRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.trashNode]: {
      post: appOperation("drive.nodes.trash", "drive", "Trash drive node", "Move a drive node to trash.", {
        requestSchemaName: "TrashDriveNodeRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.restoreNode]: {
      post: appOperation("drive.nodes.restore", "drive", "Restore drive node", "Restore a trashed drive node.", {
        requestSchemaName: "RestoreDriveNodeRequest",
        responseSchemaName: "DriveNodeMutationResponse",
      }),
    },
    [routes.drive.changes]: {
      get: appOperation("drive.changes.list", "drive", "List drive changes", "List drive changes using a cursor for synchronization.", {
        responseSchemaName: "DriveChangeListResponse",
      }),
    },
    [routes.fileBindings.collection]: {
      get: appOperation("fileBindings.list", "fileBindings", "List file bindings", "List stable file references bound to a business target.", {
        responseSchemaName: "FileBindingListResponse",
      }),
      post: appOperation("fileBindings.create", "fileBindings", "Create file binding", "Bind a stable file reference to a business target and slot.", {
        requestSchemaName: "CreateFileBindingRequest",
        responseSchemaName: "FileBindingMutationResponse",
      }),
    },
    [routes.fileBindings.item]: {
      patch: appOperation("fileBindings.update", "fileBindings", "Update file binding", "Update binding metadata or ordering.", {
        requestSchemaName: "UpdateFileBindingRequest",
        responseSchemaName: "FileBindingDetailResponse",
      }),
      delete: appOperation("fileBindings.delete", "fileBindings", "Delete file binding", "Remove a file binding from a business target.", {
        requestSchemaName: "DeleteFileBindingRequest",
        responseSchemaName: "DeleteFileBindingResponse",
      }),
    },
    [routes.storage.currentUsage]: {
      get: appOperation("storage.usage.retrieve", "storage", "Get current storage usage", "Read current usage for an authorized scope.", {
        responseSchemaName: "StorageUsageSnapshot",
      }),
    },
    [routes.storage.spaceUsage]: {
      get: appOperation("storage.usage.spaces.list", "storage", "List drive space usage", "List usage by drive space for the caller.", {
        responseSchemaName: "StorageSpaceUsageListResponse",
      }),
    },
    [routes.storage.currentQuota]: {
      get: appOperation("storage.quotas.current.retrieve", "storage", "Get current storage quota", "Read current quota for the caller.", {
        responseSchemaName: "StorageQuota",
      }),
    },
  };
}

function createBackendPaths(): Record<string, OpenApiPathItem> {
  const routes = SDKWORK_FILE_API_ROUTES.backend;

  return {
    [routes.storage.overview]: {
      get: backendOperation("oss.overview.retrieve", "oss", "Get storage overview", "Read storage platform usage, health, failure, and reconciliation overview.", {
        responseSchemaName: "StorageOverview",
      }),
    },
    [routes.storage.providers]: {
      get: backendOperation("oss.providers.list", "oss", "List storage providers", "List configured S3-compatible storage providers.", {
        responseSchemaName: "StorageProviderListResponse",
      }),
      post: backendOperation("oss.providers.create", "oss", "Create storage provider", "Create an S3-compatible storage provider configuration.", {
        requestSchemaName: "CreateStorageProviderRequest",
        responseSchemaName: "StorageProviderMutationResponse",
      }),
    },
    [routes.storage.provider]: {
      patch: backendOperation("oss.providers.update", "oss", "Update storage provider", "Update storage provider governance state.", {
        requestSchemaName: "UpdateStorageProviderRequest",
        responseSchemaName: "StorageProviderMutationResponse",
      }),
    },
    [routes.storage.providerHealthCheck]: {
      post: backendOperation("oss.providers.healthChecks.create", "oss", "Run provider health check", "Run and audit a storage provider health check.", {
        requestSchemaName: "StorageProviderHealthCheckRequest",
        responseSchemaName: "StorageProviderHealthCheckResponse",
      }),
    },
    [routes.storage.buckets]: {
      get: backendOperation("oss.buckets.list", "oss", "List storage buckets", "List logical bucket mappings.", {
        responseSchemaName: "StorageBucketListResponse",
      }),
      post: backendOperation("oss.buckets.create", "oss", "Create storage bucket", "Create a logical bucket mapping.", {
        requestSchemaName: "CreateStorageBucketRequest",
        responseSchemaName: "StorageBucketMutationResponse",
      }),
    },
    [routes.storage.bucket]: {
      patch: backendOperation("oss.buckets.update", "oss", "Update storage bucket", "Update logical bucket governance state.", {
        requestSchemaName: "UpdateStorageBucketRequest",
        responseSchemaName: "StorageBucketMutationResponse",
      }),
    },
    [routes.storage.defaultBuckets]: {
      get: backendOperation("oss.defaultBuckets.list", "oss", "List default storage buckets", "List default logical bucket policies used by upload routing.", {
        responseSchemaName: "StorageDefaultBucketListResponse",
      }),
    },
    [routes.storage.defaultBucket]: {
      patch: backendOperation("oss.defaultBuckets.update", "oss", "Set default storage bucket", "Set the default bucket policy for one logical storage scope. The selected bucket must be an active logical bucket attached to an active storage provider.", {
        requestSchemaName: "SetStorageDefaultBucketRequest",
        responseSchemaName: "StorageDefaultBucketMutationResponse",
      }),
    },
    [routes.storage.quotas]: {
      get: backendOperation("oss.quotas.list", "oss", "List quota policies", "List tenant, organization, user, app, and space quota policies.", {
        responseSchemaName: "StorageQuotaPolicyListResponse",
      }),
      post: backendOperation("oss.quotas.create", "oss", "Create quota policy", "Create a quota policy.", {
        requestSchemaName: "CreateStorageQuotaPolicyRequest",
        responseSchemaName: "StorageQuotaPolicyMutationResponse",
      }),
    },
    [routes.storage.usage]: {
      get: backendOperation("oss.usage.list", "oss", "List storage usage", "List storage usage counters by scope.", {
        responseSchemaName: "StorageUsageCounterListResponse",
      }),
    },
    [routes.storage.usageLedger]: {
      get: backendOperation("oss.usage.ledger.list", "oss", "List usage ledger", "List append-only storage usage ledger events.", {
        responseSchemaName: "StorageUsageLedgerListResponse",
      }),
    },
    [routes.storage.usageSnapshots]: {
      get: backendOperation("oss.usage.snapshots.list", "oss", "List usage snapshots", "List point-in-time storage usage snapshots.", {
        responseSchemaName: "StorageUsageSnapshotListResponse",
      }),
    },
    [routes.storage.reconciliationRuns]: {
      get: backendOperation("oss.reconciliationRuns.list", "oss", "List reconciliation runs", "List storage reconciliation runs.", {
        responseSchemaName: "StorageReconciliationRunListResponse",
      }),
      post: backendOperation("oss.reconciliationRuns.create", "oss", "Create reconciliation run", "Create a storage reconciliation run.", {
        requestSchemaName: "CreateStorageReconciliationRunRequest",
        responseSchemaName: "StorageReconciliationRunMutationResponse",
      }),
    },
    [routes.storage.gcJobs]: {
      post: backendOperation("oss.gcJobs.create", "oss", "Create garbage collection job", "Create a storage garbage collection job.", {
        requestSchemaName: "CreateStorageGarbageCollectionJobRequest",
        responseSchemaName: "StorageGarbageCollectionJobMutationResponse",
      }),
    },
    [routes.files.collection]: {
      get: backendOperation("admin.files.list", "files", "List files", "List files for administration and investigation.", {
        responseSchemaName: "AdminFileListResponse",
      }),
    },
    [routes.files.item]: {
      get: backendOperation("admin.files.retrieve", "files", "Get file", "Read file detail for administration.", {
        responseSchemaName: "AdminFileDetailResponse",
      }),
      delete: backendOperation("admin.files.delete", "files", "Delete file", "Delete or purge a file according to governance policy.", {
        requestSchemaName: "AdminDeleteFileRequest",
        responseSchemaName: "AdminFileMutationResponse",
      }),
    },
    [routes.files.versions]: {
      get: backendOperation("admin.files.versions.list", "files", "List file versions", "List file versions for administration.", {
        responseSchemaName: "FileVersionListResponse",
      }),
    },
    [routes.files.bindings]: {
      get: backendOperation("files.bindings.list", "files", "List file bindings", "List business bindings for a file.", {
        responseSchemaName: "FileBindingListResponse",
      }),
    },
    [routes.files.accessLogs]: {
      get: backendOperation("files.accessLogs.list", "audit", "List file access logs", "List file access logs for investigation.", {
        responseSchemaName: "FileAccessLogListResponse",
      }),
    },
    [routes.files.lock]: {
      post: backendOperation("files.lock", "files", "Lock file", "Lock a file for governance.", {
        requestSchemaName: "LockFileRequest",
        responseSchemaName: "AdminFileMutationResponse",
      }),
    },
    [routes.files.unlock]: {
      post: backendOperation("files.unlock", "files", "Unlock file", "Unlock a file for governance.", {
        requestSchemaName: "UnlockFileRequest",
        responseSchemaName: "AdminFileMutationResponse",
      }),
    },
    [routes.files.restore]: {
      post: backendOperation("files.restore", "files", "Restore file", "Restore a file from trash or purge pending state.", {
        requestSchemaName: "RestoreFileRequest",
        responseSchemaName: "AdminFileMutationResponse",
      }),
    },
    [routes.drive.spaces]: {
      get: backendOperation("admin.drive.spaces.list", "drive", "List drive spaces", "List drive spaces across administrative scope.", {
        responseSchemaName: "DriveSpaceListResponse",
      }),
    },
    [routes.drive.spaceNodes]: {
      get: backendOperation("admin.drive.nodes.list", "drive", "List drive nodes", "List drive nodes in a space.", {
        responseSchemaName: "DriveNodeListResponse",
      }),
    },
    [routes.drive.nodePermissions]: {
      get: backendOperation("drive.permissions.retrieve", "drive", "Get drive permissions", "Inspect effective and explicit drive permissions.", {
        responseSchemaName: "DrivePermissionResponse",
      }),
      patch: backendOperation("drive.permissions.update", "drive", "Update drive permissions", "Update drive node permissions.", {
        requestSchemaName: "UpdateDrivePermissionRequest",
        responseSchemaName: "DrivePermissionResponse",
      }),
    },
    [routes.drive.shareLinks]: {
      get: backendOperation("drive.shareLinks.list", "drive", "List share links", "List drive share links.", {
        responseSchemaName: "DriveShareLinkListResponse",
      }),
    },
    [routes.drive.shareLink]: {
      patch: backendOperation("drive.shareLinks.update", "drive", "Update share link", "Update a drive share link policy.", {
        requestSchemaName: "UpdateDriveShareLinkRequest",
        responseSchemaName: "DriveShareLinkMutationResponse",
      }),
    },
    [routes.drive.shareLinkRevoke]: {
      post: backendOperation("drive.shareLinks.revoke", "drive", "Revoke share link", "Revoke a drive share link.", {
        requestSchemaName: "RevokeDriveShareLinkRequest",
        responseSchemaName: "DriveShareLinkMutationResponse",
      }),
    },
    [routes.fileSlots.collection]: {
      get: backendOperation("fileSlots.list", "fileSlots", "List file slots", "List business file slot definitions.", {
        responseSchemaName: "FileSlotDefinitionListResponse",
      }),
      post: backendOperation("fileSlots.create", "fileSlots", "Create file slot", "Create a business file slot definition.", {
        requestSchemaName: "CreateFileSlotDefinitionRequest",
        responseSchemaName: "FileSlotDefinitionMutationResponse",
      }),
    },
    [routes.fileSlots.item]: {
      patch: backendOperation("fileSlots.update", "fileSlots", "Update file slot", "Update a business file slot definition.", {
        requestSchemaName: "UpdateFileSlotDefinitionRequest",
        responseSchemaName: "FileSlotDefinitionMutationResponse",
      }),
    },
    [routes.security.scans]: {
      get: backendOperation("security.scans.list", "security", "List security scans", "List file security scan results.", {
        responseSchemaName: "SecurityScanListResponse",
      }),
    },
    [routes.security.retryScan]: {
      post: backendOperation("security.scans.retry", "security", "Retry security scan", "Retry a file security scan.", {
        requestSchemaName: "RetrySecurityScanRequest",
        responseSchemaName: "SecurityScanMutationResponse",
      }),
    },
    [routes.security.dlpResults]: {
      get: backendOperation("security.dlpResults.list", "security", "List DLP results", "List file DLP findings.", {
        responseSchemaName: "DlpResultListResponse",
      }),
    },
    [routes.security.auditLogs]: {
      get: backendOperation("audit.fileEvents.list", "audit", "List file audit logs", "List file platform audit logs.", {
        responseSchemaName: "FileAuditLogListResponse",
      }),
    },
  };
}

interface OperationSchemaOptions {
  requestSchemaName?: string;
  responseSchemaName?: string;
}

function appOperation(
  operationId: string,
  tag: string,
  summary: string,
  description: string,
  schemaOptions: OperationSchemaOptions | string = {},
): OpenApiOperation {
  const options = typeof schemaOptions === "string" ? { requestSchemaName: schemaOptions } : schemaOptions;
  const operation: OpenApiOperation = {
    description,
    operationId,
    responses: standardResponses(options.responseSchemaName),
    summary,
    tags: [tag],
  };
  return options.requestSchemaName ? withJsonRequestBody(operation, options.requestSchemaName) : operation;
}

function backendOperation(
  operationId: string,
  tag: string,
  summary: string,
  description: string,
  schemaOptions: OperationSchemaOptions | string = {},
): OpenApiOperation {
  const options = typeof schemaOptions === "string" ? { requestSchemaName: schemaOptions } : schemaOptions;
  const operation: OpenApiOperation = {
    ...appOperation(operationId, tag, summary, description, options),
    "x-sdkwork-admin-rbac": {
      audit: true,
      permission: operationId,
      scope: "file-platform-admin",
    },
  };
  return operation;
}

function standardResponses(responseSchemaName?: string): Record<string, unknown> {
  return {
    "200": responseSchemaName ? jsonResponse(responseSchemaName) : {
      description: "Request completed.",
    },
    "400": {
      description: "Request validation failed.",
    },
    "401": {
      description: "Authentication is required.",
    },
    "403": {
      description: "Permission denied.",
    },
  };
}

function createSchemas(): Record<string, JsonSchema> {
  return {
    AdminDeleteFileRequest: objectSchema(["requestId"], {
      deleteMode: stringSchema("Delete mode, such as trash, purge pending, or purge when policy allows it."),
      dryRun: booleanSchema("Whether to validate the delete without applying it."),
      reason: stringSchema("Operator-provided governance reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    AdminFileDetailResponse: objectSchema(["file", "requestId"], {
      file: refSchema("AdminFileRecord"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    AdminFileListResponse: listResponseSchema("AdminFileRecord"),
    AdminFileMutationResponse: objectSchema(["file", "requestId"], {
      file: refSchema("AdminFileRecord"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    AdminFileRecord: objectSchema(["fileId", "name", "status", "visibility"], {
      appId: stringSchema("Owning app id when applicable."),
      businessDomain: stringSchema("Business domain when the file is slot-bound."),
      fileId: stringSchema("Stable file id."),
      mimeType: stringSchema("File MIME type."),
      name: stringSchema("File display name."),
      organizationId: stringSchema("Owning organization id."),
      ownerUserId: stringSchema("Owning user id."),
      sizeBytes: integerSchema("Logical file size in bytes.", 0),
      status: stringSchema("File lifecycle status."),
      visibility: enumStringSchema("File visibility.", SDKWORK_FILE_VISIBILITIES),
    }),
    CopyDriveNodeRequest: objectSchema(["idempotencyKey", "requestId"], {
      idempotencyKey: stringSchema("Idempotency key for drive node copy."),
      name: stringSchema("Optional copied node display name."),
      requestId: stringSchema("Client request id for tracing."),
      targetParentNodeId: stringSchema("Target parent drive node id."),
      targetSpaceId: stringSchema("Target drive space id when copying across spaces."),
    }),
    CreateDriveFolderRequest: objectSchema(["idempotencyKey", "name", "requestId"], {
      idempotencyKey: stringSchema("Idempotency key for drive folder creation."),
      name: stringSchema("Folder display name."),
      parentNodeId: stringSchema("Parent drive node id. Omit for root."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    CreateFileBindingRequest: objectSchema(["fileId", "purpose", "requestId", "target"], {
      fileId: stringSchema("Stable file id to bind."),
      purpose: stringSchema("File slot code."),
      requestId: stringSchema("Client request id for tracing."),
      target: refSchema("FileUploadTarget"),
      versionId: stringSchema("Optional stable file version id."),
    }),
    CreateFileSlotDefinitionRequest: objectSchema(["appId", "businessDomain", "displayName", "idempotencyKey", "requestId", "slotCode"], {
      appId: stringSchema("Owning app id."),
      businessDomain: stringSchema("Business domain served by the slot."),
      displayName: stringSchema("Operator-facing slot display name."),
      idempotencyKey: stringSchema("Idempotency key for slot creation."),
      maxFileBytes: integerSchema("Maximum single-file size.", 0),
      requestId: stringSchema("Client request id for tracing."),
      slotCode: stringSchema("Canonical slot code."),
    }),
    CreateStorageBucketRequest: objectSchema(["bucketName", "idempotencyKey", "logicalScope", "providerId", "requestId"], {
      bucketName: stringSchema("Physical provider bucket name controlled by the storage administrator."),
      bucketRegion: stringSchema("Physical provider bucket region when it differs from the provider region."),
      dataResidencyRegion: stringSchema("Required data residency region for this logical bucket mapping."),
      defaultEncryptionMode: enumStringSchema("Default server-side encryption mode for new objects in this logical bucket.", SDKWORK_STORAGE_ENCRYPTION_MODES),
      defaultStorageClass: enumStringSchema("Default S3 storage class for new objects in this logical bucket.", SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES),
      idempotencyKey: stringSchema("Idempotency key for storage bucket configuration creation."),
      kmsKeyRef: stringSchema("Reference to the key-management key used when SSE-KMS is selected."),
      lifecycleEnabled: booleanSchema("Whether lifecycle policies are enabled for this logical bucket."),
      logicalScope: enumStringSchema("Logical storage scope served by this bucket mapping.", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      objectKeyPrefix: stringSchema("Provider object-key prefix reserved for this logical bucket."),
      objectLockEnabled: booleanSchema("Whether object-lock governance is enabled for this logical bucket."),
      providerId: stringSchema("Stable storage provider id."),
      publicAccessBlocked: booleanSchema("Whether public object access must be blocked for this bucket."),
      requestId: stringSchema("Client request id for tracing."),
      versioningEnabled: booleanSchema("Whether object versioning is enabled for this logical bucket."),
    }),
    CreateStorageProviderRequest: objectSchema(["credentialRef", "idempotencyKey", "providerCode", "providerType", "requestId"], {
      credentialRef: stringSchema("Reference to the secret-managed provider credential, never the credential value itself."),
      endpointUrl: stringSchema("S3-compatible endpoint URL when the provider requires an explicit endpoint."),
      idempotencyKey: stringSchema("Idempotency key for storage provider configuration creation."),
      pathStyleEnabled: booleanSchema("Whether S3 path-style addressing is required for this provider."),
      providerCode: stringSchema("Stable operator-defined storage provider code."),
      providerType: enumStringSchema("S3-compatible storage provider type.", SDKWORK_STORAGE_PROVIDER_TYPES),
      region: stringSchema("Provider region or deployment locality."),
      requestId: stringSchema("Client request id for tracing."),
      supportsLifecycle: booleanSchema("Whether the provider supports bucket lifecycle management."),
      supportsMultipart: booleanSchema("Whether the provider supports multipart upload."),
      supportsObjectLock: booleanSchema("Whether the provider supports object-lock governance."),
    }),
    UpdateStorageBucketRequest: objectSchema(["reason", "requestId", "status"], {
      reason: stringSchema("Operator-provided reason for changing bucket governance status."),
      requestId: stringSchema("Client request id for tracing."),
      status: enumStringSchema("Next bucket governance status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
    }),
    UpdateStorageProviderRequest: objectSchema(["reason", "requestId", "status"], {
      reason: stringSchema("Operator-provided reason for changing provider governance status."),
      requestId: stringSchema("Client request id for tracing."),
      status: enumStringSchema("Next provider governance status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
    }),
    SetStorageDefaultBucketRequest: objectSchema(["bucketId", "reason", "requestId"], {
      bucketId: stringSchema("Stable active logical bucket mapping id to use as the default for the route logical scope."),
      reason: stringSchema("Operator-provided reason for changing the default storage bucket policy."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    CreateStorageQuotaPolicyRequest: objectSchema(["idempotencyKey", "quotaLimitBytes", "requestId", "scopeId", "scopeType"], {
      idempotencyKey: stringSchema("Idempotency key for storage quota policy creation."),
      quotaLimitBytes: integerSchema("Total quota limit in bytes.", 0),
      requestId: stringSchema("Client request id for tracing."),
      scopeId: stringSchema("Quota scope id."),
      scopeType: enumStringSchema("Quota scope type.", STORAGE_QUOTA_POLICY_SCOPE_TYPES),
      singleFileLimitBytes: integerSchema("Optional single-file upload limit in bytes.", 0),
    }),
    DeleteFileBindingRequest: objectSchema(["bindingId", "requestId"], {
      bindingId: stringSchema("Stable file binding id to remove."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    DeleteFileBindingResponse: objectSchema(["bindingId", "requestId"], {
      bindingId: stringSchema("Removed file binding id."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    CreateStorageGarbageCollectionJobRequest: objectSchema(["dryRun", "idempotencyKey", "jobType", "requestId"], {
      criteria: refSchema("StorageGarbageCollectionCriteria"),
      dryRun: booleanSchema("Whether the job should report candidates without deleting objects."),
      idempotencyKey: stringSchema("Idempotency key for garbage-collection job creation."),
      jobType: stringSchema("Garbage-collection job type."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    CreateStorageReconciliationRunRequest: objectSchema(["dryRun", "idempotencyKey", "requestId", "runType"], {
      bucketId: stringSchema("Optional bucket id to scope reconciliation."),
      dryRun: booleanSchema("Whether the reconciliation should report findings without mutating records."),
      idempotencyKey: stringSchema("Idempotency key for storage reconciliation run creation."),
      providerId: stringSchema("Optional provider id to scope reconciliation."),
      requestId: stringSchema("Client request id for tracing."),
      runType: stringSchema("Storage reconciliation run type."),
    }),
    DeleteFileRequest: objectSchema(["requestId"], {
      deleteMode: stringSchema("Delete mode, such as trash or purge when policy allows it."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    DeleteFileResponse: objectSchema(["fileId", "requestId", "status"], {
      fileId: stringSchema("Stable file id."),
      requestId: stringSchema("Client request id for tracing."),
      status: stringSchema("File status after delete request."),
    }),
    DriveNode: objectSchema(["depth", "name", "nodeId", "nodeType", "pathSegment", "spaceId", "trashed"], {
      depth: integerSchema("Node depth.", 0),
      fileId: stringSchema("Stable file id for file nodes."),
      mimeType: stringSchema("Display MIME type."),
      name: stringSchema("Node display name."),
      nodeId: stringSchema("Stable drive node id."),
      nodeType: enumStringSchema("Drive node type.", SDKWORK_DRIVE_NODE_TYPES),
      parentNodeId: stringSchema("Parent node id."),
      pathSegment: stringSchema("Normalized path segment."),
      sizeBytes: integerSchema("Display file size in bytes.", 0),
      spaceId: stringSchema("Drive space id."),
      trashed: booleanSchema("Whether the node is in trash."),
      updatedAt: dateTimeSchema("Last update time."),
    }),
    DriveChange: objectSchema(["changeId", "eventType", "resourceId", "resourceType", "sequenceNo", "spaceId"], {
      changeId: stringSchema("Stable drive change id."),
      eventType: stringSchema("Drive change event type."),
      occurredAt: dateTimeSchema("Change occurrence time."),
      resourceId: stringSchema("Changed resource id."),
      resourceType: stringSchema("Changed resource type."),
      sequenceNo: integerSchema("Monotonic sequence number within the drive space.", 0),
      spaceId: stringSchema("Drive space id."),
    }),
    DriveChangeListResponse: listResponseSchema("DriveChange"),
    DriveNodeListResponse: listResponseSchema("DriveNode"),
    DriveNodeMutationResponse: objectSchema(["node", "requestId"], {
      node: refSchema("DriveNode"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    DriveSpace: objectSchema(["name", "spaceId", "status", "type"], {
      appId: stringSchema("Owning app id for app drive spaces."),
      name: stringSchema("Drive space display name."),
      organizationId: stringSchema("Owning organization id."),
      ownerUserId: stringSchema("Owning user id."),
      rootNodeId: stringSchema("Root node id."),
      spaceId: stringSchema("Stable drive space id."),
      status: enumStringSchema("Drive space status.", SDKWORK_DRIVE_SPACE_STATUSES),
      type: enumStringSchema("Drive space type.", SDKWORK_DRIVE_SPACE_TYPES),
    }),
    DriveSpaceListResponse: listResponseSchema("DriveSpace", { paginated: false }),
    DrivePermissionEntry: objectSchema(["principalId", "principalType", "role"], {
      effect: stringSchema("Permission effect."),
      expiresAt: dateTimeSchema("Permission expiration time."),
      principalId: stringSchema("Principal id."),
      principalType: stringSchema("Principal type."),
      role: stringSchema("Drive role."),
    }),
    DrivePermissionResponse: objectSchema(["entries", "requestId"], {
      entries: {
        items: refSchema("DrivePermissionEntry"),
        type: "array",
      },
      requestId: stringSchema("Client request id for tracing."),
    }),
    DriveShareLink: objectSchema(["resourceId", "resourceType", "role", "shareLinkId", "status"], {
      allowDownload: booleanSchema("Whether download is allowed."),
      expiresAt: dateTimeSchema("Share link expiration time."),
      resourceId: stringSchema("Shared resource id."),
      resourceType: stringSchema("Shared resource type."),
      role: stringSchema("Share link role."),
      shareLinkId: stringSchema("Stable share link id."),
      status: stringSchema("Share link status."),
    }),
    DriveShareLinkListResponse: listResponseSchema("DriveShareLink"),
    DriveShareLinkMutationResponse: objectSchema(["requestId", "shareLink"], {
      requestId: stringSchema("Client request id for tracing."),
      shareLink: refSchema("DriveShareLink"),
    }),
    DlpResult: objectSchema(["fileId", "resultId", "severity", "status"], {
      fileId: stringSchema("Stable file id."),
      resultId: stringSchema("Stable DLP result id."),
      severity: stringSchema("DLP finding severity."),
      status: stringSchema("DLP result status."),
    }),
    DlpResultListResponse: listResponseSchema("DlpResult"),
    FileAccessUrl: objectSchema(["expiresAt", "requestId", "url"], {
      expiresAt: dateTimeSchema("Short-lived URL expiration time."),
      requestId: stringSchema("Request id."),
      url: stringSchema("Short-lived access URL returned only for immediate download or preview."),
    }),
    FileAccessLog: objectSchema(["accessLogId", "eventType", "fileId", "occurredAt"], {
      accessLogId: stringSchema("Stable access log id."),
      actorId: stringSchema("Actor id."),
      eventType: stringSchema("Access event type."),
      fileId: stringSchema("Stable file id."),
      occurredAt: dateTimeSchema("Access event time."),
    }),
    FileAccessLogListResponse: listResponseSchema("FileAccessLog"),
    FileAuditLog: objectSchema(["auditLogId", "eventType", "occurredAt", "resourceId", "resourceType"], {
      actorId: stringSchema("Actor id."),
      auditLogId: stringSchema("Stable audit log id."),
      eventType: stringSchema("Audit event type."),
      occurredAt: dateTimeSchema("Audit event time."),
      resourceId: stringSchema("Audited resource id."),
      resourceType: stringSchema("Audited resource type."),
    }),
    FileAuditLogListResponse: listResponseSchema("FileAuditLog"),
    FileBinding: objectSchema(["fileId", "purpose", "target", "visibility"], {
      bindingId: stringSchema("Stable binding id."),
      displayName: stringSchema("Display name."),
      fileId: stringSchema("Stable file id."),
      purpose: stringSchema("File slot code."),
      target: refSchema("FileUploadTarget"),
      versionId: stringSchema("Stable version id."),
      visibility: enumStringSchema("File visibility.", SDKWORK_FILE_VISIBILITIES),
    }),
    FileBindingDetailResponse: objectSchema(["binding", "requestId"], {
      binding: refSchema("FileBinding"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    FileBindingListResponse: listResponseSchema("FileRef", { paginated: false }),
    FileBindingMutationResponse: objectSchema(["fileRef", "requestId"], {
      fileRef: refSchema("FileRef"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    FileChecksum: objectSchema(["algorithm", "value"], {
      algorithm: stringSchema("Checksum algorithm."),
      value: stringSchema("Checksum value."),
    }),
    FileRef: objectSchema(["fileId", "purpose", "visibility"], {
      bindingId: stringSchema("Stable business binding id."),
      displayName: stringSchema("Display name."),
      fileId: stringSchema("Stable file id."),
      purpose: stringSchema("File slot code."),
      versionId: stringSchema("Stable file version id."),
      visibility: enumStringSchema("File visibility.", SDKWORK_FILE_VISIBILITIES),
    }),
    FileDetailResponse: objectSchema(["fileRef", "requestId"], {
      fileRef: refSchema("FileRef"),
      requestId: stringSchema("Request id."),
    }),
    FileListResponse: listResponseSchema("FileRef"),
    FileMutationResponse: objectSchema(["fileRef", "requestId"], {
      fileRef: refSchema("FileRef"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    FileSlotDefinition: objectSchema(["appId", "businessDomain", "displayName", "slotCode", "status"], {
      appId: stringSchema("Owning app id."),
      businessDomain: stringSchema("Business domain served by the slot."),
      displayName: stringSchema("Operator-facing slot display name."),
      maxFileBytes: integerSchema("Maximum single-file size.", 0),
      slotCode: stringSchema("Canonical slot code."),
      status: enumStringSchema("Slot status.", SDKWORK_FILE_SLOT_STATUSES),
    }),
    FileSlotDefinitionListResponse: listResponseSchema("FileSlotDefinition"),
    FileSlotDefinitionMutationResponse: objectSchema(["requestId", "slot"], {
      requestId: stringSchema("Client request id for tracing."),
      slot: refSchema("FileSlotDefinition"),
    }),
    FileUploadTarget: objectSchema(["id", "type"], {
      id: stringSchema("Business target id."),
      type: stringSchema("Business target type."),
    }),
    FileVersionListResponse: listResponseSchema("FileVersionRef"),
    FileVersionRef: objectSchema(["fileId", "sizeBytes", "status", "versionId", "versionNo"], {
      createdAt: dateTimeSchema("Version creation time."),
      fileId: stringSchema("Stable file id."),
      sizeBytes: integerSchema("Version logical size in bytes.", 0),
      status: stringSchema("File version status."),
      versionId: stringSchema("Stable file version id."),
      versionNo: integerSchema("Monotonic version number.", 1),
    }),
    IssueFileAccessUrlRequest: objectSchema(["fileId", "requestId"], {
      fileId: stringSchema("Stable file id."),
      requestId: stringSchema("Client request id for tracing."),
      versionId: stringSchema("Optional stable file version id."),
    }),
    LockFileRequest: objectSchema(["reason", "requestId"], {
      reason: stringSchema("Operator-provided lock reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    MoveDriveNodeRequest: objectSchema(["requestId", "targetParentNodeId"], {
      requestId: stringSchema("Client request id for tracing."),
      targetParentNodeId: stringSchema("Target parent drive node id."),
      targetSpaceId: stringSchema("Target drive space id when moving across spaces."),
    }),
    RestoreDriveNodeRequest: objectSchema(["requestId"], {
      requestId: stringSchema("Client request id for tracing."),
    }),
    RestoreFileRequest: objectSchema(["requestId"], {
      reason: stringSchema("Operator-provided restore reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    RetrySecurityScanRequest: objectSchema(["requestId"], {
      reason: stringSchema("Operator-provided retry reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    RevokeDriveShareLinkRequest: objectSchema(["requestId"], {
      reason: stringSchema("Operator-provided revocation reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    SecurityScan: objectSchema(["fileId", "scanId", "scanType", "status"], {
      completedAt: dateTimeSchema("Scan completion time."),
      fileId: stringSchema("Stable file id."),
      scanId: stringSchema("Stable scan id."),
      scanType: stringSchema("Security scan type."),
      status: stringSchema("Security scan status."),
    }),
    SecurityScanListResponse: listResponseSchema("SecurityScan"),
    SecurityScanMutationResponse: objectSchema(["requestId", "scan"], {
      requestId: stringSchema("Client request id for tracing."),
      scan: refSchema("SecurityScan"),
    }),
    StorageQuota: objectSchema(["quotaLimitBytes", "requestId", "scopeId", "scopeType", "usedBillableBytes"], {
      quotaLimitBytes: integerSchema("Total quota limit in bytes.", 0),
      requestId: stringSchema("Request id."),
      scopeId: stringSchema("Quota scope id."),
      scopeType: enumStringSchema("Quota scope type.", STORAGE_QUOTA_POLICY_SCOPE_TYPES),
      singleFileLimitBytes: integerSchema("Optional single-file upload limit in bytes.", 0),
      usedBillableBytes: integerSchema("Current billable bytes used by the scope.", 0),
    }),
    StorageSpaceUsageListResponse: listResponseSchema("StorageUsageSnapshot"),
    StorageUsageSnapshot: objectSchema(["fileCount", "objectCount", "requestId", "retainedBytes", "scopeId", "scopeType", "trashBytes", "usedBillableBytes", "usedLogicalBytes", "usedPhysicalBytes", "variantBytes", "versionCount"], {
      fileCount: integerSchema("Number of files.", 0),
      objectCount: integerSchema("Number of objects.", 0),
      quotaLimitBytes: integerSchema("Quota limit in bytes.", 0),
      requestId: stringSchema("Request id."),
      retainedBytes: integerSchema("Retained bytes.", 0),
      scopeId: stringSchema("Usage scope id."),
      scopeType: enumStringSchema("Usage scope type.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      trashBytes: integerSchema("Trash bytes.", 0),
      usedBillableBytes: integerSchema("Billable bytes.", 0),
      usedLogicalBytes: integerSchema("Logical bytes.", 0),
      usedPhysicalBytes: integerSchema("Physical bytes.", 0),
      variantBytes: integerSchema("Variant bytes.", 0),
      versionCount: integerSchema("Number of versions.", 0),
    }),
    StorageBucketConfig: objectSchema(["bucketId", "bucketName", "logicalScope", "providerId", "status"], {
      bucketId: stringSchema("Stable logical bucket mapping id."),
      bucketName: stringSchema("Physical provider bucket name visible only to storage administrators."),
      bucketRegion: stringSchema("Physical provider bucket region when it differs from the provider region."),
      dataResidencyRegion: stringSchema("Data residency region for this logical bucket mapping."),
      defaultEncryptionMode: enumStringSchema("Default server-side encryption mode for new objects in this logical bucket.", SDKWORK_STORAGE_ENCRYPTION_MODES),
      defaultStorageClass: enumStringSchema("Default S3 storage class for new objects in this logical bucket.", SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES),
      kmsKeyRef: stringSchema("Reference to the key-management key used when SSE-KMS is selected."),
      lifecycleEnabled: booleanSchema("Whether lifecycle policies are enabled for this logical bucket."),
      logicalScope: enumStringSchema("Logical storage scope served by this bucket mapping.", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      objectKeyPrefix: stringSchema("Provider object-key prefix reserved for this logical bucket."),
      objectLockEnabled: booleanSchema("Whether object-lock governance is enabled for this logical bucket."),
      providerId: stringSchema("Stable storage provider id."),
      publicAccessBlocked: booleanSchema("Whether public object access must be blocked for this bucket."),
      status: enumStringSchema("Bucket mapping status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
      versioningEnabled: booleanSchema("Whether object versioning is enabled for this logical bucket."),
    }),
    StorageBucketListResponse: listResponseSchema("StorageBucketConfig"),
    StorageBucketMutationResponse: objectSchema(["bucket", "requestId"], {
      bucket: refSchema("StorageBucketConfig"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageDefaultBucketConfig: objectSchema(["bucketId", "bucketName", "logicalScope", "providerCode", "providerId", "providerType", "status"], {
      bucketId: stringSchema("Stable logical bucket mapping id selected as default for the logical scope."),
      bucketName: stringSchema("Physical provider bucket name visible only to storage administrators."),
      dataResidencyRegion: stringSchema("Data residency region for this logical bucket mapping."),
      logicalScope: enumStringSchema("Logical storage scope served by this default bucket policy.", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      providerCode: stringSchema("Stable operator-defined storage provider code."),
      providerId: stringSchema("Stable storage provider id resolved from the selected bucket."),
      providerType: enumStringSchema("S3-compatible storage provider type.", SDKWORK_STORAGE_PROVIDER_TYPES),
      status: enumStringSchema("Default bucket policy status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
      updatedAt: dateTimeSchema("Last default policy update time."),
    }),
    StorageDefaultBucketListResponse: listResponseSchema("StorageDefaultBucketConfig", { paginated: false }),
    StorageDefaultBucketMutationResponse: objectSchema(["defaultBucket", "requestId"], {
      defaultBucket: refSchema("StorageDefaultBucketConfig"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageOverview: objectSchema(["providerCount", "requestId", "totalBillableBytes", "totalLogicalBytes"], {
      failedUploadCount: integerSchema("Number of failed uploads in the observed window.", 0),
      providerCount: integerSchema("Configured storage provider count.", 0),
      requestId: stringSchema("Client request id for tracing."),
      totalBillableBytes: integerSchema("Total billable bytes.", 0),
      totalLogicalBytes: integerSchema("Total logical bytes.", 0),
    }),
    StorageGarbageCollectionJob: objectSchema(["dryRun", "jobId", "jobType", "status"], {
      completedAt: dateTimeSchema("Completion time when the job is finished."),
      createdAt: dateTimeSchema("Creation time."),
      dryRun: booleanSchema("Whether the job reports candidates without deleting objects."),
      jobId: stringSchema("Stable garbage-collection job id."),
      jobType: stringSchema("Garbage-collection job type."),
      status: enumStringSchema("Garbage-collection job status.", SDKWORK_STORAGE_JOB_STATUSES),
    }),
    StorageGarbageCollectionCriteria: objectSchema([], {
      bucketId: stringSchema("Optional bucket id that limits garbage-collection candidates."),
      maxObjects: integerSchema("Maximum number of objects to inspect or delete in this job.", 1),
      objectStatus: stringSchema("Object lifecycle status filter for garbage-collection candidates."),
      olderThan: dateTimeSchema("Only select candidates older than this timestamp."),
      providerId: stringSchema("Optional provider id that limits garbage-collection candidates."),
      reasonCode: stringSchema("Standardized reason code for the garbage-collection selection policy."),
    }),
    StorageGarbageCollectionJobMutationResponse: objectSchema(["job", "requestId"], {
      job: refSchema("StorageGarbageCollectionJob"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageProviderConfig: objectSchema(["providerCode", "providerId", "providerType", "status"], {
      credentialRef: stringSchema("Reference to secret-managed provider credential, never the credential value itself."),
      endpointUrl: stringSchema("S3-compatible endpoint URL when the provider requires an explicit endpoint."),
      pathStyleEnabled: booleanSchema("Whether S3 path-style addressing is required for this provider."),
      providerCode: stringSchema("Stable operator-defined storage provider code."),
      providerId: stringSchema("Stable storage provider id."),
      providerType: enumStringSchema("S3-compatible storage provider type.", SDKWORK_STORAGE_PROVIDER_TYPES),
      region: stringSchema("Provider region or deployment locality."),
      status: enumStringSchema("Provider configuration status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
      supportsLifecycle: booleanSchema("Whether the provider supports bucket lifecycle management."),
      supportsMultipart: booleanSchema("Whether the provider supports multipart upload."),
      supportsObjectLock: booleanSchema("Whether the provider supports object-lock governance."),
    }),
    StorageProviderHealthCheckRequest: objectSchema(["requestId"], {
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageProviderHealthCheckResponse: objectSchema(["healthy", "providerId", "requestId", "status"], {
      checkedAt: dateTimeSchema("Health check time."),
      healthy: booleanSchema("Whether the provider is currently healthy."),
      providerId: stringSchema("Stable storage provider id."),
      requestId: stringSchema("Client request id for tracing."),
      status: stringSchema("Provider health status."),
    }),
    StorageProviderListResponse: listResponseSchema("StorageProviderConfig", { paginated: false }),
    StorageProviderMutationResponse: objectSchema(["provider", "requestId"], {
      provider: refSchema("StorageProviderConfig"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageQuotaPolicy: objectSchema(["quotaLimitBytes", "quotaPolicyId", "scopeId", "scopeType", "status"], {
      quotaLimitBytes: integerSchema("Total quota limit in bytes.", 0),
      quotaPolicyId: stringSchema("Stable quota policy id."),
      scopeId: stringSchema("Quota scope id."),
      scopeType: enumStringSchema("Quota scope type.", STORAGE_QUOTA_POLICY_SCOPE_TYPES),
      singleFileLimitBytes: integerSchema("Optional single-file upload limit in bytes.", 0),
      status: enumStringSchema("Quota policy status.", SDKWORK_STORAGE_RESOURCE_STATUSES),
    }),
    StorageQuotaPolicyListResponse: listResponseSchema("StorageQuotaPolicy", { paginated: false }),
    StorageQuotaPolicyMutationResponse: objectSchema(["quotaPolicy", "requestId"], {
      quotaPolicy: refSchema("StorageQuotaPolicy"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageReconciliationRun: objectSchema(["dryRun", "runId", "runType", "status"], {
      bucketId: stringSchema("Optional bucket id scoped by the reconciliation run."),
      completedAt: dateTimeSchema("Completion time when the run is finished."),
      dryRun: booleanSchema("Whether the run reports findings without mutating records."),
      providerId: stringSchema("Optional provider id scoped by the reconciliation run."),
      runId: stringSchema("Stable reconciliation run id."),
      runType: stringSchema("Storage reconciliation run type."),
      startedAt: dateTimeSchema("Run start time."),
      status: enumStringSchema("Storage reconciliation run status.", SDKWORK_STORAGE_JOB_STATUSES),
    }),
    StorageReconciliationRunListResponse: listResponseSchema("StorageReconciliationRun"),
    StorageReconciliationRunMutationResponse: objectSchema(["reconciliationRun", "requestId"], {
      reconciliationRun: refSchema("StorageReconciliationRun"),
      requestId: stringSchema("Client request id for tracing."),
    }),
    StorageUsageCounter: objectSchema(["scopeId", "scopeType", "usedBillableBytes", "usedLogicalBytes", "usedPhysicalBytes"], {
      fileCount: integerSchema("Number of files.", 0),
      objectCount: integerSchema("Number of objects.", 0),
      retainedBytes: integerSchema("Retained bytes.", 0),
      scopeId: stringSchema("Usage scope id."),
      scopeType: enumStringSchema("Usage scope type.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      trashBytes: integerSchema("Trash bytes.", 0),
      usedBillableBytes: integerSchema("Billable bytes.", 0),
      usedLogicalBytes: integerSchema("Logical bytes.", 0),
      usedPhysicalBytes: integerSchema("Physical bytes.", 0),
      variantBytes: integerSchema("Variant bytes.", 0),
      versionCount: integerSchema("Number of versions.", 0),
    }),
    StorageUsageCounterListResponse: listResponseSchema("StorageUsageCounter"),
    StorageUsageLedgerEvent: objectSchema(["deltaBillableBytes", "deltaLogicalBytes", "eventId", "idempotencyKey", "occurredAt", "scopeId", "scopeType"], {
      deltaBillableBytes: integerSchema("Billable byte delta.", -Number.MAX_SAFE_INTEGER),
      deltaLogicalBytes: integerSchema("Logical byte delta.", -Number.MAX_SAFE_INTEGER),
      eventId: stringSchema("Stable usage ledger event id."),
      fileId: stringSchema("Stable file id associated with this event when applicable."),
      idempotencyKey: stringSchema("Idempotency key that protects usage accounting from double application."),
      occurredAt: dateTimeSchema("Ledger event occurrence time."),
      scopeId: stringSchema("Usage scope id."),
      scopeType: enumStringSchema("Usage scope type.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
    }),
    StorageUsageLedgerListResponse: listResponseSchema("StorageUsageLedgerEvent"),
    StorageUsageSnapshotListResponse: listResponseSchema("StorageUsageSnapshotRecord"),
    StorageUsageSnapshotRecord: objectSchema(["fileCount", "objectCount", "periodStartAt", "scopeId", "scopeType", "snapshotType", "usedBillableBytes", "usedLogicalBytes", "usedPhysicalBytes"], {
      fileCount: integerSchema("Number of files.", 0),
      objectCount: integerSchema("Number of objects.", 0),
      periodEndAt: dateTimeSchema("Snapshot period end."),
      periodStartAt: dateTimeSchema("Snapshot period start."),
      quotaLimitBytes: integerSchema("Quota limit in bytes.", 0),
      retainedBytes: integerSchema("Retained bytes.", 0),
      scopeId: stringSchema("Usage scope id."),
      scopeType: enumStringSchema("Usage scope type.", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      snapshotType: stringSchema("Snapshot cadence or type."),
      trashBytes: integerSchema("Trash bytes.", 0),
      usedBillableBytes: integerSchema("Billable bytes.", 0),
      usedLogicalBytes: integerSchema("Logical bytes.", 0),
      usedPhysicalBytes: integerSchema("Physical bytes.", 0),
      variantBytes: integerSchema("Variant bytes.", 0),
      versionCount: integerSchema("Number of versions.", 0),
    }),
    TrashDriveNodeRequest: objectSchema(["requestId"], {
      requestId: stringSchema("Client request id for tracing."),
    }),
    UnlockFileRequest: objectSchema(["requestId"], {
      reason: stringSchema("Operator-provided unlock reason."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    UpdateDrivePermissionRequest: objectSchema(["entries", "requestId"], {
      entries: {
        items: refSchema("DrivePermissionEntry"),
        type: "array",
      },
      requestId: stringSchema("Client request id for tracing."),
    }),
    UpdateDriveNodeRequest: objectSchema(["requestId"], {
      name: stringSchema("Drive node display name."),
      requestId: stringSchema("Client request id for tracing."),
    }),
    UpdateDriveShareLinkRequest: objectSchema(["requestId"], {
      allowDownload: booleanSchema("Whether download is allowed."),
      expiresAt: dateTimeSchema("Share link expiration time."),
      requestId: stringSchema("Client request id for tracing."),
      role: stringSchema("Share link role."),
      status: stringSchema("Share link status."),
    }),
    UpdateFileBindingRequest: objectSchema(["requestId"], {
      displayName: stringSchema("Binding display name."),
      requestId: stringSchema("Client request id for tracing."),
      sortOrder: integerSchema("Binding sort order.", 0),
      visibility: enumStringSchema("Binding visibility.", SDKWORK_FILE_VISIBILITIES),
    }),
    UpdateFileSlotDefinitionRequest: objectSchema(["requestId"], {
      displayName: stringSchema("Operator-facing slot display name."),
      maxFileBytes: integerSchema("Maximum single-file size.", 0),
      requestId: stringSchema("Client request id for tracing."),
      status: enumStringSchema("Slot status.", SDKWORK_FILE_SLOT_STATUSES),
    }),
    UpdateFileRequest: objectSchema(["requestId"], {
      displayName: stringSchema("File display name."),
      requestId: stringSchema("Client request id for tracing."),
      visibility: enumStringSchema("File visibility.", SDKWORK_FILE_VISIBILITIES),
    }),
  };
}

function objectSchema(required: readonly string[], properties: Record<string, JsonSchema | { $ref: string }>): JsonSchema {
  return {
    additionalProperties: false,
    properties,
    required,
    type: "object",
  };
}

function listResponseSchema(schemaName: string, options: { paginated?: boolean } = {}): JsonSchema {
  return objectSchema(["items", "requestId"], {
    items: {
      items: refSchema(schemaName),
      type: "array",
    },
    ...(options.paginated === false ? {} : { nextCursor: stringSchema("Cursor for the next result page.") }),
    requestId: stringSchema("Request id."),
  });
}

function refSchema(name: string): { $ref: string } {
  return { $ref: `#/components/schemas/${name}` };
}

function withJsonRequestBody(operation: OpenApiOperation, schemaName: string): OpenApiOperation {
  return {
    ...operation,
    requestBody: jsonRequestBody(schemaName),
  };
}

function jsonRequestBody(schemaName: string): unknown {
  return {
    content: {
      "application/json": {
        schema: refSchema(schemaName),
      },
    },
    required: true,
  };
}

function jsonResponse(schemaName: string): unknown {
  return {
    content: {
      "application/json": {
        schema: refSchema(schemaName),
      },
    },
    description: "Request completed.",
  };
}

function stringSchema(description: string): JsonSchema {
  return {
    description,
    type: "string",
  };
}

function enumStringSchema(description: string, values: readonly string[]): JsonSchema {
  return {
    ...stringSchema(description),
    enum: values,
  };
}

function dateTimeSchema(description: string): JsonSchema {
  return {
    ...stringSchema(description),
    format: "date-time",
  };
}

function integerSchema(description: string, minimum: number, maximum?: number): JsonSchema {
  return {
    ...(maximum === undefined ? {} : { maximum }),
    description,
    minimum,
    type: "integer",
  };
}

function booleanSchema(description: string): JsonSchema {
  return {
    description,
    type: "boolean",
  };
}

function collectOperationIds(document: SdkworkFileOpenApiDocument): string[] {
  return collectOperations(document).map((operation) => operation.operationId);
}

function collectOperationsById(document: SdkworkFileOpenApiDocument): Map<string, OpenApiOperation> {
  return new Map(collectOperations(document).map((operation) => [operation.operationId, operation]));
}

function collectOperationEntries(document: SdkworkFileOpenApiDocument): Array<{ method: HttpMethod; operation: OpenApiOperation }> {
  return Object.values(document.paths).flatMap((pathItem) => (
    Object.entries(pathItem).map(([method, operation]) => ({
      method: method as HttpMethod,
      operation,
    }))
  ));
}

function collectOperations(document: SdkworkFileOpenApiDocument): OpenApiOperation[] {
  return Object.values(document.paths).flatMap((pathItem) => Object.values(pathItem));
}

function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function hasRequiredPathParameter(operation: OpenApiOperation, name: string): boolean {
  return Boolean(operation.parameters?.some((parameter) => (
    parameter.in === "path"
    && parameter.name === name
    && parameter.required === true
    && parameter.schema.type === "string"
  )));
}

function hasQueryParameter(operation: OpenApiOperation, expected: OpenApiParameter): boolean {
  return Boolean(operation.parameters?.some((parameter) => (
    parameter.in === "query"
    && parameter.name === expected.name
    && parameter.required === expected.required
    && sameJson(parameter.schema, expected.schema)
  )));
}

function isJsonRequestBodyRef(requestBody: unknown, schemaName: string): boolean {
  if (typeof requestBody !== "object" || requestBody === null) {
    return false;
  }
  const body = requestBody as {
    content?: {
      "application/json"?: {
        schema?: {
          $ref?: unknown;
        };
      };
    };
    required?: unknown;
  };
  return body.required === true && body.content?.["application/json"]?.schema?.$ref === `#/components/schemas/${schemaName}`;
}

function isJsonResponseRef(response: unknown, schemaName: string): boolean {
  const body = response as {
    content?: {
      "application/json"?: {
        schema?: {
          $ref?: unknown;
        };
      };
    };
  };
  return body.content?.["application/json"]?.schema?.$ref === `#/components/schemas/${schemaName}`;
}

function hasJsonResponseRef(response: unknown): boolean {
  const body = response as {
    content?: {
      "application/json"?: {
        schema?: {
          $ref?: unknown;
        };
      };
    };
  };
  return typeof body.content?.["application/json"]?.schema?.$ref === "string";
}

function hasJsonRequestBodyWithRequestId(
  operation: OpenApiOperation,
  document: SdkworkFileOpenApiDocument,
): boolean {
  const requestBody = operation.requestBody as {
    content?: {
      "application/json"?: {
        schema?: {
          $ref?: unknown;
        };
      };
    };
    required?: unknown;
  } | undefined;
  const ref = requestBody?.content?.["application/json"]?.schema?.$ref;
  if (requestBody?.required !== true || typeof ref !== "string") {
    return false;
  }
  const schemaName = ref.replace("#/components/schemas/", "");
  return Boolean(document.components.schemas[schemaName]?.required?.includes("requestId"));
}

function collectUnresolvedSchemaRefs(document: SdkworkFileOpenApiDocument): string[] {
  const unresolvedRefs = new Set<string>();

  for (const schemaName of collectSchemaRefs(document)) {
    if (!document.components.schemas[schemaName]) {
      unresolvedRefs.add(schemaName);
    }
  }

  return [...unresolvedRefs].sort();
}

function collectUnboundedObjectSchemaPaths(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectUnboundedObjectSchemaPaths(entry, `${path}[${index}]`));
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const current = record.type === "object" && record.additionalProperties === true ? [path] : [];

  return [
    ...current,
    ...Object.entries(record).flatMap(([key, entry]) => (
      collectUnboundedObjectSchemaPaths(entry, path ? `${path}.${key}` : key)
    )),
  ];
}

function isEnumStringSchema(schema: unknown, values: readonly string[]): boolean {
  if (typeof schema !== "object" || schema === null) {
    return false;
  }
  const record = schema as { enum?: unknown; type?: unknown };
  return record.type === "string" && Array.isArray(record.enum) && sameStringSet(record.enum, values);
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
