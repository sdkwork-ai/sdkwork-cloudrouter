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

export const SDKWORK_FILE_SCHEMA_VERSION = "2026.05.file-platform.v1";

export interface FileSchemaColumn {
  default?: string;
  name: string;
  nullable?: boolean;
  primaryKey?: boolean;
  type: string;
  unique?: boolean;
}

export interface FileSchemaIndex {
  columns: string[];
  name: string;
  predicate?: string;
  unique?: boolean;
}

export interface FileSchemaForeignKey {
  columns: string[];
  name: string;
  references: string;
}

export type FileSchemaCheck = string | { expression: string; name: string };

export interface FileSchemaTenantIsolation {
  policyName: string;
  tenantColumn: string;
}

export interface FileSchemaTable {
  appendOnly?: boolean;
  checks?: FileSchemaCheck[];
  columns: FileSchemaColumn[];
  foreignKeys?: FileSchemaForeignKey[];
  indexes?: FileSchemaIndex[];
  name: string;
  postCreateForeignKeys?: FileSchemaForeignKey[];
  tenantIsolation?: FileSchemaTenantIsolation;
  uniques?: Array<{ columns: string[]; name: string }>;
}

const baseColumns = (): FileSchemaColumn[] => [
  { name: "id", primaryKey: true, type: "bigserial" },
  { default: "gen_random_uuid()", name: "uuid", type: "uuid" },
  { default: "now()", name: "created_at", type: "timestamptz" },
  { default: "now()", name: "updated_at", type: "timestamptz" },
];

const appendOnlyBaseColumns = (): FileSchemaColumn[] => [
  { name: "id", primaryKey: true, type: "bigserial" },
  { default: "gen_random_uuid()", name: "uuid", type: "uuid" },
  { default: "now()", name: "created_at", type: "timestamptz" },
];

const tenantColumn: FileSchemaColumn = { name: "tenant_id", type: "text" };

