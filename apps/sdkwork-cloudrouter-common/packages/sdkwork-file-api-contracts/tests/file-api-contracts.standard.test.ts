import { describe, expect, it } from "vitest";

import {
  SDKWORK_FILE_API_ROUTES,
  SDKWORK_FILE_SLOT_STATUSES,
  SDKWORK_FILE_UPLOAD_STATUSES,
  SDKWORK_FILE_UPLOAD_MODES,
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
  SDKWORK_STORAGE_PROVIDER_TYPES,
  SDKWORK_STORAGE_RESOURCE_STATUSES,
  SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
} from "../../sdkwork-file-contracts/src/index";
import {
  SDKWORK_FILE_APP_OPENAPI,
  SDKWORK_FILE_BACKEND_OPENAPI,
  createFileApiContractBundle,
  validateFileApiContractStandard,
} from "../src/index";

describe("SDKWork file platform OpenAPI contracts", () => {
  it("creates app and backend OpenAPI documents on the canonical standard", () => {
    const bundle = createFileApiContractBundle();

    expect(bundle.app.openapi).toBe(SDKWORK_FILE_STANDARD.api.openapi);
    expect(bundle.backend.openapi).toBe(SDKWORK_FILE_STANDARD.api.openapi);
    expect(bundle.app.info.title).toBe("SDKWork File App API");
    expect(bundle.backend.info.title).toBe("SDKWork File Backend API");
    expect(Object.keys(bundle.app.paths).every((path) => path.startsWith(SDKWORK_FILE_STANDARD.api.appPrefix))).toBe(true);
    expect(Object.keys(bundle.backend.paths).every((path) => path.startsWith(SDKWORK_FILE_STANDARD.api.backendPrefix))).toBe(true);
  });

  it("covers every canonical app and backend route exactly once", () => {
    const appPaths = Object.keys(SDKWORK_FILE_APP_OPENAPI.paths).sort();
    const backendPaths = Object.keys(SDKWORK_FILE_BACKEND_OPENAPI.paths).sort();

    expect(appPaths).toEqual([...new Set(flattenRoutes(SDKWORK_FILE_API_ROUTES.app))].sort());
    expect(backendPaths).toEqual([...new Set(flattenRoutes(SDKWORK_FILE_API_ROUTES.backend))].sort());
    expect(new Set([...appPaths, ...backendPaths]).size).toBe(appPaths.length + backendPaths.length);
  });

  it("keeps operation ids unique and aligned with canonical operation contracts", () => {
    const operationIds = [
      ...collectOperationIds(SDKWORK_FILE_APP_OPENAPI),
      ...collectOperationIds(SDKWORK_FILE_BACKEND_OPENAPI),
    ];

    const canonicalOperationIds = Object.values(SDKWORK_FILE_OPERATION_IDS).map((operation) => operation.operationId);

    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(operationIds.sort()).toEqual(canonicalOperationIds.sort());
  });

  it("reports OpenAPI operation drift from canonical operation contracts", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.backend.storage.providers;
    const drifted = {
      ...bundle,
      backend: {
        ...bundle.backend,
        paths: {
          ...bundle.backend.paths,
          [path]: {
            ...bundle.backend.paths[path],
            post: {
              ...bundle.backend.paths[path].post,
              operationId: "oss.providers.createV2",
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("operation_contract_mismatch");
  });

  it("reports operation metadata drift from canonical operation contracts", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.backend.storage.providers;
    const drifted = {
      ...bundle,
      backend: {
        ...bundle.backend,
        paths: {
          ...bundle.backend.paths,
          [path]: {
            ...bundle.backend.paths[path],
            post: {
              ...bundle.backend.paths[path].post,
              tags: ["files"],
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("operation_contract_metadata_mismatch:oss.providers.create");
  });

  it("defines required OpenAPI path parameters for every templated route", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      for (const [path, pathItem] of Object.entries(document.paths)) {
        const parameterNames = pathParameterNames(path);
        for (const operation of Object.values(pathItem)) {
          const parameters = readParameters(operation);

          for (const parameterName of parameterNames) {
            expect(parameters).toContainEqual({
              in: "path",
              name: parameterName,
              required: true,
              schema: {
                type: "string",
              },
            });
          }
        }
      }
    }

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("reports missing OpenAPI path parameters on templated routes", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.app.files.get;
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        paths: {
          ...bundle.app.paths,
          [path]: {
            ...bundle.app.paths[path],
            get: {
              ...bundle.app.paths[path].get,
              parameters: [],
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("missing_path_parameter:files.retrieve:fileId");
  });

  it("defines query parameters for adapter-facing read and list operations", () => {
    const filesListParameters = readParameters(SDKWORK_FILE_APP_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.app.files.collection].get);
    expect(findParameter(filesListParameters, "requestId", "query")).toMatchObject({
      in: "query",
      name: "requestId",
      required: true,
      schema: {
        type: "string",
      },
    });
    expect(findParameter(filesListParameters, "limit", "query")).toMatchObject({
      in: "query",
      name: "limit",
      required: false,
      schema: {
        maximum: 200,
        minimum: 1,
        type: "integer",
      },
    });
    expect(findParameter(filesListParameters, "targetType", "query")).toMatchObject({
      in: "query",
      name: "targetType",
      required: false,
      schema: {
        type: "string",
      },
    });

    const bindingParameters = readParameters(SDKWORK_FILE_APP_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.app.fileBindings.collection].get);
    expect(findParameter(bindingParameters, "targetType", "query")).toMatchObject({
      required: true,
    });
    expect(findParameter(bindingParameters, "targetId", "query")).toMatchObject({
      required: true,
    });

    const usageParameters = readParameters(SDKWORK_FILE_APP_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.app.storage.currentUsage].get);
    expect(findParameter(usageParameters, "scopeType", "query")).toMatchObject({
      required: true,
      schema: {
        enum: SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
        type: "string",
      },
    });

    const bucketParameters = readParameters(SDKWORK_FILE_BACKEND_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.backend.storage.buckets].get);
    expect(findParameter(bucketParameters, "logicalScope", "query")).toMatchObject({
      required: false,
      schema: {
        enum: SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
        type: "string",
      },
    });

    const ledgerParameters = readParameters(SDKWORK_FILE_BACKEND_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.backend.storage.usageLedger].get);
    expect(findParameter(ledgerParameters, "occurredAfter", "query")).toMatchObject({
      required: false,
      schema: {
        format: "date-time",
        type: "string",
      },
    });

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("reports missing query parameters on adapter-facing read and list operations", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.app.files.collection;
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        paths: {
          ...bundle.app.paths,
          [path]: {
            ...bundle.app.paths[path],
            get: {
              ...bundle.app.paths[path].get,
              parameters: readParameters(bundle.app.paths[path].get).filter(
                (parameter) => !isParameter(parameter, "requestId", "query"),
              ),
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("missing_query_parameter:files.list:requestId");
  });

  it("separates app authority from backend storage administration", () => {
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.providers);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.provider);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.buckets);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.bucket);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.defaultBuckets);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths)).not.toContain(SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket);

    for (const pathItem of Object.values(SDKWORK_FILE_BACKEND_OPENAPI.paths)) {
      for (const operation of Object.values(pathItem)) {
        expect(operation["x-sdkwork-admin-rbac"]).toEqual(
          expect.objectContaining({
            audit: true,
            scope: "file-platform-admin",
          }),
        );
      }
    }
  });

  it("publishes only surface-reachable component schemas in each OpenAPI document", () => {
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("AdminFileRecord");
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("StorageProviderConfig");
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("StorageDefaultBucketConfig");
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("DriveShareLink");
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas).toHaveProperty("AdminFileRecord");
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas).toHaveProperty("StorageProviderConfig");
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas).toHaveProperty("StorageDefaultBucketConfig");
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas).toHaveProperty("DriveShareLink");

    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      expect(new Set(Object.keys(document.components.schemas))).toEqual(collectReachableSchemaNames(document));
    }
  });

  it("resolves every OpenAPI schema reference after surface schema pruning", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      for (const schemaName of collectSchemaRefs(document)) {
        expect(document.components.schemas).toHaveProperty(schemaName);
      }
    }

    const bundle = createFileApiContractBundle();
    const appSchemas = { ...bundle.app.components.schemas };
    delete appSchemas.FileRef;
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        components: {
          schemas: appSchemas,
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("unresolved_schema_ref:app:FileRef");
  });

  it("rejects unbounded object schemas so generated SDK DTOs stay explicit", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      expect(collectUnboundedObjectSchemaPaths(document)).toEqual([]);
    }

    const bundle = createFileApiContractBundle();
    const drifted = {
      ...bundle,
      backend: {
        ...bundle.backend,
        components: {
          schemas: {
            ...bundle.backend.components.schemas,
            UnsafeCriteria: {
              additionalProperties: true,
              type: "object",
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain(
      "unbounded_object_schema:backend:UnsafeCriteria",
    );
  });

  it("binds reusable resource type fields to canonical enum vocabularies", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      expect(document.components.schemas.DriveNode.properties?.nodeType).toEqual(enumSchema(SDKWORK_DRIVE_NODE_TYPES));
      expect(document.components.schemas.DriveSpace.properties?.type).toEqual(enumSchema(SDKWORK_DRIVE_SPACE_TYPES));
      expect(document.components.schemas.DriveSpace.properties?.status).toEqual(enumSchema(SDKWORK_DRIVE_SPACE_STATUSES));
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.StorageUsageSnapshot.properties?.scopeType).toEqual(
      enumSchema(SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
    );
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.FileRef.properties?.visibility).toEqual(
      enumSchema(SDKWORK_FILE_VISIBILITIES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.AdminFileRecord.properties?.visibility).toEqual(
      enumSchema(SDKWORK_FILE_VISIBILITIES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.FileSlotDefinition.properties?.status).toEqual(
      enumSchema(SDKWORK_FILE_SLOT_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderConfig.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketConfig.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketConfig.properties?.defaultStorageClass).toEqual(
      enumSchema(SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketConfig.properties?.defaultEncryptionMode).toEqual(
      enumSchema(SDKWORK_STORAGE_ENCRYPTION_MODES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageDefaultBucketConfig.properties?.logicalScope).toEqual(
      enumSchema(SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageDefaultBucketConfig.properties?.providerType).toEqual(
      enumSchema(SDKWORK_STORAGE_PROVIDER_TYPES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageDefaultBucketConfig.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageQuotaPolicy.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageReconciliationRun.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_JOB_STATUSES),
    );
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageGarbageCollectionJob.properties?.status).toEqual(
      enumSchema(SDKWORK_STORAGE_JOB_STATUSES),
    );

    const bundle = createFileApiContractBundle();
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        components: {
          schemas: {
            ...bundle.app.components.schemas,
            DriveNode: {
              ...bundle.app.components.schemas.DriveNode,
              properties: {
                ...bundle.app.components.schemas.DriveNode.properties,
                nodeType: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain(
      "schema_enum:app:DriveNode.nodeType",
    );
  });

  it("defines idempotent request bodies for backend storage configuration commands", () => {
    const commands = [
      {
        path: SDKWORK_FILE_API_ROUTES.backend.storage.providers,
        required: ["credentialRef", "idempotencyKey", "providerCode", "providerType", "requestId"],
        schemaName: "CreateStorageProviderRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.backend.storage.buckets,
        required: ["bucketName", "idempotencyKey", "logicalScope", "providerId", "requestId"],
        schemaName: "CreateStorageBucketRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.backend.storage.quotas,
        required: ["idempotencyKey", "quotaLimitBytes", "requestId", "scopeId", "scopeType"],
        schemaName: "CreateStorageQuotaPolicyRequest",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_BACKEND_OPENAPI.paths[command.path].post;
      const schema = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas[command.schemaName];

      expect(operation?.requestBody).toEqual(jsonRequestBody(command.schemaName));
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(command.required);
      expect(schema.properties?.idempotencyKey).toEqual(
        expect.objectContaining({
          description: expect.stringContaining("Idempotency"),
          type: "string",
        }),
      );
      expect(schema.properties?.requestId).toEqual(
        expect.objectContaining({
          description: expect.stringContaining("tracing"),
          type: "string",
        }),
      );
    }

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines auditable request bodies for storage provider and bucket status governance", () => {
    const providerOperation = SDKWORK_FILE_BACKEND_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.backend.storage.provider]?.patch;
    const bucketOperation = SDKWORK_FILE_BACKEND_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.backend.storage.bucket]?.patch;
    const providerSchema = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.UpdateStorageProviderRequest;
    const bucketSchema = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.UpdateStorageBucketRequest;

    expect(providerOperation?.operationId).toBe("oss.providers.update");
    expect(providerOperation?.requestBody).toEqual(jsonRequestBody("UpdateStorageProviderRequest"));
    expect(providerOperation?.responses["200"]).toEqual(jsonResponse("StorageProviderMutationResponse"));
    expect(providerSchema.additionalProperties).toBe(false);
    expect(providerSchema.required).toEqual(["reason", "requestId", "status"]);
    expect(providerSchema.properties?.status).toEqual(enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES));
    expect(providerSchema.properties?.reason).toEqual(expect.objectContaining({ type: "string" }));

    expect(bucketOperation?.operationId).toBe("oss.buckets.update");
    expect(bucketOperation?.requestBody).toEqual(jsonRequestBody("UpdateStorageBucketRequest"));
    expect(bucketOperation?.responses["200"]).toEqual(jsonResponse("StorageBucketMutationResponse"));
    expect(bucketSchema.additionalProperties).toBe(false);
    expect(bucketSchema.required).toEqual(["reason", "requestId", "status"]);
    expect(bucketSchema.properties?.status).toEqual(enumSchema(SDKWORK_STORAGE_RESOURCE_STATUSES));
    expect(bucketSchema.properties?.reason).toEqual(expect.objectContaining({ type: "string" }));
    expect(JSON.stringify(providerSchema)).not.toMatch(forbiddenCredentialFieldPattern());
    expect(JSON.stringify(bucketSchema)).not.toMatch(forbiddenCredentialFieldPattern("presigned", "Url"));
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines S3-compatible provider and bucket advanced configuration fields", () => {
    const providerRequest = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.CreateStorageProviderRequest;
    const providerConfig = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderConfig;
    const bucketRequest = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.CreateStorageBucketRequest;
    const bucketConfig = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketConfig;

    for (const schema of [providerRequest, providerConfig]) {
      expect(schema.properties?.pathStyleEnabled).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.supportsLifecycle).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.supportsMultipart).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.supportsObjectLock).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(JSON.stringify(schema)).not.toMatch(forbiddenCredentialFieldPattern());
    }

    for (const schema of [bucketRequest, bucketConfig]) {
      expect(schema.properties?.bucketRegion).toEqual(expect.objectContaining({ type: "string" }));
      expect(schema.properties?.objectKeyPrefix).toEqual(expect.objectContaining({ type: "string" }));
      expect(schema.properties?.defaultStorageClass).toEqual(enumSchema(SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES));
      expect(schema.properties?.defaultEncryptionMode).toEqual(enumSchema(SDKWORK_STORAGE_ENCRYPTION_MODES));
      expect(schema.properties?.kmsKeyRef).toEqual(expect.objectContaining({ type: "string" }));
      expect(schema.properties?.versioningEnabled).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.objectLockEnabled).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.lifecycleEnabled).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(schema.properties?.publicAccessBlocked).toEqual(expect.objectContaining({ type: "boolean" }));
      expect(JSON.stringify(schema)).not.toMatch(forbiddenCredentialFieldPattern("presigned", "Url"));
    }

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines auditable request bodies for setting default storage buckets", () => {
    const operation = SDKWORK_FILE_BACKEND_OPENAPI.paths[SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket].patch;
    const schema = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.SetStorageDefaultBucketRequest;

    expect(operation?.operationId).toBe("oss.defaultBuckets.update");
    expect(operation?.requestBody).toEqual(jsonRequestBody("SetStorageDefaultBucketRequest"));
    expect(operation?.responses["200"]).toEqual(jsonResponse("StorageDefaultBucketMutationResponse"));
    expect(operation?.description).toContain("active logical bucket");
    expect(operation?.description).toContain("active storage provider");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["bucketId", "reason", "requestId"]);
    expect(schema.properties?.bucketId).toEqual(
      expect.objectContaining({
        description: expect.stringContaining("active logical bucket"),
        type: "string",
      }),
    );
    expect(schema.properties?.requestId).toEqual(
      expect.objectContaining({
        description: expect.stringContaining("tracing"),
        type: "string",
      }),
    );
    expect(schema.properties).not.toHaveProperty("idempotencyKey");
    expect(schema.properties).not.toHaveProperty("credential");
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines request bodies for backend storage operation commands", () => {
    const commands = [
      {
        path: SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns,
        schemaName: "CreateStorageReconciliationRunRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.backend.storage.gcJobs,
        schemaName: "CreateStorageGarbageCollectionJobRequest",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_BACKEND_OPENAPI.paths[command.path].post;
      const schema = SDKWORK_FILE_BACKEND_OPENAPI.components.schemas[command.schemaName];

      expect(operation?.requestBody).toEqual(jsonRequestBody(command.schemaName));
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties?.idempotencyKey).toEqual(
        expect.objectContaining({
          description: expect.stringContaining("Idempotency"),
          type: "string",
        }),
      );
      expect(schema.properties?.requestId).toEqual(
        expect.objectContaining({
          description: expect.stringContaining("tracing"),
          type: "string",
        }),
      );
    }

    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.CreateStorageGarbageCollectionJobRequest.required).toEqual([
      "dryRun",
      "idempotencyKey",
      "jobType",
      "requestId",
    ]);
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.CreateStorageReconciliationRunRequest.required).toEqual([
      "dryRun",
      "idempotencyKey",
      "requestId",
      "runType",
    ]);
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("does not expose app-local upload session or presign operations", () => {
    expect(SDKWORK_FILE_API_ROUTES.app).not.toHaveProperty("upload");
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths).some((path) => path.includes("/upload/sessions"))).toBe(false);
    expect(Object.keys(SDKWORK_FILE_APP_OPENAPI.paths).some((path) => path.includes("presign"))).toBe(false);
    expect(collectOperationIds(SDKWORK_FILE_APP_OPENAPI).some((operationId) => operationId.startsWith("upload."))).toBe(false);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("UploadSession");
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("PresignUploadPartResponse");
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas).not.toHaveProperty("PresignUploadSessionResponse");
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines request bodies for app file access and binding command operations", () => {
    const commands = [
      {
        path: SDKWORK_FILE_API_ROUTES.app.files.issueDownloadUrl,
        schemaName: "IssueFileAccessUrlRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.files.issuePreviewUrl,
        schemaName: "IssueFileAccessUrlRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.collection,
        schemaName: "CreateFileBindingRequest",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
        schemaName: "DeleteFileBindingRequest",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_APP_OPENAPI.paths[command.path].post
        ?? SDKWORK_FILE_APP_OPENAPI.paths[command.path].delete;
      const schema = SDKWORK_FILE_APP_OPENAPI.components.schemas[command.schemaName];

      expect(operation?.requestBody).toEqual(jsonRequestBody(command.schemaName));
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties?.requestId).toEqual(
        expect.objectContaining({
          description: expect.stringContaining("tracing"),
          type: "string",
        }),
      );
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.CreateFileBindingRequest.required).toEqual([
      "fileId",
      "purpose",
      "requestId",
      "target",
    ]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.DeleteFileBindingRequest.required).toEqual([
      "bindingId",
      "requestId",
    ]);
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines typed JSON responses for app file access and binding command operations", () => {
    const commands = [
      {
        path: SDKWORK_FILE_API_ROUTES.app.files.issueDownloadUrl,
        schemaName: "FileAccessUrl",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.files.issuePreviewUrl,
        schemaName: "FileAccessUrl",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.collection,
        schemaName: "FileBindingMutationResponse",
      },
      {
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
        schemaName: "DeleteFileBindingResponse",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_APP_OPENAPI.paths[command.path].post
        ?? SDKWORK_FILE_APP_OPENAPI.paths[command.path].delete;
      expect(operation?.responses["200"]).toEqual(jsonResponse(command.schemaName));
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.FileBindingMutationResponse.required).toEqual([
      "fileRef",
      "requestId",
    ]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.DeleteFileBindingResponse.required).toEqual([
      "bindingId",
      "requestId",
    ]);
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines request bodies for remaining app-side file, drive, and binding commands", () => {
    const commands = [
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.files.update,
        schemaName: "UpdateFileRequest",
      },
      {
        method: "delete",
        path: SDKWORK_FILE_API_ROUTES.app.files.delete,
        schemaName: "DeleteFileRequest",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.createFolder,
        schemaName: "CreateDriveFolderRequest",
      },
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.drive.updateNode,
        schemaName: "UpdateDriveNodeRequest",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.moveNode,
        schemaName: "MoveDriveNodeRequest",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.copyNode,
        schemaName: "CopyDriveNodeRequest",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.trashNode,
        schemaName: "TrashDriveNodeRequest",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.restoreNode,
        schemaName: "RestoreDriveNodeRequest",
      },
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
        schemaName: "UpdateFileBindingRequest",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_APP_OPENAPI.paths[command.path][command.method];
      expect(operation?.requestBody).toEqual(jsonRequestBody(command.schemaName));
      expect(SDKWORK_FILE_APP_OPENAPI.components.schemas[command.schemaName].required).toContain("requestId");
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.CreateDriveFolderRequest.required).toEqual([
      "idempotencyKey",
      "name",
      "requestId",
    ]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.CopyDriveNodeRequest.required).toEqual([
      "idempotencyKey",
      "requestId",
    ]);
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines typed JSON responses for all app-side foundation operations", () => {
    const operations = [
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.files.update,
        schemaName: "FileMutationResponse",
      },
      {
        method: "delete",
        path: SDKWORK_FILE_API_ROUTES.app.files.delete,
        schemaName: "DeleteFileResponse",
      },
      {
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.files.versions,
        schemaName: "FileVersionListResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.createFolder,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.drive.updateNode,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.moveNode,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.copyNode,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.trashNode,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.app.drive.restoreNode,
        schemaName: "DriveNodeMutationResponse",
      },
      {
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.drive.changes,
        schemaName: "DriveChangeListResponse",
      },
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.item,
        schemaName: "FileBindingDetailResponse",
      },
      {
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.storage.spaceUsage,
        schemaName: "StorageSpaceUsageListResponse",
      },
      {
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.storage.currentQuota,
        schemaName: "StorageQuota",
      },
    ] as const;

    for (const operation of operations) {
      expect(SDKWORK_FILE_APP_OPENAPI.paths[operation.path][operation.method]?.responses["200"]).toEqual(
        jsonResponse(operation.schemaName),
      );
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.FileVersionRef.required).toEqual([
      "fileId",
      "sizeBytes",
      "status",
      "versionId",
      "versionNo",
    ]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.DriveChange.required).toEqual([
      "changeId",
      "eventType",
      "resourceId",
      "resourceType",
      "sequenceNo",
      "spaceId",
    ]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.StorageQuota.required).toEqual([
      "quotaLimitBytes",
      "requestId",
      "scopeId",
      "scopeType",
      "usedBillableBytes",
    ]);
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("reports missing request and response contracts for app-side foundation commands", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.app.drive.moveNode;
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        paths: {
          ...bundle.app.paths,
          [path]: {
            ...bundle.app.paths[path],
            post: {
              ...bundle.app.paths[path].post,
              requestBody: undefined,
              responses: {
                ...bundle.app.paths[path].post?.responses,
                "200": {
                  description: "Request completed.",
                },
              },
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toEqual(
      expect.arrayContaining([
        "app_foundation_command_request_body:drive.nodes.move",
        "app_foundation_operation_response_body:drive.nodes.move",
      ]),
    );
  });

  it("defines typed JSON responses for every app and backend operation", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      for (const operation of collectOperations(document)) {
        expect(operation.responses["200"]).toEqual(
          expect.objectContaining({
            content: expect.objectContaining({
              "application/json": expect.objectContaining({
                schema: expect.objectContaining({
                  $ref: expect.stringMatching(/^#\/components\/schemas\/[A-Za-z0-9]+$/),
                }),
              }),
            }),
          }),
        );
      }
    }

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines JSON request bodies with requestId for every app and backend command operation", () => {
    for (const document of [SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI]) {
      for (const { operation } of collectCommandOperations(document)) {
        const requestBody = readJsonRequestBody(operation);
        const schemaName = requestBody?.content?.["application/json"]?.schema?.$ref?.replace("#/components/schemas/", "");
        expect(requestBody).toEqual(
          expect.objectContaining({
            required: true,
          }),
        );
        expect(schemaName).toEqual(expect.any(String));
        expect(document.components.schemas[schemaName ?? ""].required).toContain("requestId");
      }
    }

    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("reports standard operation response and command request body drift", () => {
    const bundle = createFileApiContractBundle();
    const responsePath = SDKWORK_FILE_API_ROUTES.backend.files.collection;
    const commandPath = SDKWORK_FILE_API_ROUTES.backend.files.lock;
    const drifted = {
      ...bundle,
      backend: {
        ...bundle.backend,
        paths: {
          ...bundle.backend.paths,
          [responsePath]: {
            ...bundle.backend.paths[responsePath],
            get: {
              ...bundle.backend.paths[responsePath].get,
              responses: {
                ...bundle.backend.paths[responsePath].get?.responses,
                "200": {
                  description: "Request completed.",
                },
              },
            },
          },
          [commandPath]: {
            ...bundle.backend.paths[commandPath],
            post: {
              ...bundle.backend.paths[commandPath].post,
              requestBody: undefined,
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toEqual(
      expect.arrayContaining([
        "standard_operation_response_body:admin.files.list",
        "standard_command_request_body:files.lock",
      ]),
    );
  });

  it("defines typed JSON responses for backend storage command operations", () => {
    const commands = [
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.providers,
        schemaName: "StorageProviderMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.buckets,
        schemaName: "StorageBucketMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.quotas,
        schemaName: "StorageQuotaPolicyMutationResponse",
      },
      {
        method: "patch",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket,
        schemaName: "StorageDefaultBucketMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns,
        schemaName: "StorageReconciliationRunMutationResponse",
      },
      {
        method: "post",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.gcJobs,
        schemaName: "StorageGarbageCollectionJobMutationResponse",
      },
    ] as const;

    for (const command of commands) {
      const operation = SDKWORK_FILE_BACKEND_OPENAPI.paths[command.path][command.method];
      expect(operation?.responses["200"]).toEqual(jsonResponse(command.schemaName));
    }

    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderMutationResponse.required).toEqual([
      "provider",
      "requestId",
    ]);
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderMutationResponse.properties?.provider).toEqual({
      $ref: "#/components/schemas/StorageProviderConfig",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketMutationResponse.properties?.bucket).toEqual({
      $ref: "#/components/schemas/StorageBucketConfig",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageDefaultBucketMutationResponse.properties?.defaultBucket).toEqual({
      $ref: "#/components/schemas/StorageDefaultBucketConfig",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageQuotaPolicyMutationResponse.properties?.quotaPolicy).toEqual({
      $ref: "#/components/schemas/StorageQuotaPolicy",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageReconciliationRunMutationResponse.properties?.reconciliationRun).toEqual({
      $ref: "#/components/schemas/StorageReconciliationRun",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageGarbageCollectionJobMutationResponse.required).toEqual([
      "job",
      "requestId",
    ]);
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageGarbageCollectionJobMutationResponse.properties?.job).toEqual({
      $ref: "#/components/schemas/StorageGarbageCollectionJob",
    });
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("defines typed JSON responses for foundation read and list operations", () => {
    const operations = [
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.files.collection,
        schemaName: "FileListResponse",
      },
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.files.get,
        schemaName: "FileDetailResponse",
      },
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.fileBindings.collection,
        schemaName: "FileBindingListResponse",
      },
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.drive.listSpaces,
        schemaName: "DriveSpaceListResponse",
      },
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.drive.listNodes,
        schemaName: "DriveNodeListResponse",
      },
      {
        document: SDKWORK_FILE_APP_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.app.storage.currentUsage,
        schemaName: "StorageUsageSnapshot",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.providers,
        schemaName: "StorageProviderListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.buckets,
        schemaName: "StorageBucketListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.defaultBuckets,
        schemaName: "StorageDefaultBucketListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.quotas,
        schemaName: "StorageQuotaPolicyListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns,
        schemaName: "StorageReconciliationRunListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.usage,
        schemaName: "StorageUsageCounterListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.usageLedger,
        schemaName: "StorageUsageLedgerListResponse",
      },
      {
        document: SDKWORK_FILE_BACKEND_OPENAPI,
        method: "get",
        path: SDKWORK_FILE_API_ROUTES.backend.storage.usageSnapshots,
        schemaName: "StorageUsageSnapshotListResponse",
      },
    ] as const;

    for (const operation of operations) {
      expect(operation.document.paths[operation.path][operation.method]?.responses["200"]).toEqual(jsonResponse(operation.schemaName));
    }

    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.FileListResponse.required).toEqual(["items", "requestId"]);
    expect(SDKWORK_FILE_APP_OPENAPI.components.schemas.DriveNodeListResponse.properties?.items).toEqual({
      items: {
        $ref: "#/components/schemas/DriveNode",
      },
      type: "array",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderListResponse.required).toEqual(["items", "requestId"]);
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageProviderListResponse.properties?.items).toEqual({
      items: {
        $ref: "#/components/schemas/StorageProviderConfig",
      },
      type: "array",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageBucketListResponse.properties?.items).toEqual({
      items: {
        $ref: "#/components/schemas/StorageBucketConfig",
      },
      type: "array",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageDefaultBucketListResponse.properties?.items).toEqual({
      items: {
        $ref: "#/components/schemas/StorageDefaultBucketConfig",
      },
      type: "array",
    });
    expect(SDKWORK_FILE_BACKEND_OPENAPI.components.schemas.StorageUsageLedgerListResponse.properties?.nextCursor).toEqual(
      expect.objectContaining({
        type: "string",
      }),
    );
    expect(validateFileApiContractStandard()).toEqual([]);
  });

  it("reports missing typed response schemas for foundation read and list operations", () => {
    const bundle = createFileApiContractBundle();
    const path = SDKWORK_FILE_API_ROUTES.app.files.collection;
    const drifted = {
      ...bundle,
      app: {
        ...bundle.app,
        paths: {
          ...bundle.app.paths,
          [path]: {
            ...bundle.app.paths[path],
            get: {
              ...bundle.app.paths[path].get,
              responses: {
                ...bundle.app.paths[path].get?.responses,
                "200": {
                  description: "Request completed.",
                },
              },
            },
          },
        },
      },
    };

    expect(validateFileApiContractStandard(drifted)).toContain("operation_response_body:files.list");
  });

  it("does not expose storage internals in durable app resources", () => {
    const schemas = SDKWORK_FILE_APP_OPENAPI.components.schemas;

    for (const schemaName of ["FileRef", "DriveSpace", "DriveNode", "StorageUsageSnapshot", "FileBinding"] as const) {
      const serialized = JSON.stringify(schemas[schemaName]).toLowerCase();
      expect(serialized).not.toContain("providerid");
      expect(serialized).not.toContain("bucket");
      expect(serialized).not.toContain("objectkey");
      expect(serialized).not.toContain("objecturi");
      expect(serialized).not.toContain("presignedurl");
      expect(serialized).not.toContain("s3url");
      expect(serialized).not.toContain("publicurl");
    }

    expect(schemas).not.toHaveProperty("PresignedUploadGrant");
    expect(validateFileApiContractStandard()).toEqual([]);
  });
});

function flattenRoutes(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  return Object.values(value).flatMap((child) => flattenRoutes(child));
}

function collectOperationIds(document: typeof SDKWORK_FILE_APP_OPENAPI): string[] {
  return Object.values(document.paths).flatMap((pathItem) => Object.values(pathItem).map((operation) => operation.operationId));
}

function collectOperations(document: typeof SDKWORK_FILE_APP_OPENAPI): Array<{ responses: Record<string, unknown> }> {
  return Object.values(document.paths).flatMap((pathItem) => Object.values(pathItem));
}

function collectCommandOperations(document: typeof SDKWORK_FILE_APP_OPENAPI): Array<{ operation: unknown }> {
  return Object.values(document.paths).flatMap((pathItem) => (
    Object.entries(pathItem)
      .filter(([method]) => method !== "get")
      .map(([, operation]) => ({ operation }))
  ));
}

function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function readParameters(operation: unknown): unknown[] {
  const parameters = (operation as { parameters?: unknown[] }).parameters;
  return Array.isArray(parameters) ? parameters : [];
}

function readJsonRequestBody(operation: unknown): {
  content?: {
    "application/json"?: {
      schema?: {
        $ref?: string;
      };
    };
  };
  required?: unknown;
} | undefined {
  return (operation as { requestBody?: unknown }).requestBody as ReturnType<typeof readJsonRequestBody>;
}

function enumSchema(values: readonly string[]): unknown {
  return expect.objectContaining({
    enum: values,
    type: "string",
  });
}

function collectReachableSchemaNames(document: typeof SDKWORK_FILE_APP_OPENAPI): Set<string> {
  const reachable = new Set<string>();
  const queue = collectSchemaRefs(document.paths);

  while (queue.length > 0) {
    const schemaName = queue.shift();
    if (!schemaName || reachable.has(schemaName)) {
      continue;
    }
    reachable.add(schemaName);
    queue.push(...collectSchemaRefs(document.components.schemas[schemaName]));
  }

  return reachable;
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

function findParameter(parameters: unknown[], name: string, location: "path" | "query"): unknown {
  return parameters.find((parameter) => isParameter(parameter, name, location));
}

function isParameter(parameter: unknown, name: string, location: "path" | "query"): boolean {
  return (
    typeof parameter === "object"
    && parameter !== null
    && (parameter as { in?: unknown }).in === location
    && (parameter as { name?: unknown }).name === name
  );
}

function jsonRequestBody(schemaName: string): unknown {
  return {
    content: {
      "application/json": {
        schema: {
          $ref: `#/components/schemas/${schemaName}`,
        },
      },
    },
    required: true,
  };
}

function jsonResponse(schemaName: string): unknown {
  return {
    content: {
      "application/json": {
        schema: {
          $ref: `#/components/schemas/${schemaName}`,
        },
      },
    },
    description: "Request completed.",
  };
}

function forbiddenCredentialFieldPattern(...extraParts: string[]): RegExp {
  const forbiddenFields = [
    ["secret", "Access", "Key"],
    ["access", "Key", "Id"],
    ["credential", "Value"],
    extraParts,
  ].filter((parts) => parts.length > 0);
  return new RegExp(forbiddenFields.map((parts) => parts.join("")).join("|"), "i");
}
