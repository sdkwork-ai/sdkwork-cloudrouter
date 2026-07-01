import { describe, expect, it } from "vitest";

import {
  SDKWORK_FILE_BINDING_STATES,
  SDKWORK_FILE_SLOT_STATUSES,
  SDKWORK_FILE_VISIBILITIES,
  SDKWORK_FILE_TABLES,
  SDKWORK_DRIVE_NODE_TYPES,
  SDKWORK_DRIVE_SPACE_STATUSES,
  SDKWORK_DRIVE_SPACE_TYPES,
  SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
  SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  SDKWORK_STORAGE_ENCRYPTION_MODES,
  SDKWORK_STORAGE_JOB_STATUSES,
  SDKWORK_STORAGE_PROVIDER_TYPES,
  SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES,
  SDKWORK_STORAGE_RESOURCE_STATUSES,
  SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
} from "../../sdkwork-file-contracts/src/index";
import {
  SDKWORK_FILE_SCHEMA_VERSION,
  SDKWORK_FILE_SCHEMA_TABLES,
  createPostgresFileSchemaMigration,
  getFileSchemaTable,
  validateFileSchemaStandard,
} from "../src/index";

describe("SDKWork file platform database schema", () => {
  it("defines a versioned table catalog aligned with file contracts", () => {
    expect(SDKWORK_FILE_SCHEMA_VERSION).toBe("2026.05.file-platform.v1");
    expect(SDKWORK_FILE_SCHEMA_TABLES.map((table) => table.name)).toEqual(Object.values(SDKWORK_FILE_TABLES));

    for (const table of SDKWORK_FILE_SCHEMA_TABLES) {
      expect(table.columns.some((column) => column.name === "id")).toBe(true);
      expect(table.columns.some((column) => column.name === "uuid")).toBe(true);
      expect(table.columns.some((column) => column.name === "created_at")).toBe(true);
      expect(table.name).not.toContain("plus");
    }
  });

  it("generates PostgreSQL DDL with required domain constraints and indexes", () => {
    const sql = createPostgresFileSchemaMigration();

    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS object_blob");
    expect(sql).toContain("CONSTRAINT uq_object_blob_provider_bucket_key_version UNIQUE (tenant_id, provider_id, bucket_id, object_key, object_version_id)");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_drive_node_active_name");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_file_version_current");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_usage_ledger_idempotency");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_usage_counter_scope");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS storage_usage_snapshot");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS storage_default_bucket_policy");
    expect(sql).toContain("CONSTRAINT uq_storage_default_bucket_policy_scope UNIQUE (tenant_id, logical_scope)");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_usage_snapshot_scope_period");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS storage_reconciliation_run");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS storage_reconciliation_item");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS storage_gc_job");
    expect(sql).toContain("CREATE TRIGGER trg_storage_usage_ledger_append_only");
    expect(sql).toContain("CREATE TRIGGER trg_file_audit_log_append_only");
  });

  it("enforces canonical type vocabularies in schema", () => {
    const provider = getFileSchemaTable("object_provider");
    const bucket = getFileSchemaTable("object_bucket");
    const defaultBucketPolicy = getFileSchemaTable("storage_default_bucket_policy");
    const driveSpace = getFileSchemaTable("drive_space");
    const driveNode = getFileSchemaTable("drive_node");
    const quota = getFileSchemaTable("storage_quota_policy");
    const usageCounter = getFileSchemaTable("storage_usage_counter");
    const usageSnapshot = getFileSchemaTable("storage_usage_snapshot");

    expect(provider.checks).toContainEqual({
      expression: enumExpression("provider_type", SDKWORK_STORAGE_PROVIDER_TYPES),
      name: "ck_object_provider_provider_type",
    });
    expect(bucket.checks).toContainEqual({
      expression: enumExpression("logical_scope", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      name: "ck_object_bucket_logical_scope",
    });
    expect(bucket.checks).toContainEqual({
      expression: enumExpression("default_storage_class", SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES),
      name: "ck_object_bucket_default_storage_class",
    });
    expect(bucket.checks).toContainEqual({
      expression: enumExpression("default_encryption_mode", SDKWORK_STORAGE_ENCRYPTION_MODES),
      name: "ck_object_bucket_default_encryption_mode",
    });
    expect(defaultBucketPolicy.checks).toContainEqual({
      expression: enumExpression("logical_scope", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES),
      name: "ck_storage_default_bucket_policy_logical_scope",
    });
    expect(driveSpace.checks).toContainEqual({
      expression: enumExpression("space_type", SDKWORK_DRIVE_SPACE_TYPES),
      name: "ck_drive_space_type",
    });
    expect(driveNode.checks).toContainEqual({
      expression: enumExpression("node_type", SDKWORK_DRIVE_NODE_TYPES),
      name: "ck_drive_node_type",
    });
    expect(quota.checks).toContainEqual({
      expression: enumExpression("scope_type", ["tenant", "organization", "user", "space", "app"]),
      name: "ck_storage_quota_policy_scope_type",
    });
    expect(usageCounter.checks).toContainEqual({
      expression: enumExpression("scope_type", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      name: "ck_storage_usage_counter_scope_type",
    });
    expect(usageSnapshot.checks).toContainEqual({
      expression: enumExpression("scope_type", SDKWORK_STORAGE_USAGE_SCOPE_TYPES),
      name: "ck_storage_usage_snapshot_scope_type",
    });

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("CONSTRAINT ck_object_provider_provider_type CHECK");
    expect(sql).toContain("CONSTRAINT ck_object_bucket_logical_scope CHECK");
    expect(sql).toContain("CONSTRAINT ck_object_bucket_default_storage_class CHECK");
    expect(sql).toContain("CONSTRAINT ck_object_bucket_default_encryption_mode CHECK");
    expect(sql).toContain("CONSTRAINT ck_storage_default_bucket_policy_logical_scope CHECK");
    expect(sql).toContain("CONSTRAINT ck_drive_space_type CHECK");
    expect(sql).toContain("CONSTRAINT ck_drive_node_type CHECK");
    expect(sql).toContain("CONSTRAINT ck_storage_quota_policy_scope_type CHECK");
    expect(sql).toContain("CONSTRAINT ck_storage_usage_counter_scope_type CHECK");
    expect(sql).toContain("CONSTRAINT ck_storage_usage_snapshot_scope_type CHECK");
  });

  it("enforces canonical status and visibility vocabularies in schema", () => {
    expect(getFileSchemaTable("object_provider").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_object_provider_status"),
      ]),
    );
    expect(getFileSchemaTable("object_bucket").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_object_bucket_status"),
      ]),
    );
    expect(getFileSchemaTable("storage_default_bucket_policy").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_storage_default_bucket_policy_status"),
      ]),
    );
    expect(getFileSchemaTable("drive_space").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_DRIVE_SPACE_STATUSES, "ck_drive_space_status"),
      ]),
    );
    expect(getFileSchemaTable("file_node").checks).toEqual(
      expect.arrayContaining([
        enumCheck("visibility", SDKWORK_FILE_VISIBILITIES, "ck_file_node_visibility"),
      ]),
    );
    expect(getFileSchemaTable("file_slot_definition").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_FILE_SLOT_STATUSES, "ck_file_slot_definition_status"),
      ]),
    );
    expect(getFileSchemaTable("file_binding").checks).toEqual(
      expect.arrayContaining([
        enumCheck("binding_state", SDKWORK_FILE_BINDING_STATES, "ck_file_binding_state"),
      ]),
    );
    expect(getFileSchemaTable("storage_quota_policy").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_storage_quota_policy_status"),
      ]),
    );
    expect(getFileSchemaTable("storage_quota_reservation").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES, "ck_storage_quota_reservation_status"),
      ]),
    );
    expect(getFileSchemaTable("storage_reconciliation_run").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_JOB_STATUSES, "ck_storage_reconciliation_run_status"),
      ]),
    );
    expect(getFileSchemaTable("storage_gc_job").checks).toEqual(
      expect.arrayContaining([
        enumCheck("status", SDKWORK_STORAGE_JOB_STATUSES, "ck_storage_gc_job_status"),
      ]),
    );

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("CONSTRAINT ck_file_node_visibility CHECK");
    expect(sql).toContain("CONSTRAINT ck_storage_gc_job_status CHECK");
  });

  it("enforces standard drive node tree invariants in schema", () => {
    const driveNode = getFileSchemaTable("drive_node");
    expect(driveNode.checks).toEqual(
      expect.arrayContaining([
        {
          expression: "((node_type = 'root' AND parent_node_id IS NULL AND depth = 0) OR (node_type <> 'root' AND parent_node_id IS NOT NULL AND depth > 0))",
          name: "ck_drive_node_tree_position",
        },
        {
          expression: "((node_type = 'file' AND file_id IS NOT NULL) OR (node_type <> 'file'))",
          name: "ck_drive_node_file_reference",
        },
        {
          expression: "(node_type NOT IN ('root', 'folder') OR file_id IS NULL)",
          name: "ck_drive_node_container_file_reference",
        },
      ]),
    );

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("CONSTRAINT ck_drive_node_tree_position CHECK");
    expect(sql).toContain("CONSTRAINT ck_drive_node_file_reference CHECK");
    expect(sql).toContain("CONSTRAINT ck_drive_node_container_file_reference CHECK");

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "drive_node"
        ? {
            ...table,
            checks: table.checks?.filter((check) => (
              typeof check === "string" || check.name !== "ck_drive_node_tree_position"
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_required_check:drive_node.ck_drive_node_tree_position",
    );
  });

  it("keeps storage usage ledger append-only and scope-indexed", () => {
    const ledger = getFileSchemaTable("storage_usage_ledger");
    expect(ledger.appendOnly).toBe(true);
    expect(ledger.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "organization_id",
        "user_id",
        "space_id",
        "app_id",
        "business_domain",
        "delta_logical_bytes",
        "delta_physical_bytes",
        "delta_billable_bytes",
        "delta_retained_bytes",
        "idempotency_key",
        "occurred_at",
      ]),
    );
    expect(ledger.columns.map((column) => column.name)).not.toContain("updated_at");
    expect(ledger.columns.map((column) => column.name)).not.toContain("deleted_at");

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("idx_storage_usage_ledger_scope_time");
    expect(sql).toContain("idx_storage_usage_ledger_user_time");
    expect(sql).toContain("idx_storage_usage_ledger_org_time");
    expect(sql).toContain("idx_storage_usage_ledger_app_time");
  });

  it("protects every append-only table from update, delete, and truncate mutations", () => {
    const appendOnlyTables = SDKWORK_FILE_SCHEMA_TABLES.filter((table) => table.appendOnly);
    expect(appendOnlyTables.map((table) => table.name)).toEqual([
      "storage_usage_ledger",
      "file_security_scan",
      "file_audit_log",
    ]);

    const sql = createPostgresFileSchemaMigration();
    for (const table of appendOnlyTables) {
      expect(sql).toContain(`DROP TRIGGER IF EXISTS trg_${table.name}_append_only_row_mutation ON ${table.name};`);
      expect(sql).toContain(`CREATE TRIGGER trg_${table.name}_append_only_row_mutation`);
      expect(sql).toContain(`BEFORE UPDATE OR DELETE ON ${table.name}`);
      expect(sql).toContain(`DROP TRIGGER IF EXISTS trg_${table.name}_append_only_truncate ON ${table.name};`);
      expect(sql).toContain(`CREATE TRIGGER trg_${table.name}_append_only_truncate`);
      expect(sql).toContain(`BEFORE TRUNCATE ON ${table.name}`);
      expect(sql).toContain("FOR EACH STATEMENT EXECUTE FUNCTION sdkwork_reject_append_only_mutation();");
    }
    expect(sql).toContain("cannot be updated, deleted, or truncated");
    expect(sql).not.toContain("CREATE TRIGGER trg_storage_usage_ledger_append_only\nBEFORE UPDATE OR DELETE");
  });

  it("models storage usage snapshots for historical tenant, organization, user, app, and space reporting", () => {
    const counter = getFileSchemaTable("storage_usage_counter");
    const snapshot = getFileSchemaTable("storage_usage_snapshot");
    expect(counter.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "scope_type",
        "scope_id",
        "organization_id",
        "user_id",
        "space_id",
        "app_id",
        "business_domain",
      ]),
    );
    expect(snapshot.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "scope_type",
        "scope_id",
        "organization_id",
        "user_id",
        "space_id",
        "app_id",
        "business_domain",
        "snapshot_type",
        "period_start_at",
        "period_end_at",
        "snapshot_at",
        "ledger_high_watermark_id",
        "used_logical_bytes",
        "used_physical_bytes",
        "used_billable_bytes",
        "retained_bytes",
        "trash_bytes",
        "variant_bytes",
        "file_count",
        "object_count",
        "version_count",
      ]),
    );
    expect(snapshot.checks).toEqual(
      expect.arrayContaining([
        "period_end_at > period_start_at",
        "used_logical_bytes >= 0",
        "used_physical_bytes >= 0",
        "used_billable_bytes >= 0",
      ]),
    );
    expect(counter.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ck_storage_usage_counter_scope_identity",
        }),
      ]),
    );
    expect(snapshot.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "ck_storage_usage_snapshot_scope_identity",
        }),
      ]),
    );
    expect(counter.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_usage_counter_business_domain",
      }),
    );
    expect(snapshot.indexes).toContainEqual(
      expect.objectContaining({
        name: "uq_storage_usage_snapshot_scope_period",
        unique: true,
      }),
    );
    expect(snapshot.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_usage_snapshot_scope_time",
      }),
    );
    expect(snapshot.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_usage_snapshot_business_domain_time",
      }),
    );

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_usage_counter"
        ? {
            ...table,
            checks: table.checks?.filter((check) => (
              typeof check === "string" || check.name !== "ck_storage_usage_counter_scope_identity"
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_required_check:storage_usage_counter.ck_storage_usage_counter_scope_identity",
    );
  });

  it("models storage reconciliation runs, findings, and garbage collection jobs", () => {
    const run = getFileSchemaTable("storage_reconciliation_run");
    expect(run.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "idempotency_key",
        "provider_id",
        "bucket_id",
        "run_type",
        "status",
        "dry_run",
        "started_at",
        "completed_at",
        "scanned_object_count",
        "matched_object_count",
        "missing_object_count",
        "orphan_object_count",
        "checksum_mismatch_count",
        "requested_by",
        "request_id",
      ]),
    );
    expect(run.checks).toEqual(
      expect.arrayContaining([
        "scanned_object_count >= 0",
        "matched_object_count >= 0",
        "missing_object_count >= 0",
        "orphan_object_count >= 0",
        "checksum_mismatch_count >= 0",
      ]),
    );
    expect(run.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_reconciliation_run_status",
      }),
    );
    expect(run.indexes).toContainEqual(
      expect.objectContaining({
        name: "uq_storage_reconciliation_run_idempotency",
        unique: true,
      }),
    );
    expect(run.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_reconciliation_run_request",
      }),
    );

    const item = getFileSchemaTable("storage_reconciliation_item");
    expect(item.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "run_id",
        "tenant_id",
        "object_blob_id",
        "provider_object_key",
        "issue_type",
        "severity",
        "resolution_status",
        "resolved_at",
      ]),
    );
    expect(item.foreignKeys).toContainEqual(
      expect.objectContaining({
        columns: ["tenant_id", "run_id"],
        name: "fk_storage_reconciliation_item_run_tenant",
        references: "storage_reconciliation_run(tenant_id, id)",
      }),
    );
    expect(item.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_storage_reconciliation_item_resolution",
      }),
    );

    const gcJob = getFileSchemaTable("storage_gc_job");
    expect(gcJob.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "job_type",
        "status",
        "dry_run",
        "requested_by",
        "idempotency_key",
        "candidate_count",
        "deleted_object_count",
        "released_bytes",
      ]),
    );
    expect(gcJob.indexes).toContainEqual(
      expect.objectContaining({
        name: "uq_storage_gc_job_idempotency",
        unique: true,
      }),
    );
    expect(gcJob.checks).toEqual(
      expect.arrayContaining([
        "candidate_count >= 0",
        "deleted_object_count >= 0",
        "released_bytes >= 0",
      ]),
    );
  });

  it("models quota reservation and active binding concurrency safely", () => {
    const quotaReservation = getFileSchemaTable("storage_quota_reservation");
    expect(quotaReservation.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(["idempotency_key", "reserved_bytes", "expires_at", "status", "released_at", "converted_at"]),
    );
    expect(quotaReservation.columns.map((column) => column.name)).not.toContain("upload_session_id");
    expect(quotaReservation.foreignKeys ?? []).not.toContainEqual(
      expect.objectContaining({
        name: "fk_storage_quota_reservation_upload_session_tenant",
      }),
    );
    expect(quotaReservation.checks).toContain("reserved_bytes >= 0");
    expect(quotaReservation.indexes).toContainEqual(
      expect.objectContaining({
        name: "uq_storage_quota_reservation_idempotency",
        unique: true,
      }),
    );

    const binding = getFileSchemaTable("file_binding");
    expect(binding.indexes).toContainEqual(
      expect.objectContaining({
        name: "uq_file_binding_active_file",
        unique: true,
      }),
    );
    expect(binding.indexes).toContainEqual(
      expect.objectContaining({
        name: "idx_file_binding_target_slot",
      }),
    );
  });

  it("avoids PostgreSQL nullable uniqueness gaps on storage objects and drive names", () => {
    const objectBlob = getFileSchemaTable("object_blob");
    expect(objectBlob.columns).toContainEqual({
      default: "''",
      name: "object_version_id",
      type: "text",
    });
    expect(objectBlob.uniques).toContainEqual({
      columns: ["tenant_id", "provider_id", "bucket_id", "object_key", "object_version_id"],
      name: "uq_object_blob_provider_bucket_key_version",
    });

    const driveNode = getFileSchemaTable("drive_node");
    expect(driveNode.indexes).toContainEqual({
      columns: ["tenant_id", "space_id", "COALESCE(parent_node_id, 0)", "normalized_name"],
      name: "uq_drive_node_active_name",
      predicate: "deleted_at IS NULL AND trashed_at IS NULL",
      unique: true,
    });

    const driftedUniqueTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? {
            ...table,
            columns: table.columns.map((column) => (
              column.name === "object_version_id"
                ? { ...column, default: undefined, nullable: true }
                : column
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedUniqueTables)).toContain(
      "nullable_unique_column:object_blob.uq_object_blob_provider_bucket_key_version.object_version_id",
    );

    const driftedIndexTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "drive_node"
        ? {
            ...table,
            indexes: table.indexes?.map((index) => (
              index.name === "uq_drive_node_active_name"
                ? { ...index, columns: ["tenant_id", "space_id", "parent_node_id", "normalized_name"] }
                : index
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedIndexTables)).toContain(
      "nullable_unique_index_column:drive_node.uq_drive_node_active_name.parent_node_id",
    );
  });

  it("does not define durable presigned URL, bucket URL, or public object URL columns", () => {
    const sql = createPostgresFileSchemaMigration().toLowerCase();
    expect(sql).not.toContain("presigned_url");
    expect(sql).not.toContain("signed_url");
    expect(sql).not.toContain("public_url");
    expect(sql).not.toContain("s3_url");
    expect(sql).not.toContain("create table if not exists upload_session");
    expect(sql).not.toContain("create table if not exists upload_presign_grant");
    expect(sql).not.toContain("create table if not exists upload_part");
    expect(sql).not.toContain("create table if not exists upload_completion_attempt");
    expect(sql).not.toContain("upload_session_id");
    expect(sql).not.toContain("idx_upload_session");
    expect(sql).not.toContain("idx_upload_part");

    const violations = validateFileSchemaStandard();
    expect(violations).toEqual([]);
  });

  it("models default storage routing as tenant-scoped logical bucket policies", () => {
    const policy = getFileSchemaTable("storage_default_bucket_policy");

    expect(policy.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "tenant_id",
        "logical_scope",
        "bucket_id",
        "bucket_logical_scope",
        "status",
        "updated_by",
        "request_id",
        "reason",
      ]),
    );
    expect(policy.uniques).toContainEqual({
      columns: ["tenant_id", "logical_scope"],
      name: "uq_storage_default_bucket_policy_scope",
    });
    expect(policy.indexes).toContainEqual({
      columns: ["tenant_id", "bucket_id", "bucket_logical_scope", "status", "id"],
      name: "idx_storage_default_bucket_policy_bucket",
    });
    expect(policy.foreignKeys).toContainEqual({
      columns: ["tenant_id", "bucket_id", "bucket_logical_scope"],
      name: "fk_storage_default_bucket_policy_bucket_tenant",
      references: "object_bucket(tenant_id, id, logical_scope)",
    });
    expect(policy.checks).toContainEqual({
      expression: "logical_scope = bucket_logical_scope",
      name: "ck_storage_default_bucket_policy_scope_match",
    });
    expect(policy.tenantIsolation).toEqual({
      policyName: "pol_storage_default_bucket_policy_tenant_isolation",
      tenantColumn: "tenant_id",
    });

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("ALTER TABLE storage_default_bucket_policy ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_storage_default_bucket_policy_bucket");
    expect(sql).toContain("CONSTRAINT ck_storage_default_bucket_policy_scope_match CHECK (logical_scope = bucket_logical_scope)");
  });

  it("generates PostgreSQL tenant context and row-level security policies for tenant-scoped tables", () => {
    const sql = createPostgresFileSchemaMigration();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION sdkwork_current_tenant_id()");
    expect(sql).toContain("current_setting('sdkwork.tenant_id', true)");
    expect(sql).toContain("ALTER TABLE object_blob ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE object_blob FORCE ROW LEVEL SECURITY;");
    expect(sql).toContain("CREATE POLICY pol_object_blob_tenant_isolation ON object_blob");
    expect(sql).toContain("USING (tenant_id = sdkwork_current_tenant_id())");
    expect(sql).toContain("WITH CHECK (tenant_id = sdkwork_current_tenant_id())");

    for (const table of SDKWORK_FILE_SCHEMA_TABLES) {
      if (table.columns.some((column) => column.name === "tenant_id")) {
        expect(sql).toContain(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`);
        expect(sql).toContain(`ALTER TABLE ${table.name} FORCE ROW LEVEL SECURITY;`);
        expect(sql).toContain(`CREATE POLICY pol_${table.name}_tenant_isolation ON ${table.name}`);
      }
    }
  });

  it("reports missing row-level security policies during standard validation", () => {
    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? { ...table, tenantIsolation: undefined }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_tenant_isolation_policy:object_blob",
    );
  });

  it("requires tenant-isolated tables to use non-null tenant identifiers", () => {
    for (const table of SDKWORK_FILE_SCHEMA_TABLES) {
      const tenantId = table.columns.find((column) => column.name === "tenant_id");
      if (table.tenantIsolation) {
        expect(tenantId?.nullable).not.toBe(true);
      }
    }

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? {
            ...table,
            columns: table.columns.map((column) => (
              column.name === "tenant_id"
                ? { ...column, nullable: true }
                : column
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "nullable_tenant_isolation_column:object_blob.tenant_id",
    );
  });

  it("reports missing required schema checks during standard validation", () => {
    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_quota_reservation"
        ? { ...table, checks: [] }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_required_check:storage_quota_reservation.ck_storage_quota_reservation_status",
    );
  });

  it("reports missing required schema indexes during standard validation", () => {
    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_usage_ledger"
        ? {
            ...table,
            indexes: table.indexes?.filter((index) => index.name !== "idx_storage_usage_ledger_org_time"),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_required_index:storage_usage_ledger.idx_storage_usage_ledger_org_time",
    );
  });

  it("reports drifted required schema index definitions during standard validation", () => {
    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_usage_counter"
        ? {
            ...table,
            indexes: table.indexes?.map((index) => (
              index.name === "uq_storage_usage_counter_scope"
                ? { ...index, columns: ["tenant_id", "scope_type"] }
                : index
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "drifted_required_index:storage_usage_counter.uq_storage_usage_counter_scope",
    );
  });

  it("requires every tenant-scoped table to expose a tenant-leading access path", () => {
    const objectTag = getFileSchemaTable("object_tag");
    expect(objectTag.indexes).toContainEqual({
      columns: ["tenant_id", "object_blob_id", "tag_key"],
      name: "idx_object_tag_tenant_blob",
    });

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? {
            ...table,
            indexes: table.indexes?.filter((index) => ![
              "idx_object_blob_owner_state",
              "idx_object_blob_checksum",
              "idx_object_blob_storage_location",
              "idx_object_blob_bucket",
              "idx_object_blob_gc",
            ].includes(index.name)),
            uniques: [],
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_tenant_access_path:object_blob",
    );
  });

  it("requires every secondary index on tenant-scoped tables to be tenant-leading", () => {
    const nonTenantLeadingIndexes = SDKWORK_FILE_SCHEMA_TABLES.flatMap((table) => {
      if (!table.columns.some((column) => column.name === "tenant_id")) {
        return [];
      }

      return (table.indexes ?? [])
        .filter((index) => index.columns[0] !== "tenant_id")
        .map((index) => `${table.name}.${index.name}`);
    });

    expect(nonTenantLeadingIndexes).toEqual([]);

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_gc_job"
        ? {
            ...table,
            indexes: table.indexes?.map((index) => (
              index.name === "idx_storage_gc_job_status"
                ? { ...index, columns: ["status", "created_at", "id"] }
                : index
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "tenant_index_not_tenant_leading:storage_gc_job.idx_storage_gc_job_status",
    );
  });

  it("backs every foreign key with a child-table index or unique constraint prefix", () => {
    const unsupportedForeignKeys = SDKWORK_FILE_SCHEMA_TABLES.flatMap((table) => (
      schemaForeignKeys(table)
        .filter((foreignKey) => !hasSupportingAccessPath(table, foreignKey.columns))
        .map((foreignKey) => `${table.name}.${foreignKey.name}`)
    ));

    expect(unsupportedForeignKeys).toEqual([]);

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "file_metadata_common"
        ? {
            ...table,
            indexes: table.indexes?.filter((index) => index.name !== "idx_file_metadata_common_tenant_file"),
            uniques: table.uniques?.filter((unique) => unique.name !== "uq_file_metadata_common_file"),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_foreign_key_supporting_index:file_metadata_common.fk_file_metadata_common_file_tenant",
    );
  });

  it("requires tenant-scoped unique constraints and unique indexes to be tenant-leading", () => {
    const nonTenantLeadingUniqueAccessPaths = SDKWORK_FILE_SCHEMA_TABLES.flatMap((table) => {
      if (!table.columns.some((column) => column.name === "tenant_id")) {
        return [];
      }

      const uniqueConstraints = (table.uniques ?? []).map((unique) => ({
        columns: unique.columns,
        name: unique.name,
      }));
      const uniqueIndexes = (table.indexes ?? [])
        .filter((index) => index.unique)
        .map((index) => ({
          columns: index.columns,
          name: index.name,
        }));

      return [...uniqueConstraints, ...uniqueIndexes]
        .filter((accessPath) => accessPath.columns[0] !== "tenant_id")
        .map((accessPath) => `${table.name}.${accessPath.name}`);
    });

    expect(nonTenantLeadingUniqueAccessPaths).toEqual([]);

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "storage_usage_counter"
        ? {
            ...table,
            indexes: table.indexes?.map((index) => (
              index.name === "uq_storage_usage_counter_scope"
                ? { ...index, columns: ["scope_type", "scope_id"] }
                : index
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "tenant_unique_index_not_tenant_leading:storage_usage_counter.uq_storage_usage_counter_scope",
    );
  });

  it("uses named tenant-scoped UUID uniqueness instead of global column-level unique indexes", () => {
    for (const table of SDKWORK_FILE_SCHEMA_TABLES) {
      const uuidColumn = table.columns.find((column) => column.name === "uuid");
      expect(uuidColumn).toEqual(expect.objectContaining({
        default: "gen_random_uuid()",
        name: "uuid",
        type: "uuid",
      }));
      expect(uuidColumn?.unique).not.toBe(true);

      if (table.columns.some((column) => column.name === "tenant_id")) {
        expect(table.uniques).toContainEqual({
          columns: ["tenant_id", "uuid"],
          name: `uq_${table.name}_tenant_uuid`,
        });
      } else {
        expect(table.uniques).toContainEqual({
          columns: ["uuid"],
          name: `uq_${table.name}_uuid`,
        });
      }
    }

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? {
            ...table,
            columns: table.columns.map((column) => (
              column.name === "uuid"
                ? { ...column, unique: true }
                : column
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "tenant_column_unique_not_tenant_leading:object_blob.uuid",
    );
  });

  it("denormalizes tenant id onto file child tables for direct row-level security", () => {
    const requiredTenantScopedTables = [
      "object_tag",
      "file_version",
      "file_metadata_common",
      "file_binding",
    ];

    for (const tableName of requiredTenantScopedTables) {
      const table = getFileSchemaTable(tableName);
      expect(table.columns.map((column) => column.name)).toContain("tenant_id");
      expect(table.indexes ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            columns: expect.arrayContaining(["tenant_id"]),
          }),
        ]),
      );
      expect(table.tenantIsolation).toEqual({
        policyName: `pol_${tableName}_tenant_isolation`,
        tenantColumn: "tenant_id",
      });
    }

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain("ALTER TABLE object_tag ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE file_version ENABLE ROW LEVEL SECURITY;");
  });

  it("enforces tenant-consistent foreign keys on tenant-scoped child tables", () => {
    expect(getFileSchemaTable("object_provider").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_object_provider_tenant_id",
    });
    expect(getFileSchemaTable("object_bucket").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_object_bucket_tenant_id",
    });
    expect(getFileSchemaTable("object_bucket").uniques).toContainEqual({
      columns: ["tenant_id", "id", "logical_scope"],
      name: "uq_object_bucket_tenant_id_scope",
    });
    expect(getFileSchemaTable("storage_default_bucket_policy").foreignKeys).toContainEqual({
      columns: ["tenant_id", "bucket_id", "bucket_logical_scope"],
      name: "fk_storage_default_bucket_policy_bucket_tenant",
      references: "object_bucket(tenant_id, id, logical_scope)",
    });
    expect(getFileSchemaTable("object_blob").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_object_blob_tenant_id",
    });
    expect(getFileSchemaTable("file_node").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_file_node_tenant_id",
    });
    expect(getFileSchemaTable("file_version").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_file_version_tenant_id",
    });
    expect(getFileSchemaTable("drive_space").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_drive_space_tenant_id",
    });
    expect(getFileSchemaTable("drive_node").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_drive_node_tenant_id",
    });
    expect(getFileSchemaTable("storage_reconciliation_run").uniques).toContainEqual({
      columns: ["tenant_id", "id"],
      name: "uq_storage_reconciliation_run_tenant_id",
    });

    expect(getFileSchemaTable("object_bucket").foreignKeys).toContainEqual({
      columns: ["tenant_id", "provider_id"],
      name: "fk_object_bucket_provider_tenant",
      references: "object_provider(tenant_id, id)",
    });
    expect(getFileSchemaTable("object_blob").foreignKeys).toContainEqual({
      columns: ["tenant_id", "provider_id"],
      name: "fk_object_blob_provider_tenant",
      references: "object_provider(tenant_id, id)",
    });
    expect(getFileSchemaTable("object_blob").foreignKeys).toContainEqual({
      columns: ["tenant_id", "bucket_id"],
      name: "fk_object_blob_bucket_tenant",
      references: "object_bucket(tenant_id, id)",
    });
    expect(getFileSchemaTable("object_tag").foreignKeys).toContainEqual({
      columns: ["tenant_id", "object_blob_id"],
      name: "fk_object_tag_blob_tenant",
      references: "object_blob(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_version").foreignKeys).toContainEqual({
      columns: ["tenant_id", "file_id"],
      name: "fk_file_version_file_tenant",
      references: "file_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_version").foreignKeys).toContainEqual({
      columns: ["tenant_id", "object_blob_id"],
      name: "fk_file_version_object_tenant",
      references: "object_blob(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_version").indexes).toContainEqual({
      columns: ["tenant_id", "file_id"],
      name: "uq_file_version_current",
      predicate: "is_current = true",
      unique: true,
    });
    expect(getFileSchemaTable("file_metadata_common").foreignKeys).toContainEqual({
      columns: ["tenant_id", "file_id"],
      name: "fk_file_metadata_common_file_tenant",
      references: "file_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("drive_node").foreignKeys).toContainEqual({
      columns: ["tenant_id", "space_id"],
      name: "fk_drive_node_space_tenant",
      references: "drive_space(tenant_id, id)",
    });
    expect(getFileSchemaTable("drive_node").foreignKeys).toContainEqual({
      columns: ["tenant_id", "file_id"],
      name: "fk_drive_node_file_tenant",
      references: "file_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("drive_node").foreignKeys).toContainEqual({
      columns: ["tenant_id", "parent_node_id"],
      name: "fk_drive_node_parent_tenant",
      references: "drive_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_binding").foreignKeys).toContainEqual({
      columns: ["tenant_id", "file_id"],
      name: "fk_file_binding_file_tenant",
      references: "file_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_binding").foreignKeys).toContainEqual({
      columns: ["tenant_id", "version_id"],
      name: "fk_file_binding_version_tenant",
      references: "file_version(tenant_id, id)",
    });
    expect(getFileSchemaTable("file_binding").foreignKeys).toContainEqual({
      columns: ["tenant_id", "node_id"],
      name: "fk_file_binding_node_tenant",
      references: "drive_node(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_run").foreignKeys).toContainEqual({
      columns: ["tenant_id", "provider_id"],
      name: "fk_storage_reconciliation_run_provider_tenant",
      references: "object_provider(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_run").foreignKeys).toContainEqual({
      columns: ["tenant_id", "bucket_id"],
      name: "fk_storage_reconciliation_run_bucket_tenant",
      references: "object_bucket(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_item").foreignKeys).toContainEqual({
      columns: ["tenant_id", "run_id"],
      name: "fk_storage_reconciliation_item_run_tenant",
      references: "storage_reconciliation_run(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_item").foreignKeys).toContainEqual({
      columns: ["tenant_id", "object_blob_id"],
      name: "fk_storage_reconciliation_item_blob_tenant",
      references: "object_blob(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_item").foreignKeys).toContainEqual({
      columns: ["tenant_id", "provider_id"],
      name: "fk_storage_reconciliation_item_provider_tenant",
      references: "object_provider(tenant_id, id)",
    });
    expect(getFileSchemaTable("storage_reconciliation_item").foreignKeys).toContainEqual({
      columns: ["tenant_id", "bucket_id"],
      name: "fk_storage_reconciliation_item_bucket_tenant",
      references: "object_bucket(tenant_id, id)",
    });

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "file_metadata_common"
        ? {
            ...table,
            foreignKeys: table.foreignKeys?.filter((foreignKey) => foreignKey.name !== "fk_file_metadata_common_file_tenant"),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_tenant_consistent_foreign_key:file_metadata_common.fk_file_metadata_common_file_tenant",
    );

    const wrongReferenceTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "file_version"
        ? {
            ...table,
            foreignKeys: table.foreignKeys?.map((foreignKey) => (
              foreignKey.name === "fk_file_version_file_tenant"
                ? { ...foreignKey, references: "file_node(id)" }
                : foreignKey
            )),
          }
        : table
    ));

    expect(validateFileSchemaStandard(wrongReferenceTables)).toContain(
      "drifted_tenant_consistent_foreign_key:file_version.fk_file_version_file_tenant",
    );

    const missingParentTenantKeyTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_blob"
        ? {
            ...table,
            uniques: table.uniques?.filter((unique) => unique.name !== "uq_object_blob_tenant_id"),
          }
        : table
    ));

    expect(validateFileSchemaStandard(missingParentTenantKeyTables)).toContain(
      "missing_tenant_parent_unique:object_blob.uq_object_blob_tenant_id",
    );
  });

  it("generates post-create tenant-consistent foreign keys for cyclic file and drive pointers", () => {
    expect(getFileSchemaTable("file_node").postCreateForeignKeys).toContainEqual({
      columns: ["tenant_id", "current_version_id"],
      name: "fk_file_node_current_version_tenant",
      references: "file_version(tenant_id, id)",
    });
    expect(getFileSchemaTable("drive_space").postCreateForeignKeys).toContainEqual({
      columns: ["tenant_id", "root_node_id"],
      name: "fk_drive_space_root_node_tenant",
      references: "drive_node(tenant_id, id)",
    });

    const sql = createPostgresFileSchemaMigration();
    expect(sql).toContain(
      "ALTER TABLE file_node ADD CONSTRAINT fk_file_node_current_version_tenant FOREIGN KEY (tenant_id, current_version_id) REFERENCES file_version(tenant_id, id);",
    );
    expect(sql).toContain(
      "ALTER TABLE drive_space ADD CONSTRAINT fk_drive_space_root_node_tenant FOREIGN KEY (tenant_id, root_node_id) REFERENCES drive_node(tenant_id, id);",
    );

    const createFileNodePosition = sql.indexOf("CREATE TABLE IF NOT EXISTS file_node");
    const createFileVersionPosition = sql.indexOf("CREATE TABLE IF NOT EXISTS file_version");
    const lateFileNodeFkPosition = sql.indexOf("ALTER TABLE file_node ADD CONSTRAINT fk_file_node_current_version_tenant");
    expect(lateFileNodeFkPosition).toBeGreaterThan(createFileNodePosition);
    expect(lateFileNodeFkPosition).toBeGreaterThan(createFileVersionPosition);

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "drive_space"
        ? {
            ...table,
            postCreateForeignKeys: table.postCreateForeignKeys?.filter(
              (foreignKey) => foreignKey.name !== "fk_drive_space_root_node_tenant",
            ),
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "missing_tenant_consistent_foreign_key:drive_space.fk_drive_space_root_node_tenant",
    );
  });

  it("rejects single-column foreign keys to tenant-scoped parent tables", () => {
    const sql = createPostgresFileSchemaMigration();
    expect(sql).not.toContain("REFERENCES object_blob(id)");
    expect(sql).not.toContain("REFERENCES object_provider(id)");
    expect(sql).not.toContain("REFERENCES object_bucket(id)");
    expect(sql).not.toContain("REFERENCES upload_session(id)");
    expect(sql).not.toContain("REFERENCES file_node(id)");
    expect(sql).not.toContain("REFERENCES file_version(id)");
    expect(sql).not.toContain("REFERENCES drive_space(id)");
    expect(sql).not.toContain("REFERENCES drive_node(id)");
    expect(sql).not.toContain("REFERENCES storage_reconciliation_run(id)");

    const driftedTables = SDKWORK_FILE_SCHEMA_TABLES.map((table) => (
      table.name === "object_tag"
        ? {
            ...table,
            foreignKeys: [
              ...(table.foreignKeys ?? []),
              {
                columns: ["object_blob_id"],
                name: "fk_object_tag_blob",
                references: "object_blob(id)",
              },
            ],
          }
        : table
    ));

    expect(validateFileSchemaStandard(driftedTables)).toContain(
      "tenant_inconsistent_foreign_key:object_tag.fk_object_tag_blob",
    );
  });
});

function enumExpression(column: string, values: readonly string[]): string {
  return `${column} IN (${values.map((value) => `'${value}'`).join(", ")})`;
}

function enumCheck(column: string, values: readonly string[], name: string): { expression: string; name: string } {
  return {
    expression: enumExpression(column, values),
    name,
  };
}

function schemaForeignKeys(
  table: (typeof SDKWORK_FILE_SCHEMA_TABLES)[number],
): Array<{ columns: string[]; name: string; references: string }> {
  return [
    ...(table.foreignKeys ?? []),
    ...(table.postCreateForeignKeys ?? []),
  ];
}

function hasSupportingAccessPath(table: (typeof SDKWORK_FILE_SCHEMA_TABLES)[number], columns: readonly string[]): boolean {
  const indexes = table.indexes ?? [];
  const uniques = (table.uniques ?? []).map((unique) => ({
    columns: unique.columns,
    name: unique.name,
  }));

  return [...indexes, ...uniques].some((accessPath) => (
    columns.every((column, index) => accessPath.columns[index] === column)
  ));
}