export const SDKWORK_FILE_SCHEMA_TABLES: readonly FileSchemaTable[] = [
  table(SDKWORK_FILE_TABLES.objectProvider, [
    tenantColumn,
    text("provider_code"),
    text("provider_type"),
    nullableText("endpoint_url"),
    nullableText("region"),
    text("credential_ref"),
    booleanColumn("path_style_enabled", "false"),
    booleanColumn("supports_multipart", "true"),
    booleanColumn("supports_object_lock", "false"),
    booleanColumn("supports_lifecycle", "false"),
    text("status", "'active'"),
    text("health_status", "'unknown'"),
    nullableTimestamp("last_health_check_at"),
  ], {
    checks: [
      enumCheck("provider_type", SDKWORK_STORAGE_PROVIDER_TYPES, "ck_object_provider_provider_type"),
      enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_object_provider_status"),
    ],
    indexes: [idx("idx_object_provider_tenant_status", ["tenant_id", "status", "id"])],
    uniques: [
      { columns: ["tenant_id", "id"], name: "uq_object_provider_tenant_id" },
      { columns: ["tenant_id", "provider_code"], name: "uq_object_provider_tenant_code" },
    ],
  }),

  table(SDKWORK_FILE_TABLES.objectBucket, [
    tenantColumn,
    bigint("provider_id"),
    text("bucket_name"),
    nullableText("bucket_region"),
    text("logical_scope"),
    nullableText("data_residency_region"),
    text("object_key_prefix", "''"),
    text("default_storage_class", "'STANDARD'"),
    text("default_encryption_mode", "'sse_s3'"),
    nullableText("kms_key_ref"),
    booleanColumn("versioning_enabled", "false"),
    booleanColumn("object_lock_enabled", "false"),
    booleanColumn("lifecycle_enabled", "false"),
    booleanColumn("public_access_blocked", "true"),
    text("status", "'active'"),
  ], {
    checks: [
      enumCheck("logical_scope", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES, "ck_object_bucket_logical_scope"),
      enumCheck("default_storage_class", SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES, "ck_object_bucket_default_storage_class"),
      enumCheck("default_encryption_mode", SDKWORK_STORAGE_ENCRYPTION_MODES, "ck_object_bucket_default_encryption_mode"),
      enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_object_bucket_status"),
    ],
    foreignKeys: [fk("fk_object_bucket_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)")],
    indexes: [
      idx("idx_object_bucket_tenant_scope", ["tenant_id", "logical_scope", "status", "id"]),
      idx("idx_object_bucket_tenant_provider", ["tenant_id", "provider_id", "status", "id"]),
    ],
    uniques: [
      { columns: ["tenant_id", "id"], name: "uq_object_bucket_tenant_id" },
      { columns: ["tenant_id", "id", "logical_scope"], name: "uq_object_bucket_tenant_id_scope" },
      { columns: ["tenant_id", "provider_id", "bucket_name"], name: "uq_object_bucket_provider_name" },
    ],
  }),

  table(SDKWORK_FILE_TABLES.storageDefaultBucketPolicy, [
    tenantColumn,
    text("logical_scope"),
    bigint("bucket_id"),
    text("bucket_logical_scope"),
    text("status", "'active'"),
    text("updated_by"),
    text("request_id"),
    nullableText("reason"),
  ], {
    checks: [
      enumCheck("logical_scope", SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES, "ck_storage_default_bucket_policy_logical_scope"),
      {
        expression: "logical_scope = bucket_logical_scope",
        name: "ck_storage_default_bucket_policy_scope_match",
      },
      enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_storage_default_bucket_policy_status"),
    ],
    foreignKeys: [
      fk(
        "fk_storage_default_bucket_policy_bucket_tenant",
        ["tenant_id", "bucket_id", "bucket_logical_scope"],
        "object_bucket(tenant_id, id, logical_scope)",
      ),
    ],
    indexes: [
      idx("idx_storage_default_bucket_policy_bucket", ["tenant_id", "bucket_id", "bucket_logical_scope", "status", "id"]),
    ],
    uniques: [
      { columns: ["tenant_id", "logical_scope"], name: "uq_storage_default_bucket_policy_scope" },
    ],
  }),

  table(SDKWORK_FILE_TABLES.objectBlob, [
    tenantColumn,
    nullableText("organization_id"),
    nullableText("owner_user_id"),
    bigint("provider_id"),
    bigint("bucket_id"),
    text("object_key"),
    text("object_version_id", "''"),
    text("object_uri"),
    bigint("size_bytes"),
    text("content_type"),
    nullableText("content_encoding"),
    nullableText("content_disposition"),
    text("checksum_algorithm"),
    nullableText("checksum_sha256"),
    nullableText("checksum_crc32"),
    nullableText("checksum_crc32c"),
    nullableText("checksum_crc64nvme"),
    nullableText("etag"),
    nullableText("multipart_upload_id"),
    integer("multipart_part_count", "0"),
    text("storage_class", "'STANDARD'"),
    text("encryption_mode", "'sse_s3'"),
    nullableText("kms_key_ref"),
    text("object_state", "'pending'"),
    text("quarantine_state", "'none'"),
    nullableText("retention_mode"),
    nullableTimestamp("retain_until_at"),
    booleanColumn("legal_hold_enabled", "false"),
    nullableTimestamp("uploaded_at"),
    nullableTimestamp("verified_at"),
    nullableTimestamp("deleted_at"),
  ], {
    checks: ["size_bytes >= 0", "multipart_part_count >= 0"],
    foreignKeys: [
      fk("fk_object_blob_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
      fk("fk_object_blob_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_object_blob_owner_state", ["tenant_id", "organization_id", "owner_user_id", "object_state", "created_at", "id"]),
      idx("idx_object_blob_storage_location", ["tenant_id", "provider_id", "bucket_id", "object_state", "id"]),
      idx("idx_object_blob_bucket", ["tenant_id", "bucket_id", "object_state", "id"]),
      idx("idx_object_blob_checksum", ["tenant_id", "checksum_sha256", "size_bytes"]),
      idx("idx_object_blob_gc", ["tenant_id", "object_state", "deleted_at", "id"]),
    ],
    uniques: [
      { columns: ["tenant_id", "id"], name: "uq_object_blob_tenant_id" },
      { columns: ["tenant_id", "provider_id", "bucket_id", "object_key", "object_version_id"], name: "uq_object_blob_provider_bucket_key_version" },
    ],
  }),

  table(SDKWORK_FILE_TABLES.objectTag, [
    tenantColumn,
    bigint("object_blob_id"),
    text("tag_key"),
    text("tag_value"),
  ], {
    foreignKeys: [fk("fk_object_tag_blob_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)")],
    indexes: [idx("idx_object_tag_tenant_blob", ["tenant_id", "object_blob_id", "tag_key"])],
    uniques: [{ columns: ["tenant_id", "object_blob_id", "tag_key"], name: "uq_object_tag_blob_key" }],
  }),

  table(SDKWORK_FILE_TABLES.fileNode, [
    tenantColumn,
    nullableText("organization_id"),
    nullableText("owner_user_id"),
    text("file_kind", "'file'"),
    text("name"),
    text("normalized_name"),
    nullableText("extension"),
    text("mime_type"),
    text("media_type"),
    nullableBigint("current_version_id"),
    text("file_state", "'active'"),
    text("visibility", "'private'"),
    text("classification", "'internal'"),
    nullableTimestamp("deleted_at"),
  ], {
    checks: [
      enumCheck("visibility", SDKWORK_FILE_VISIBILITIES, "ck_file_node_visibility"),
    ],
    indexes: [
      idx("idx_file_node_owner_state", ["tenant_id", "organization_id", "owner_user_id", "file_state", "created_at", "id"]),
      idx("idx_file_node_name", ["tenant_id", "normalized_name", "id"]),
      idx("idx_file_node_current_version", ["tenant_id", "current_version_id"]),
    ],
    postCreateForeignKeys: [
      fk("fk_file_node_current_version_tenant", ["tenant_id", "current_version_id"], "file_version(tenant_id, id)"),
    ],
    uniques: [{ columns: ["tenant_id", "id"], name: "uq_file_node_tenant_id" }],
  }),

  table(SDKWORK_FILE_TABLES.fileVersion, [
    tenantColumn,
    bigint("file_id"),
    integer("version_no"),
    nullableText("version_label"),
    bigint("object_blob_id"),
    bigint("size_bytes"),
    text("checksum_algorithm"),
    text("checksum_value"),
    text("content_type"),
    text("created_by"),
    text("version_state", "'active'"),
    booleanColumn("is_current", "false"),
    nullableText("change_summary"),
    nullableText("retention_mode"),
    nullableTimestamp("retain_until_at"),
    booleanColumn("legal_hold_enabled", "false"),
    nullableTimestamp("deleted_at"),
  ], {
    checks: ["version_no >= 1", "size_bytes >= 0"],
    foreignKeys: [
      fk("fk_file_version_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
      fk("fk_file_version_object_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_file_version_tenant_file", ["tenant_id", "file_id", "version_no"]),
      idx("idx_file_version_tenant_object", ["tenant_id", "object_blob_id"]),
      idx("uq_file_version_current", ["tenant_id", "file_id"], "is_current = true", true),
    ],
    uniques: [
      { columns: ["tenant_id", "id"], name: "uq_file_version_tenant_id" },
      { columns: ["tenant_id", "file_id", "version_no"], name: "uq_file_version_file_no" },
    ],
  }),

  table(SDKWORK_FILE_TABLES.fileMetadataCommon, [
    tenantColumn,
    bigint("file_id"),
    nullableText("title"),
    nullableText("description"),
    jsonb("metadata_json"),
  ], {
    foreignKeys: [fk("fk_file_metadata_common_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)")],
    indexes: [idx("idx_file_metadata_common_tenant_file", ["tenant_id", "file_id"])],
    uniques: [{ columns: ["tenant_id", "file_id"], name: "uq_file_metadata_common_file" }],
  }),

  table(SDKWORK_FILE_TABLES.driveSpace, [
    tenantColumn,
    nullableText("organization_id"),
    text("space_type"),
    nullableText("owner_user_id"),
    nullableText("owner_group_id"),
    nullableText("app_id"),
    text("name"),
    nullableBigint("root_node_id"),
    nullableBigint("quota_policy_id"),
    nullableBigint("default_permission_policy_id"),
    text("status", "'active'"),
  ], {
    checks: [
      enumCheck("space_type", SDKWORK_DRIVE_SPACE_TYPES, "ck_drive_space_type"),
      enumCheck("status", SDKWORK_DRIVE_SPACE_STATUSES, "ck_drive_space_status"),
    ],
    indexes: [
      idx("idx_drive_space_owner", ["tenant_id", "organization_id", "space_type", "owner_user_id", "status", "id"]),
      idx("idx_drive_space_root_node", ["tenant_id", "root_node_id"]),
    ],
    postCreateForeignKeys: [
      fk("fk_drive_space_root_node_tenant", ["tenant_id", "root_node_id"], "drive_node(tenant_id, id)"),
    ],
    uniques: [{ columns: ["tenant_id", "id"], name: "uq_drive_space_tenant_id" }],
  }),

  table(SDKWORK_FILE_TABLES.driveNode, [
    tenantColumn,
    nullableText("organization_id"),
    bigint("space_id"),
    nullableBigint("parent_node_id"),
    nullableBigint("file_id"),
    text("node_type"),
    text("name"),
    text("normalized_name"),
    text("path_segment"),
    text("path_hash"),
    nullableText("materialized_path"),
    integer("depth", "0"),
    text("sort_key"),
    booleanColumn("inherit_permission", "true"),
    nullableText("permission_fingerprint"),
    nullableTimestamp("trashed_at"),
    nullableText("trashed_by"),
    nullableTimestamp("deleted_at"),
  ], {
    checks: [
      enumCheck("node_type", SDKWORK_DRIVE_NODE_TYPES, "ck_drive_node_type"),
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
      "depth >= 0",
    ],
    foreignKeys: [
      fk("fk_drive_node_space_tenant", ["tenant_id", "space_id"], "drive_space(tenant_id, id)"),
      fk("fk_drive_node_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
      fk("fk_drive_node_parent_tenant", ["tenant_id", "parent_node_id"], "drive_node(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_drive_node_parent", ["tenant_id", "space_id", "parent_node_id", "trashed_at", "deleted_at", "sort_key", "id"]),
      idx("idx_drive_node_file", ["tenant_id", "file_id"]),
      idx("idx_drive_node_parent_node", ["tenant_id", "parent_node_id"]),
      idx("idx_drive_node_path_hash", ["tenant_id", "space_id", "path_hash"]),
      idx("uq_drive_node_active_name", ["tenant_id", "space_id", "COALESCE(parent_node_id, 0)", "normalized_name"], "deleted_at IS NULL AND trashed_at IS NULL", true),
    ],
    uniques: [{ columns: ["tenant_id", "id"], name: "uq_drive_node_tenant_id" }],
  }),

  table(SDKWORK_FILE_TABLES.driveAclEntry, [
    tenantColumn,
    nullableText("organization_id"),
    text("resource_type"),
    text("resource_id"),
    text("principal_type"),
    text("principal_id"),
    text("role"),
    text("effect", "'allow'"),
    text("inheritance_mode", "'none'"),
    nullableTimestamp("expires_at"),
  ], {
    indexes: [
      idx("idx_drive_acl_resource", ["tenant_id", "resource_type", "resource_id", "principal_type", "principal_id"]),
      idx("idx_drive_acl_principal", ["tenant_id", "principal_type", "principal_id", "resource_type", "resource_id"]),
    ],
  }),

  table(SDKWORK_FILE_TABLES.driveChangeLog, [
    tenantColumn,
    nullableText("organization_id"),
    bigint("space_id"),
    bigint("sequence_no"),
    text("cursor_token"),
    text("actor_type"),
    text("actor_id"),
    text("event_type"),
    text("resource_type"),
    text("resource_id"),
    nullableBigint("node_id"),
    nullableBigint("file_id"),
    nullableBigint("version_id"),
    nullableBigint("parent_node_id"),
    jsonb("payload_json"),
    timestamp("occurred_at", "now()"),
  ], {
    indexes: [
      idx("idx_drive_change_log_sequence", ["tenant_id", "space_id", "sequence_no"]),
      idx("idx_drive_change_log_resource", ["tenant_id", "resource_type", "resource_id", "sequence_no"]),
    ],
    uniques: [{ columns: ["tenant_id", "space_id", "sequence_no"], name: "uq_drive_change_log_space_sequence" }],
  }),

  table(SDKWORK_FILE_TABLES.fileSlotDefinition, [
    text("slot_code"),
    text("app_id"),
    text("business_domain"),
    text("display_name"),
    text("owner_scope"),
    jsonb("allowed_mime_types_json"),
    jsonb("denied_mime_types_json"),
    bigint("max_file_bytes"),
    nullableBigint("max_total_bytes"),
    text("cardinality"),
    integer("min_count", "0"),
    integer("max_count", "1"),
    text("default_visibility", "'private'"),
    text("quota_account_scope"),
    text("upload_mode_policy", "'single_or_multipart'"),
    nullableText("scan_policy_id"),
    nullableText("variant_policy_id"),
    nullableText("retention_policy_id"),
    nullableText("lifecycle_policy_id"),
    jsonb("required_metadata_schema_json"),
    text("status", "'active'"),
  ], {
    checks: [
      enumCheck("status", SDKWORK_FILE_SLOT_STATUSES, "ck_file_slot_definition_status"),
      "max_file_bytes > 0",
      "min_count >= 0",
      "max_count >= min_count",
    ],
    uniques: [{ columns: ["slot_code"], name: "uq_file_slot_definition_code" }],
  }),

  table(SDKWORK_FILE_TABLES.fileBinding, [
    tenantColumn,
    nullableText("organization_id"),
    text("app_id"),
    text("business_domain"),
    text("slot_code"),
    text("target_type"),
    text("target_id"),
    bigint("file_id"),
    nullableBigint("version_id"),
    nullableBigint("node_id"),
    text("bind_role", "'primary'"),
    integer("sort_order", "0"),
    text("binding_state", "'active'"),
    jsonb("metadata_json"),
    nullableTimestamp("deleted_at"),
  ], {
    checks: [
      enumCheck("binding_state", SDKWORK_FILE_BINDING_STATES, "ck_file_binding_state"),
    ],
    foreignKeys: [
      fk("fk_file_binding_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
      fk("fk_file_binding_version_tenant", ["tenant_id", "version_id"], "file_version(tenant_id, id)"),
      fk("fk_file_binding_node_tenant", ["tenant_id", "node_id"], "drive_node(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_file_binding_target_slot", ["tenant_id", "target_type", "target_id", "slot_code", "sort_order", "id"]),
      idx("idx_file_binding_file", ["tenant_id", "file_id", "binding_state"]),
      idx("idx_file_binding_version", ["tenant_id", "version_id"]),
      idx("idx_file_binding_node", ["tenant_id", "node_id"]),
      idx("uq_file_binding_active_file", ["tenant_id", "slot_code", "target_type", "target_id", "file_id"], "deleted_at IS NULL", true),
    ],
  }),

  table(SDKWORK_FILE_TABLES.storageQuotaPolicy, [
    tenantColumn,
    text("scope_type"),
    text("scope_id"),
    bigint("quota_limit_bytes"),
    nullableBigint("single_file_limit_bytes"),
    text("status", "'active'"),
  ], {
    checks: [
      enumCheck("scope_type", quotaPolicyScopeTypes(), "ck_storage_quota_policy_scope_type"),
      enumCheck("status", SDKWORK_STORAGE_RESOURCE_STATUSES, "ck_storage_quota_policy_status"),
      "quota_limit_bytes >= 0",
      "(single_file_limit_bytes IS NULL OR single_file_limit_bytes >= 0)",
    ],
    uniques: [{ columns: ["tenant_id", "scope_type", "scope_id"], name: "uq_storage_quota_policy_scope" }],
  }),

  table(SDKWORK_FILE_TABLES.storageQuotaReservation, [
    tenantColumn,
    nullableText("organization_id"),
    nullableText("user_id"),
    nullableText("space_id"),
    text("idempotency_key"),
    bigint("reserved_bytes"),
    timestamp("expires_at"),
    text("status", "'active'"),
    nullableTimestamp("released_at"),
    nullableTimestamp("converted_at"),
  ], {
    checks: [
      enumCheck("status", SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES, "ck_storage_quota_reservation_status"),
      "reserved_bytes >= 0",
    ],
    indexes: [
      idx("idx_storage_quota_reservation_scope", ["tenant_id", "organization_id", "user_id", "space_id", "status", "expires_at"]),
      idx("uq_storage_quota_reservation_idempotency", ["tenant_id", "idempotency_key"], undefined, true),
    ],
  }),

  {
    appendOnly: true,
    checks: [
      "delta_logical_bytes IS NOT NULL",
      "delta_physical_bytes IS NOT NULL",
      "delta_billable_bytes IS NOT NULL",
      "delta_retained_bytes IS NOT NULL",
    ],
    columns: [
      ...appendOnlyBaseColumns(),
      tenantColumn,
      nullableText("organization_id"),
      nullableText("user_id"),
      nullableText("space_id"),
      nullableText("app_id"),
      nullableText("business_domain"),
      nullableText("target_type"),
      nullableText("target_id"),
      nullableText("file_id"),
      nullableText("version_id"),
      nullableText("object_blob_id"),
      text("usage_event_type"),
      bigint("delta_logical_bytes"),
      bigint("delta_physical_bytes"),
      bigint("delta_billable_bytes"),
      bigint("delta_retained_bytes"),
      integer("delta_file_count", "0"),
      integer("delta_object_count", "0"),
      integer("delta_version_count", "0"),
      text("reason"),
      text("idempotency_key"),
      timestamp("occurred_at", "now()"),
    ],
    indexes: [
      idx("idx_storage_usage_ledger_scope_time", ["tenant_id", "space_id", "occurred_at", "id"]),
      idx("idx_storage_usage_ledger_user_time", ["tenant_id", "user_id", "occurred_at", "id"]),
      idx("idx_storage_usage_ledger_org_time", ["tenant_id", "organization_id", "occurred_at", "id"]),
      idx("idx_storage_usage_ledger_app_time", ["tenant_id", "app_id", "occurred_at", "id"]),
      idx("uq_storage_usage_ledger_idempotency", ["tenant_id", "idempotency_key"], undefined, true),
    ],
    name: SDKWORK_FILE_TABLES.storageUsageLedger,
    tenantIsolation: tenantIsolation(SDKWORK_FILE_TABLES.storageUsageLedger),
    uniques: [{ columns: ["tenant_id", "uuid"], name: "uq_storage_usage_ledger_tenant_uuid" }],
  },

  table(SDKWORK_FILE_TABLES.storageUsageCounter, [
    tenantColumn,
    text("scope_type"),
    text("scope_id"),
    nullableText("organization_id"),
    nullableText("user_id"),
    nullableText("space_id"),
    nullableText("app_id"),
    nullableText("business_domain"),
    bigint("used_logical_bytes", "0"),
    bigint("used_physical_bytes", "0"),
    bigint("used_billable_bytes", "0"),
    bigint("retained_bytes", "0"),
    bigint("trash_bytes", "0"),
    bigint("variant_bytes", "0"),
    bigint("file_count", "0"),
    bigint("object_count", "0"),
    bigint("version_count", "0"),
    bigint("last_ledger_id", "0"),
  ], {
    checks: [
      enumCheck("scope_type", SDKWORK_STORAGE_USAGE_SCOPE_TYPES, "ck_storage_usage_counter_scope_type"),
      usageScopeIdentityCheck(SDKWORK_FILE_TABLES.storageUsageCounter),
      "used_logical_bytes >= 0",
      "used_physical_bytes >= 0",
      "used_billable_bytes >= 0",
      "retained_bytes >= 0",
      "trash_bytes >= 0",
      "variant_bytes >= 0",
      "file_count >= 0",
      "object_count >= 0",
      "version_count >= 0",
    ],
    indexes: [
      idx("idx_storage_usage_counter_business_domain", ["tenant_id", "business_domain"]),
      idx("uq_storage_usage_counter_scope", ["tenant_id", "scope_type", "scope_id"], undefined, true),
    ],
  }),

  table(SDKWORK_FILE_TABLES.storageUsageSnapshot, [
    tenantColumn,
    text("scope_type"),
    text("scope_id"),
    nullableText("organization_id"),
    nullableText("user_id"),
    nullableText("space_id"),
    nullableText("app_id"),
    nullableText("business_domain"),
    text("snapshot_type"),
    timestamp("period_start_at"),
    timestamp("period_end_at"),
    timestamp("snapshot_at", "now()"),
    bigint("ledger_high_watermark_id", "0"),
    bigint("used_logical_bytes", "0"),
    bigint("used_physical_bytes", "0"),
    bigint("used_billable_bytes", "0"),
    bigint("retained_bytes", "0"),
    bigint("trash_bytes", "0"),
    bigint("variant_bytes", "0"),
    bigint("file_count", "0"),
    bigint("object_count", "0"),
    bigint("version_count", "0"),
  ], {
    checks: [
      enumCheck("scope_type", SDKWORK_STORAGE_USAGE_SCOPE_TYPES, "ck_storage_usage_snapshot_scope_type"),
      usageScopeIdentityCheck(SDKWORK_FILE_TABLES.storageUsageSnapshot),
      "period_end_at > period_start_at",
      "ledger_high_watermark_id >= 0",
      "used_logical_bytes >= 0",
      "used_physical_bytes >= 0",
      "used_billable_bytes >= 0",
      "retained_bytes >= 0",
      "trash_bytes >= 0",
      "variant_bytes >= 0",
      "file_count >= 0",
      "object_count >= 0",
      "version_count >= 0",
    ],
    indexes: [
      idx("idx_storage_usage_snapshot_scope_time", ["tenant_id", "scope_type", "scope_id", "snapshot_at", "id"]),
      idx("idx_storage_usage_snapshot_org_time", ["tenant_id", "organization_id", "snapshot_at", "id"]),
      idx("idx_storage_usage_snapshot_user_time", ["tenant_id", "user_id", "snapshot_at", "id"]),
      idx("idx_storage_usage_snapshot_app_time", ["tenant_id", "app_id", "snapshot_at", "id"]),
      idx("idx_storage_usage_snapshot_business_domain_time", ["tenant_id", "business_domain", "snapshot_at", "id"]),
      idx("uq_storage_usage_snapshot_scope_period", ["tenant_id", "scope_type", "scope_id", "snapshot_type", "period_start_at", "period_end_at"], undefined, true),
    ],
  }),

  table(SDKWORK_FILE_TABLES.storageReconciliationRun, [
    tenantColumn,
    nullableBigint("provider_id"),
    nullableBigint("bucket_id"),
    text("run_type"),
    text("status", "'created'"),
    booleanColumn("dry_run", "true"),
    timestamp("started_at", "now()"),
    nullableTimestamp("completed_at"),
    bigint("scanned_object_count", "0"),
    bigint("matched_object_count", "0"),
    bigint("missing_object_count", "0"),
    bigint("orphan_object_count", "0"),
    bigint("checksum_mismatch_count", "0"),
    text("requested_by"),
    text("idempotency_key"),
    text("request_id"),
    jsonb("summary_json"),
  ], {
    checks: [
      enumCheck("status", SDKWORK_STORAGE_JOB_STATUSES, "ck_storage_reconciliation_run_status"),
      "scanned_object_count >= 0",
      "matched_object_count >= 0",
      "missing_object_count >= 0",
      "orphan_object_count >= 0",
      "checksum_mismatch_count >= 0",
    ],
    foreignKeys: [
      fk("fk_storage_reconciliation_run_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
      fk("fk_storage_reconciliation_run_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_storage_reconciliation_run_status", ["tenant_id", "status", "started_at", "id"]),
      idx("idx_storage_reconciliation_run_provider", ["tenant_id", "provider_id", "bucket_id", "started_at", "id"]),
      idx("idx_storage_reconciliation_run_bucket", ["tenant_id", "bucket_id", "started_at", "id"]),
      idx("idx_storage_reconciliation_run_request", ["tenant_id", "request_id"]),
      idx("uq_storage_reconciliation_run_idempotency", ["tenant_id", "idempotency_key"], undefined, true),
    ],
    uniques: [{ columns: ["tenant_id", "id"], name: "uq_storage_reconciliation_run_tenant_id" }],
  }),

  table(SDKWORK_FILE_TABLES.storageReconciliationItem, [
    tenantColumn,
    bigint("run_id"),
    nullableBigint("object_blob_id"),
    nullableBigint("provider_id"),
    nullableBigint("bucket_id"),
    text("provider_object_key"),
    nullableText("provider_object_version_id"),
    text("issue_type"),
    text("severity"),
    text("resolution_status", "'open'"),
    nullableText("resolution_action"),
    nullableTimestamp("resolved_at"),
    nullableText("resolved_by"),
    jsonb("evidence_json"),
  ], {
    foreignKeys: [
      fk("fk_storage_reconciliation_item_run_tenant", ["tenant_id", "run_id"], "storage_reconciliation_run(tenant_id, id)"),
      fk("fk_storage_reconciliation_item_blob_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)"),
      fk("fk_storage_reconciliation_item_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
      fk("fk_storage_reconciliation_item_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
    ],
    indexes: [
      idx("idx_storage_reconciliation_item_resolution", ["tenant_id", "resolution_status", "severity", "id"]),
      idx("idx_storage_reconciliation_item_issue", ["tenant_id", "issue_type", "severity", "id"]),
      idx("idx_storage_reconciliation_item_run", ["tenant_id", "run_id", "id"]),
      idx("idx_storage_reconciliation_item_blob", ["tenant_id", "object_blob_id", "id"]),
      idx("idx_storage_reconciliation_item_provider", ["tenant_id", "provider_id", "bucket_id", "id"]),
      idx("idx_storage_reconciliation_item_bucket", ["tenant_id", "bucket_id", "id"]),
      idx("uq_storage_reconciliation_item_run_key_issue", ["tenant_id", "run_id", "provider_object_key", "issue_type"], undefined, true),
    ],
  }),

  table(SDKWORK_FILE_TABLES.storageGcJob, [
    tenantColumn,
    text("job_type"),
    text("status", "'created'"),
    booleanColumn("dry_run", "true"),
    text("requested_by"),
    text("idempotency_key"),
    nullableText("cursor_token"),
    bigint("candidate_count", "0"),
    bigint("deleted_object_count", "0"),
    bigint("released_bytes", "0"),
    nullableTimestamp("started_at"),
    nullableTimestamp("completed_at"),
    text("request_id"),
    jsonb("criteria_json"),
    jsonb("result_json"),
  ], {
    checks: [
      enumCheck("status", SDKWORK_STORAGE_JOB_STATUSES, "ck_storage_gc_job_status"),
      "candidate_count >= 0",
      "deleted_object_count >= 0",
      "released_bytes >= 0",
    ],
    indexes: [
      idx("idx_storage_gc_job_status", ["tenant_id", "status", "created_at", "id"]),
      idx("uq_storage_gc_job_idempotency", ["tenant_id", "idempotency_key"], undefined, true),
    ],
  }),

  {
    appendOnly: true,
    columns: [
      ...appendOnlyBaseColumns(),
      tenantColumn,
      nullableText("file_id"),
      nullableText("version_id"),
      nullableText("scan_type"),
      text("status"),
      nullableText("verdict"),
      jsonb("result_json"),
      timestamp("scanned_at", "now()"),
    ],
    indexes: [idx("idx_file_security_scan_status", ["tenant_id", "status", "scanned_at", "id"])],
    name: SDKWORK_FILE_TABLES.fileSecurityScan,
    tenantIsolation: tenantIsolation(SDKWORK_FILE_TABLES.fileSecurityScan),
    uniques: [{ columns: ["tenant_id", "uuid"], name: "uq_file_security_scan_tenant_uuid" }],
  },

  {
    appendOnly: true,
    columns: [
      ...appendOnlyBaseColumns(),
      tenantColumn,
      nullableText("organization_id"),
      text("actor_type"),
      text("actor_id"),
      text("event_type"),
      text("resource_type"),
      text("resource_id"),
      jsonb("payload_json"),
      nullableText("request_id"),
      timestamp("occurred_at", "now()"),
    ],
    indexes: [
      idx("idx_file_audit_log_resource", ["tenant_id", "resource_type", "resource_id", "occurred_at", "id"]),
      idx("idx_file_audit_log_actor", ["tenant_id", "actor_type", "actor_id", "occurred_at", "id"]),
    ],
    name: SDKWORK_FILE_TABLES.fileAuditLog,
    tenantIsolation: tenantIsolation(SDKWORK_FILE_TABLES.fileAuditLog),
    uniques: [{ columns: ["tenant_id", "uuid"], name: "uq_file_audit_log_tenant_uuid" }],
  },
];

export function getFileSchemaTable(name: string): FileSchemaTable {
  const tableDef = SDKWORK_FILE_SCHEMA_TABLES.find((item) => item.name === name);
  if (!tableDef) {
    throw new Error(`SDKWork file schema table not found: ${name}`);
  }
  return tableDef;
}

const REQUIRED_SCHEMA_CHECKS = [
  { checkName: "ck_object_provider_provider_type", tableName: SDKWORK_FILE_TABLES.objectProvider },
  { checkName: "ck_object_provider_status", tableName: SDKWORK_FILE_TABLES.objectProvider },
  { checkName: "ck_object_bucket_logical_scope", tableName: SDKWORK_FILE_TABLES.objectBucket },
  { checkName: "ck_object_bucket_default_storage_class", tableName: SDKWORK_FILE_TABLES.objectBucket },
  { checkName: "ck_object_bucket_default_encryption_mode", tableName: SDKWORK_FILE_TABLES.objectBucket },
  { checkName: "ck_object_bucket_status", tableName: SDKWORK_FILE_TABLES.objectBucket },
  { checkName: "ck_storage_default_bucket_policy_logical_scope", tableName: SDKWORK_FILE_TABLES.storageDefaultBucketPolicy },
  { checkName: "ck_storage_default_bucket_policy_scope_match", tableName: SDKWORK_FILE_TABLES.storageDefaultBucketPolicy },
  { checkName: "ck_storage_default_bucket_policy_status", tableName: SDKWORK_FILE_TABLES.storageDefaultBucketPolicy },
  { checkName: "ck_file_node_visibility", tableName: SDKWORK_FILE_TABLES.fileNode },
  { checkName: "ck_drive_space_type", tableName: SDKWORK_FILE_TABLES.driveSpace },
  { checkName: "ck_drive_space_status", tableName: SDKWORK_FILE_TABLES.driveSpace },
  { checkName: "ck_drive_node_type", tableName: SDKWORK_FILE_TABLES.driveNode },
  { checkName: "ck_drive_node_tree_position", tableName: SDKWORK_FILE_TABLES.driveNode },
  { checkName: "ck_drive_node_file_reference", tableName: SDKWORK_FILE_TABLES.driveNode },
  { checkName: "ck_drive_node_container_file_reference", tableName: SDKWORK_FILE_TABLES.driveNode },
  { checkName: "ck_file_slot_definition_status", tableName: SDKWORK_FILE_TABLES.fileSlotDefinition },
  { checkName: "ck_file_binding_state", tableName: SDKWORK_FILE_TABLES.fileBinding },
  { checkName: "ck_storage_quota_policy_scope_type", tableName: SDKWORK_FILE_TABLES.storageQuotaPolicy },
  { checkName: "ck_storage_quota_policy_status", tableName: SDKWORK_FILE_TABLES.storageQuotaPolicy },
  { checkName: "ck_storage_quota_reservation_status", tableName: SDKWORK_FILE_TABLES.storageQuotaReservation },
  { checkName: "ck_storage_usage_counter_scope_type", tableName: SDKWORK_FILE_TABLES.storageUsageCounter },
  { checkName: "ck_storage_usage_counter_scope_identity", tableName: SDKWORK_FILE_TABLES.storageUsageCounter },
  { checkName: "ck_storage_usage_snapshot_scope_type", tableName: SDKWORK_FILE_TABLES.storageUsageSnapshot },
  { checkName: "ck_storage_usage_snapshot_scope_identity", tableName: SDKWORK_FILE_TABLES.storageUsageSnapshot },
  { checkName: "ck_storage_reconciliation_run_status", tableName: SDKWORK_FILE_TABLES.storageReconciliationRun },
  { checkName: "ck_storage_gc_job_status", tableName: SDKWORK_FILE_TABLES.storageGcJob },
] as const;

const REQUIRED_SCHEMA_INDEXES = [
  requiredIndex(SDKWORK_FILE_TABLES.objectProvider, "idx_object_provider_tenant_status", ["tenant_id", "status", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBucket, "idx_object_bucket_tenant_scope", ["tenant_id", "logical_scope", "status", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBucket, "idx_object_bucket_tenant_provider", ["tenant_id", "provider_id", "status", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageDefaultBucketPolicy, "idx_storage_default_bucket_policy_bucket", ["tenant_id", "bucket_id", "bucket_logical_scope", "status", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBlob, "idx_object_blob_owner_state", ["tenant_id", "organization_id", "owner_user_id", "object_state", "created_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBlob, "idx_object_blob_storage_location", ["tenant_id", "provider_id", "bucket_id", "object_state", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBlob, "idx_object_blob_bucket", ["tenant_id", "bucket_id", "object_state", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBlob, "idx_object_blob_checksum", ["tenant_id", "checksum_sha256", "size_bytes"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectBlob, "idx_object_blob_gc", ["tenant_id", "object_state", "deleted_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.objectTag, "idx_object_tag_tenant_blob", ["tenant_id", "object_blob_id", "tag_key"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileNode, "idx_file_node_owner_state", ["tenant_id", "organization_id", "owner_user_id", "file_state", "created_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileNode, "idx_file_node_name", ["tenant_id", "normalized_name", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileNode, "idx_file_node_current_version", ["tenant_id", "current_version_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileVersion, "idx_file_version_tenant_file", ["tenant_id", "file_id", "version_no"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileVersion, "idx_file_version_tenant_object", ["tenant_id", "object_blob_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileVersion, "uq_file_version_current", ["tenant_id", "file_id"], { predicate: "is_current = true", unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.fileMetadataCommon, "idx_file_metadata_common_tenant_file", ["tenant_id", "file_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveSpace, "idx_drive_space_owner", ["tenant_id", "organization_id", "space_type", "owner_user_id", "status", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveSpace, "idx_drive_space_root_node", ["tenant_id", "root_node_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveNode, "idx_drive_node_parent", ["tenant_id", "space_id", "parent_node_id", "trashed_at", "deleted_at", "sort_key", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveNode, "idx_drive_node_file", ["tenant_id", "file_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveNode, "idx_drive_node_parent_node", ["tenant_id", "parent_node_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveNode, "idx_drive_node_path_hash", ["tenant_id", "space_id", "path_hash"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveNode, "uq_drive_node_active_name", ["tenant_id", "space_id", "COALESCE(parent_node_id, 0)", "normalized_name"], { predicate: "deleted_at IS NULL AND trashed_at IS NULL", unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.driveAclEntry, "idx_drive_acl_resource", ["tenant_id", "resource_type", "resource_id", "principal_type", "principal_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveAclEntry, "idx_drive_acl_principal", ["tenant_id", "principal_type", "principal_id", "resource_type", "resource_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveChangeLog, "idx_drive_change_log_sequence", ["tenant_id", "space_id", "sequence_no"]),
  requiredIndex(SDKWORK_FILE_TABLES.driveChangeLog, "idx_drive_change_log_resource", ["tenant_id", "resource_type", "resource_id", "sequence_no"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileBinding, "idx_file_binding_target_slot", ["tenant_id", "target_type", "target_id", "slot_code", "sort_order", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileBinding, "idx_file_binding_file", ["tenant_id", "file_id", "binding_state"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileBinding, "idx_file_binding_version", ["tenant_id", "version_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileBinding, "idx_file_binding_node", ["tenant_id", "node_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileBinding, "uq_file_binding_active_file", ["tenant_id", "slot_code", "target_type", "target_id", "file_id"], { predicate: "deleted_at IS NULL", unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageQuotaReservation, "idx_storage_quota_reservation_scope", ["tenant_id", "organization_id", "user_id", "space_id", "status", "expires_at"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageQuotaReservation, "uq_storage_quota_reservation_idempotency", ["tenant_id", "idempotency_key"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageLedger, "idx_storage_usage_ledger_scope_time", ["tenant_id", "space_id", "occurred_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageLedger, "idx_storage_usage_ledger_user_time", ["tenant_id", "user_id", "occurred_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageLedger, "idx_storage_usage_ledger_org_time", ["tenant_id", "organization_id", "occurred_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageLedger, "idx_storage_usage_ledger_app_time", ["tenant_id", "app_id", "occurred_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageLedger, "uq_storage_usage_ledger_idempotency", ["tenant_id", "idempotency_key"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageCounter, "idx_storage_usage_counter_business_domain", ["tenant_id", "business_domain"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageCounter, "uq_storage_usage_counter_scope", ["tenant_id", "scope_type", "scope_id"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "idx_storage_usage_snapshot_scope_time", ["tenant_id", "scope_type", "scope_id", "snapshot_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "idx_storage_usage_snapshot_org_time", ["tenant_id", "organization_id", "snapshot_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "idx_storage_usage_snapshot_user_time", ["tenant_id", "user_id", "snapshot_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "idx_storage_usage_snapshot_app_time", ["tenant_id", "app_id", "snapshot_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "idx_storage_usage_snapshot_business_domain_time", ["tenant_id", "business_domain", "snapshot_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageUsageSnapshot, "uq_storage_usage_snapshot_scope_period", ["tenant_id", "scope_type", "scope_id", "snapshot_type", "period_start_at", "period_end_at"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationRun, "idx_storage_reconciliation_run_status", ["tenant_id", "status", "started_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationRun, "idx_storage_reconciliation_run_provider", ["tenant_id", "provider_id", "bucket_id", "started_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationRun, "idx_storage_reconciliation_run_bucket", ["tenant_id", "bucket_id", "started_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationRun, "idx_storage_reconciliation_run_request", ["tenant_id", "request_id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationRun, "uq_storage_reconciliation_run_idempotency", ["tenant_id", "idempotency_key"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_resolution", ["tenant_id", "resolution_status", "severity", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_issue", ["tenant_id", "issue_type", "severity", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_run", ["tenant_id", "run_id", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_blob", ["tenant_id", "object_blob_id", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_provider", ["tenant_id", "provider_id", "bucket_id", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "idx_storage_reconciliation_item_bucket", ["tenant_id", "bucket_id", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageReconciliationItem, "uq_storage_reconciliation_item_run_key_issue", ["tenant_id", "run_id", "provider_object_key", "issue_type"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.storageGcJob, "idx_storage_gc_job_status", ["tenant_id", "status", "created_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.storageGcJob, "uq_storage_gc_job_idempotency", ["tenant_id", "idempotency_key"], { unique: true }),
  requiredIndex(SDKWORK_FILE_TABLES.fileSecurityScan, "idx_file_security_scan_status", ["tenant_id", "status", "scanned_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileAuditLog, "idx_file_audit_log_resource", ["tenant_id", "resource_type", "resource_id", "occurred_at", "id"]),
  requiredIndex(SDKWORK_FILE_TABLES.fileAuditLog, "idx_file_audit_log_actor", ["tenant_id", "actor_type", "actor_id", "occurred_at", "id"]),
] as const;

const REQUIRED_TENANT_PARENT_UNIQUES = [
  requiredUnique(SDKWORK_FILE_TABLES.objectProvider, "uq_object_provider_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.objectBucket, "uq_object_bucket_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.objectBucket, "uq_object_bucket_tenant_id_scope", ["tenant_id", "id", "logical_scope"]),
  requiredUnique(SDKWORK_FILE_TABLES.objectBlob, "uq_object_blob_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.fileNode, "uq_file_node_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.fileVersion, "uq_file_version_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.driveSpace, "uq_drive_space_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.driveNode, "uq_drive_node_tenant_id", ["tenant_id", "id"]),
  requiredUnique(SDKWORK_FILE_TABLES.storageReconciliationRun, "uq_storage_reconciliation_run_tenant_id", ["tenant_id", "id"]),
] as const;

const TENANT_SCOPED_PARENT_SINGLE_ID_REFERENCES = new Set(
  REQUIRED_TENANT_PARENT_UNIQUES.map((required) => `${required.tableName}(id)`),
);

const REQUIRED_TENANT_CONSISTENT_FOREIGN_KEYS = [
  requiredForeignKey(SDKWORK_FILE_TABLES.objectBucket, "fk_object_bucket_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
  requiredForeignKey(
    SDKWORK_FILE_TABLES.storageDefaultBucketPolicy,
    "fk_storage_default_bucket_policy_bucket_tenant",
    ["tenant_id", "bucket_id", "bucket_logical_scope"],
    "object_bucket(tenant_id, id, logical_scope)",
  ),
  requiredForeignKey(SDKWORK_FILE_TABLES.objectBlob, "fk_object_blob_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.objectBlob, "fk_object_blob_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.objectTag, "fk_object_tag_blob_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileVersion, "fk_file_version_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileVersion, "fk_file_version_object_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileNode, "fk_file_node_current_version_tenant", ["tenant_id", "current_version_id"], "file_version(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileMetadataCommon, "fk_file_metadata_common_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.driveNode, "fk_drive_node_space_tenant", ["tenant_id", "space_id"], "drive_space(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.driveNode, "fk_drive_node_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.driveNode, "fk_drive_node_parent_tenant", ["tenant_id", "parent_node_id"], "drive_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.driveSpace, "fk_drive_space_root_node_tenant", ["tenant_id", "root_node_id"], "drive_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileBinding, "fk_file_binding_file_tenant", ["tenant_id", "file_id"], "file_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileBinding, "fk_file_binding_version_tenant", ["tenant_id", "version_id"], "file_version(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.fileBinding, "fk_file_binding_node_tenant", ["tenant_id", "node_id"], "drive_node(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationRun, "fk_storage_reconciliation_run_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationRun, "fk_storage_reconciliation_run_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationItem, "fk_storage_reconciliation_item_run_tenant", ["tenant_id", "run_id"], "storage_reconciliation_run(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationItem, "fk_storage_reconciliation_item_blob_tenant", ["tenant_id", "object_blob_id"], "object_blob(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationItem, "fk_storage_reconciliation_item_provider_tenant", ["tenant_id", "provider_id"], "object_provider(tenant_id, id)"),
  requiredForeignKey(SDKWORK_FILE_TABLES.storageReconciliationItem, "fk_storage_reconciliation_item_bucket_tenant", ["tenant_id", "bucket_id"], "object_bucket(tenant_id, id)"),
] as const;

export function validateFileSchemaStandard(
  tables: readonly FileSchemaTable[] = SDKWORK_FILE_SCHEMA_TABLES,
): string[] {
  const violations: string[] = [];
  const tableNames = new Set(tables.map((item) => item.name));
  for (const expected of Object.values(SDKWORK_FILE_TABLES)) {
    if (!tableNames.has(expected)) {
      violations.push(`missing_table:${expected}`);
    }
  }

  const forbiddenColumnNames = new Set(["presigned_url", "signed_url", "public_url", "s3_url"]);
  for (const tableDef of tables) {
    if (tableDef.name.includes("plus")) {
      violations.push(`legacy_table_name:${tableDef.name}`);
    }
    const tenantScoped = hasColumn(tableDef, "tenant_id");
    for (const column of tableDef.columns) {
      if (forbiddenColumnNames.has(column.name)) {
        violations.push(`forbidden_column:${tableDef.name}.${column.name}`);
      }
      if (tenantScoped && column.unique) {
        violations.push(`tenant_column_unique_not_tenant_leading:${tableDef.name}.${column.name}`);
      }
    }
    if (tenantScoped) {
      if (!hasUniqueConstraint(tableDef, `uq_${tableDef.name}_tenant_uuid`, ["tenant_id", "uuid"])) {
        violations.push(`missing_tenant_uuid_unique:${tableDef.name}`);
      }
    } else if (!hasUniqueConstraint(tableDef, `uq_${tableDef.name}_uuid`, ["uuid"])) {
      violations.push(`missing_global_uuid_unique:${tableDef.name}`);
    }
  }

  for (const appendOnlyTable of tables.filter((item) => item.appendOnly)) {
    if (appendOnlyTable.columns.some((column) => column.name === "updated_at" || column.name === "deleted_at")) {
      violations.push(`append_only_mutable_columns:${appendOnlyTable.name}`);
    }
  }
  for (const required of REQUIRED_SCHEMA_CHECKS) {
    const tableDef = tables.find((item) => item.name === required.tableName);
    const hasCheck = (tableDef?.checks ?? []).some((check) => typeof check !== "string" && check.name === required.checkName);
    if (!hasCheck) {
      violations.push(`missing_required_check:${required.tableName}.${required.checkName}`);
    }
  }
  for (const required of REQUIRED_SCHEMA_INDEXES) {
    const tableDef = tables.find((item) => item.name === required.tableName);
    const indexDef = (tableDef?.indexes ?? []).find((index) => index.name === required.indexName);
    if (!indexDef) {
      violations.push(`missing_required_index:${required.tableName}.${required.indexName}`);
      continue;
    }
    if (!matchesRequiredIndex(indexDef, required)) {
      violations.push(`drifted_required_index:${required.tableName}.${required.indexName}`);
    }
  }
  for (const required of REQUIRED_TENANT_PARENT_UNIQUES) {
    const tableDef = tables.find((item) => item.name === required.tableName);
    const uniqueDef = (tableDef?.uniques ?? []).find((unique) => unique.name === required.uniqueName);
    if (!uniqueDef) {
      violations.push(`missing_tenant_parent_unique:${required.tableName}.${required.uniqueName}`);
      continue;
    }
    if (!matchesRequiredUnique(uniqueDef, required)) {
      violations.push(`drifted_tenant_parent_unique:${required.tableName}.${required.uniqueName}`);
    }
  }
  for (const required of REQUIRED_TENANT_CONSISTENT_FOREIGN_KEYS) {
    const tableDef = tables.find((item) => item.name === required.tableName);
    const foreignKeyDef = allForeignKeys(tableDef).find((foreignKey) => foreignKey.name === required.foreignKeyName);
    if (!foreignKeyDef) {
      violations.push(`missing_tenant_consistent_foreign_key:${required.tableName}.${required.foreignKeyName}`);
      continue;
    }
    if (!matchesRequiredForeignKey(foreignKeyDef, required)) {
      violations.push(`drifted_tenant_consistent_foreign_key:${required.tableName}.${required.foreignKeyName}`);
    }
  }
  for (const tableDef of tables) {
    for (const foreignKey of allForeignKeys(tableDef)) {
      if (
        hasColumn(tableDef, "tenant_id")
        && foreignKey.columns.length === 1
        && TENANT_SCOPED_PARENT_SINGLE_ID_REFERENCES.has(foreignKey.references)
      ) {
        violations.push(`tenant_inconsistent_foreign_key:${tableDef.name}.${foreignKey.name}`);
      }
      if (!hasForeignKeySupportingAccessPath(tableDef, foreignKey.columns)) {
        violations.push(`missing_foreign_key_supporting_index:${tableDef.name}.${foreignKey.name}`);
      }
    }
    for (const unique of tableDef.uniques ?? []) {
      if (hasColumn(tableDef, "tenant_id") && unique.columns[0] !== "tenant_id") {
        violations.push(`tenant_unique_constraint_not_tenant_leading:${tableDef.name}.${unique.name}`);
      }
      for (const columnName of unique.columns) {
        if (isNullableColumn(tableDef, columnName)) {
          violations.push(`nullable_unique_column:${tableDef.name}.${unique.name}.${columnName}`);
        }
      }
    }
    for (const index of tableDef.indexes ?? []) {
      if (hasColumn(tableDef, "tenant_id") && index.columns[0] !== "tenant_id") {
        violations.push(`tenant_index_not_tenant_leading:${tableDef.name}.${index.name}`);
      }
      if (index.unique) {
        if (hasColumn(tableDef, "tenant_id") && index.columns[0] !== "tenant_id") {
          violations.push(`tenant_unique_index_not_tenant_leading:${tableDef.name}.${index.name}`);
        }
        for (const columnName of index.columns) {
          if (isNullableColumn(tableDef, columnName)) {
            violations.push(`nullable_unique_index_column:${tableDef.name}.${index.name}.${columnName}`);
          }
        }
      }
    }
    if (tableDef.tenantIsolation && isNullableColumn(tableDef, "tenant_id")) {
      violations.push(`nullable_tenant_isolation_column:${tableDef.name}.tenant_id`);
    }
    if (hasColumn(tableDef, "tenant_id") && !hasTenantLeadingAccessPath(tableDef)) {
      violations.push(`missing_tenant_access_path:${tableDef.name}`);
    }
    if (hasColumn(tableDef, "tenant_id") && !hasRequiredTenantIsolation(tableDef)) {
      violations.push(`missing_tenant_isolation_policy:${tableDef.name}`);
    }
  }

  return violations;
}

export function createPostgresFileSchemaMigration(): string {
  const statements: string[] = [
    "-- SDKWork file platform schema",
    `-- version: ${SDKWORK_FILE_SCHEMA_VERSION}`,
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    createTenantContextFunction(),
    createAppendOnlyTriggerFunction(),
  ];

  for (const tableDef of SDKWORK_FILE_SCHEMA_TABLES) {
    statements.push(createTableSql(tableDef));
  }
  for (const tableDef of SDKWORK_FILE_SCHEMA_TABLES) {
    for (const foreignKey of tableDef.postCreateForeignKeys ?? []) {
      statements.push(createPostCreateForeignKeySql(tableDef.name, foreignKey));
    }
  }
  for (const tableDef of SDKWORK_FILE_SCHEMA_TABLES) {
    if (tableDef.tenantIsolation) {
      statements.push(createTenantIsolationSql(tableDef));
    }
  }
  for (const tableDef of SDKWORK_FILE_SCHEMA_TABLES) {
    for (const indexDef of tableDef.indexes ?? []) {
      statements.push(createIndexSql(tableDef.name, indexDef));
    }
    if (tableDef.appendOnly) {
      statements.push(createAppendOnlyTriggerSql(tableDef.name));
    }
  }

  return `${statements.join("\n\n")}\n`;
}

function table(
  name: string,
  columns: FileSchemaColumn[],
  options: Omit<FileSchemaTable, "columns" | "name"> = {},
): FileSchemaTable {
  const tableColumns = [...baseColumns(), ...columns];
  const tenantScoped = tableColumns.some((column) => column.name === "tenant_id");
  const uuidUnique = tenantScoped
    ? { columns: ["tenant_id", "uuid"], name: `uq_${name}_tenant_uuid` }
    : { columns: ["uuid"], name: `uq_${name}_uuid` };
  const defaultTenantIsolation = tenantScoped
    && !Object.prototype.hasOwnProperty.call(options, "tenantIsolation")
    ? { tenantIsolation: tenantIsolation(name) }
    : {};

  return {
    columns: tableColumns,
    name,
    ...defaultTenantIsolation,
    ...options,
    uniques: [uuidUnique, ...(options.uniques ?? [])],
  };
}

function createTableSql(tableDef: FileSchemaTable): string {
  const columnLines = tableDef.columns.map((column) => `  ${createColumnSql(column)}`);
  const uniqueLines = (tableDef.uniques ?? []).map(
    (unique) => `  CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(", ")})`,
  );
  const checkLines = (tableDef.checks ?? []).map((check, index) => {
    if (typeof check === "string") {
      return `  CONSTRAINT ck_${tableDef.name}_${index + 1} CHECK (${check})`;
    }
    return `  CONSTRAINT ${check.name} CHECK (${check.expression})`;
  });
  const foreignKeyLines = (tableDef.foreignKeys ?? []).map(
    (foreignKey) => `  CONSTRAINT ${foreignKey.name} FOREIGN KEY (${foreignKey.columns.join(", ")}) REFERENCES ${foreignKey.references}`,
  );

  return [
    `CREATE TABLE IF NOT EXISTS ${tableDef.name} (`,
    [...columnLines, ...uniqueLines, ...checkLines, ...foreignKeyLines].join(",\n"),
    ");",
  ].join("\n");
}

function createColumnSql(column: FileSchemaColumn): string {
  const parts = [column.name, column.type];
  if (column.primaryKey) {
    parts.push("PRIMARY KEY");
  }
  if (!column.primaryKey && !column.nullable) {
    parts.push("NOT NULL");
  }
  if (column.unique) {
    parts.push("UNIQUE");
  }
  if (column.default) {
    parts.push(`DEFAULT ${column.default}`);
  }
  return parts.join(" ");
}

function createIndexSql(tableName: string, indexDef: FileSchemaIndex): string {
  const unique = indexDef.unique ? "UNIQUE " : "";
  const predicate = indexDef.predicate ? ` WHERE ${indexDef.predicate}` : "";
  return `CREATE ${unique}INDEX IF NOT EXISTS ${indexDef.name} ON ${tableName} (${indexDef.columns.join(", ")})${predicate};`;
}

function createPostCreateForeignKeySql(tableName: string, foreignKey: FileSchemaForeignKey): string {
  return [
    `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${foreignKey.name};`,
    `ALTER TABLE ${tableName} ADD CONSTRAINT ${foreignKey.name} FOREIGN KEY (${foreignKey.columns.join(", ")}) REFERENCES ${foreignKey.references};`,
  ].join("\n");
}

function createTenantContextFunction(): string {
  return [
    "CREATE OR REPLACE FUNCTION sdkwork_current_tenant_id()",
    "RETURNS text AS $$",
    "  SELECT NULLIF(current_setting('sdkwork.tenant_id', true), '')",
    "$$ LANGUAGE sql STABLE;",
  ].join("\n");
}

function createTenantIsolationSql(tableDef: FileSchemaTable): string {
  const isolation = tableDef.tenantIsolation;
  if (!isolation) {
    throw new Error(`tenant isolation is not configured for ${tableDef.name}`);
  }
  const predicate = `${isolation.tenantColumn} = sdkwork_current_tenant_id()`;
  return [
    `ALTER TABLE ${tableDef.name} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${tableDef.name} FORCE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS ${isolation.policyName} ON ${tableDef.name};`,
    `CREATE POLICY ${isolation.policyName} ON ${tableDef.name}`,
    `USING (${predicate})`,
    `WITH CHECK (${predicate});`,
  ].join("\n");
}

function createAppendOnlyTriggerFunction(): string {
  return [
    "CREATE OR REPLACE FUNCTION sdkwork_reject_append_only_mutation()",
    "RETURNS trigger AS $$",
    "BEGIN",
    "  RAISE EXCEPTION 'SDKWork append-only table % cannot be updated, deleted, or truncated', TG_TABLE_NAME;",
    "END;",
    "$$ LANGUAGE plpgsql;",
  ].join("\n");
}

function createAppendOnlyTriggerSql(tableName: string): string {
  return [
    `DROP TRIGGER IF EXISTS trg_${tableName}_append_only ON ${tableName};`,
    `DROP TRIGGER IF EXISTS trg_${tableName}_append_only_row_mutation ON ${tableName};`,
    `CREATE TRIGGER trg_${tableName}_append_only_row_mutation`,
    `BEFORE UPDATE OR DELETE ON ${tableName}`,
    "FOR EACH ROW EXECUTE FUNCTION sdkwork_reject_append_only_mutation();",
    `DROP TRIGGER IF EXISTS trg_${tableName}_append_only_truncate ON ${tableName};`,
    `CREATE TRIGGER trg_${tableName}_append_only_truncate`,
    `BEFORE TRUNCATE ON ${tableName}`,
    "FOR EACH STATEMENT EXECUTE FUNCTION sdkwork_reject_append_only_mutation();",
  ].join("\n");
}

function idx(name: string, columns: string[], predicate?: string, unique?: boolean): FileSchemaIndex {
  return { columns, name, ...(predicate ? { predicate } : {}), ...(unique ? { unique } : {}) };
}

function tenantIsolation(tableName: string): FileSchemaTenantIsolation {
  return {
    policyName: `pol_${tableName}_tenant_isolation`,
    tenantColumn: "tenant_id",
  };
}

function requiredIndex(
  tableName: string,
  indexName: string,
  columns: readonly string[],
  options: { predicate?: string; unique?: boolean } = {},
): {
  columns: readonly string[];
  indexName: string;
  predicate?: string;
  tableName: string;
  unique?: boolean;
} {
  return {
    columns,
    indexName,
    tableName,
    ...(options.predicate ? { predicate: options.predicate } : {}),
    ...(options.unique ? { unique: true } : {}),
  };
}

function requiredUnique(
  tableName: string,
  uniqueName: string,
  columns: readonly string[],
): {
  columns: readonly string[];
  tableName: string;
  uniqueName: string;
} {
  return {
    columns,
    tableName,
    uniqueName,
  };
}

function requiredForeignKey(
  tableName: string,
  foreignKeyName: string,
  columns: readonly string[],
  references: string,
): {
  columns: readonly string[];
  foreignKeyName: string;
  references: string;
  tableName: string;
} {
  return {
    columns,
    foreignKeyName,
    references,
    tableName,
  };
}

function allForeignKeys(tableDef: FileSchemaTable | undefined): FileSchemaForeignKey[] {
  if (!tableDef) {
    return [];
  }
  return [
    ...(tableDef.foreignKeys ?? []),
    ...(tableDef.postCreateForeignKeys ?? []),
  ];
}

function hasColumn(tableDef: FileSchemaTable, columnName: string): boolean {
  return tableDef.columns.some((column) => column.name === columnName);
}

function isNullableColumn(tableDef: FileSchemaTable, columnName: string): boolean {
  return tableDef.columns.some((column) => column.name === columnName && column.nullable === true);
}

function hasTenantLeadingAccessPath(tableDef: FileSchemaTable): boolean {
  return [
    ...(tableDef.indexes ?? []),
    ...(tableDef.uniques ?? []).map((unique) => ({ columns: unique.columns, name: unique.name })),
  ].some((accessPath) => accessPath.columns[0] === "tenant_id");
}

function hasForeignKeySupportingAccessPath(tableDef: FileSchemaTable, foreignKeyColumns: readonly string[]): boolean {
  return [
    ...(tableDef.indexes ?? []),
    ...(tableDef.uniques ?? []).map((unique) => ({ columns: unique.columns, name: unique.name })),
  ].some((accessPath) => (
    foreignKeyColumns.every((column, index) => accessPath.columns[index] === column)
  ));
}

function hasRequiredTenantIsolation(tableDef: FileSchemaTable): boolean {
  return (
    tableDef.tenantIsolation?.tenantColumn === "tenant_id"
    && tableDef.tenantIsolation.policyName === `pol_${tableDef.name}_tenant_isolation`
  );
}

function hasUniqueConstraint(tableDef: FileSchemaTable, uniqueName: string, columns: readonly string[]): boolean {
  return (tableDef.uniques ?? []).some((unique) => (
    unique.name === uniqueName && sameColumns(unique.columns, columns)
  ));
}

function matchesRequiredIndex(
  indexDef: FileSchemaIndex,
  required: {
    columns: readonly string[];
    predicate?: string;
    unique?: boolean;
  },
): boolean {
  return (
    sameColumns(indexDef.columns, required.columns)
    && normalizePredicate(indexDef.predicate) === normalizePredicate(required.predicate)
    && Boolean(indexDef.unique) === Boolean(required.unique)
  );
}

function matchesRequiredUnique(
  uniqueDef: { columns: readonly string[] },
  required: { columns: readonly string[] },
): boolean {
  return sameColumns(uniqueDef.columns, required.columns);
}

function matchesRequiredForeignKey(
  foreignKeyDef: FileSchemaForeignKey,
  required: {
    columns: readonly string[];
    references: string;
  },
): boolean {
  return (
    sameColumns(foreignKeyDef.columns, required.columns)
    && foreignKeyDef.references === required.references
  );
}

function sameColumns(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((column, index) => column === expected[index]);
}

function normalizePredicate(predicate: string | undefined): string | undefined {
  return predicate?.replace(/\s+/g, " ").trim();
}

function fk(name: string, columns: string[], references: string): FileSchemaForeignKey {
  return { columns, name, references };
}

function enumCheck(column: string, values: readonly string[], name: string): FileSchemaCheck {
  return {
    expression: `${column} IN (${values.map((value) => `'${value}'`).join(", ")})`,
    name,
  };
}

function usageScopeIdentityCheck(tableName: string): FileSchemaCheck {
  return {
    expression: [
      "((scope_type = 'tenant' AND scope_id = tenant_id AND organization_id IS NULL AND user_id IS NULL AND space_id IS NULL AND app_id IS NULL AND business_domain IS NULL)",
      "OR (scope_type = 'organization' AND scope_id = organization_id AND organization_id IS NOT NULL AND user_id IS NULL AND space_id IS NULL AND app_id IS NULL AND business_domain IS NULL)",
      "OR (scope_type = 'user' AND scope_id = user_id AND user_id IS NOT NULL AND space_id IS NULL AND app_id IS NULL AND business_domain IS NULL)",
      "OR (scope_type = 'space' AND scope_id = space_id AND space_id IS NOT NULL AND user_id IS NULL AND app_id IS NULL AND business_domain IS NULL)",
      "OR (scope_type = 'app' AND scope_id = app_id AND app_id IS NOT NULL AND user_id IS NULL AND space_id IS NULL AND business_domain IS NULL)",
      "OR (scope_type = 'business_domain' AND scope_id = business_domain AND business_domain IS NOT NULL AND user_id IS NULL AND space_id IS NULL AND app_id IS NULL))",
    ].join(" "),
    name: `ck_${tableName}_scope_identity`,
  };
}

function quotaPolicyScopeTypes(): readonly string[] {
  return SDKWORK_STORAGE_USAGE_SCOPE_TYPES.filter((scopeType) => scopeType !== "business_domain");
}

function text(name: string, defaultValue?: string): FileSchemaColumn {
  return { ...(defaultValue ? { default: defaultValue } : {}), name, type: "text" };
}

function nullableText(name: string): FileSchemaColumn {
  return { name, nullable: true, type: "text" };
}

function bigint(name: string, defaultValue?: string): FileSchemaColumn {
  return { ...(defaultValue ? { default: defaultValue } : {}), name, type: "bigint" };
}

function nullableBigint(name: string): FileSchemaColumn {
  return { name, nullable: true, type: "bigint" };
}

function integer(name: string, defaultValue?: string): FileSchemaColumn {
  return { ...(defaultValue ? { default: defaultValue } : {}), name, type: "integer" };
}

function booleanColumn(name: string, defaultValue: string): FileSchemaColumn {
  return { default: defaultValue, name, type: "boolean" };
}

function jsonb(name: string): FileSchemaColumn {
  return { default: "'{}'::jsonb", name, type: "jsonb" };
}

function timestamp(name: string, defaultValue?: string): FileSchemaColumn {
  return { ...(defaultValue ? { default: defaultValue } : {}), name, type: "timestamptz" };
}

function nullableTimestamp(name: string): FileSchemaColumn {
  return { name, nullable: true, type: "timestamptz" };
}
