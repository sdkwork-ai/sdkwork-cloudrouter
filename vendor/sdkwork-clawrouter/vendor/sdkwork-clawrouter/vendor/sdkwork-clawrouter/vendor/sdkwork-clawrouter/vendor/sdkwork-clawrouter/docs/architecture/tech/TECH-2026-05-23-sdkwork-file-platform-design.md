> Migrated from `docs/superpowers/specs/2026-05-23-sdkwork-file-platform-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Status

This specification defines a new SDKWork file, upload, object storage, and
drive platform. It is intentionally designed without depending on legacy
`PlusDisk` or `PlusFile` table shapes. Legacy systems may later integrate
through aliases and migration adapters, but the new platform model remains the
source of truth.

The user confirmed the direction on 2026-05-23:

- Focus on the foundational file platform, not on WeChat official account or
  mini-program icon upload as the primary scope.
- Design for all applications to reuse the same upload, file, drive, binding,
  quota, and storage statistics capabilities.
- Support tenant, organization, user, app, and drive-space storage accounting.
- Use S3-compatible object storage and presigned URL upload flows.
- Design a modular "building block" frontend and backend package system.
- Align database and product design with industry-grade drive and object
  storage systems.

## Goal

Build a reusable SDKWork file platform that supports:

- S3-compatible direct upload through service-issued presigned URLs.
- Single-object upload, multipart upload, and future resumable-upload facades.
- File asset metadata, file versions, preview variants, and business bindings.
- Drive spaces, folders, shared spaces, permissions, change logs, and trash.
- Tenant, organization, user, app, and space storage accounting.
- Storage quota reservation, usage ledger, counters, and snapshots.
- Admin governance for storage providers, buckets, quotas, usage, slots,
  security, audit, and reconciliation.
- App-facing upload, picker, preview, attachment, and drive components.
- Backend and App API surfaces with strict separation of authority.

## Non-Goals

- Do not build a WeChat-only upload flow.
- Do not allow business modules to store S3 URLs, object keys, or bucket names.
- Do not expose storage provider credentials or permanent object URLs to app
  clients.
- Do not create raw fetch or handwritten HTTP integrations where generated SDK
  or approved SDK adapter boundaries exist.
- Do not make admin provider/bucket/quota APIs available through app-facing
  APIs.
- Do not require all advanced drive features in phase 1. Sharing, rich preview,
  full search, legal hold, and reconciliation can be phased.

## Industry Baseline

The design follows these industry patterns:

- S3-compatible object storage for physical object persistence, private buckets,
  object tags, lifecycle policy, checksums, multipart upload, and short-lived
  presigned URLs.
- Google Drive style resource separation: files, permissions, revisions, and
  changes are independent resources rather than one overloaded table.
- OneDrive/Microsoft Graph style delta synchronization for scalable client
  refresh.
- Box-style retention and legal hold concepts for enterprise compliance.
- tus-style resumable upload semantics as a future facade over object-storage
  multipart upload where appropriate.

Important rule: S3 ETag is not a reliable full-file checksum for multipart
objects. The platform must store explicit checksum fields such as SHA-256 or
provider-supported checksum values.

## Core Truths

The platform has six independent sources of truth:

- `object_blob` is the physical object truth.
- `file_node` and `file_version` are the file asset truth.
- `drive_space` and `drive_node` are the drive tree truth.
- `file_binding` is the business integration truth.
- `storage_usage_ledger` is the storage accounting truth.
- `file_audit_log` and related access logs are the security audit truth.

Business modules integrate through `file_binding`, `file_id`, or stable file
reference tokens. They never store physical object addresses.

## Domain Model

### Object Storage Domain

Object storage models the physical storage backend. It must support S3-compatible
providers with provider-specific capability detection.

Tables:

- `object_provider`
- `object_bucket`
- `object_blob`
- `object_tag`
- `object_variant`
- `object_lifecycle_transition`
- `object_inventory_snapshot`
- `object_access_policy`

`object_provider` fields:

- `id`
- `uuid`
- `tenant_id` nullable
- `provider_code`
- `provider_type`: `aws_s3`, `minio`, `oss_s3`, `cos_s3`, `cloudflare_r2`,
  `local_dev_s3`
- `endpoint_url`
- `region`
- `credential_ref`
- `signature_version`
- `path_style_enabled`
- `default_bucket_policy`
- `supports_multipart`
- `supports_object_lock`
- `supports_lifecycle`
- `supports_kms`
- `supports_tags`
- `supports_inventory`
- `status`
- `health_status`
- `last_health_check_at`
- standard audit columns

`provider_type` must be constrained by the canonical file contract vocabulary,
not accepted as free text.

`object_bucket` fields:

- `id`
- `uuid`
- `tenant_id` nullable
- `provider_id`
- `bucket_name`
- `bucket_region`
- `logical_scope`: `tenant_private`, `tenant_public_asset`,
  `system_quarantine`, `system_temp`, `system_archive`, `system_variant`,
  `migration_import`
- `data_residency_region`
- `object_key_prefix`
- `default_storage_class`
- `default_encryption_mode`
- `kms_key_ref`
- `versioning_enabled`
- `object_lock_enabled`
- `lifecycle_enabled`
- `public_access_blocked`
- `status`
- standard audit columns

`logical_scope` must be constrained by the canonical file contract vocabulary,
not accepted as free text.

`object_blob` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `owner_user_id` nullable
- `provider_id`
- `bucket_id`
- `object_key`
- `object_version_id` nullable
- `object_uri`, for internal use only, such as
  `s3://providerCode/bucketName/objectKey#versionId`
- `size_bytes`
- `content_type`
- `content_encoding` nullable
- `content_disposition` nullable
- `checksum_algorithm`
- `checksum_sha256` nullable
- `checksum_crc32` nullable
- `checksum_crc32c` nullable
- `checksum_crc64nvme` nullable
- `etag` nullable
- `multipart_upload_id` nullable
- `multipart_part_count`
- `storage_class`
- `encryption_mode`
- `kms_key_ref` nullable
- `object_state`: `pending`, `uploaded`, `verified`, `active`, `retained`,
  `delete_pending`, `deleted`, `orphaned`, `missing`, `checksum_mismatch`,
  `provider_error`
- `quarantine_state`
- `retention_mode` nullable
- `retain_until_at` nullable
- `legal_hold_enabled`
- `created_at`
- `uploaded_at`
- `verified_at`
- `deleted_at`

Required constraints:

- Unique: `(provider_id, bucket_id, object_key, object_version_id)`.
- Index: `(tenant_id, organization_id, owner_user_id, object_state, created_at,
  id)`.
- Index: `(tenant_id, checksum_sha256, size_bytes)`.
- Index: `(object_state, deleted_at, id)` for garbage collection.

### Upload Domain

All uploads start with an `upload_session`. Clients never choose bucket names or
object keys.

Tables:

- `upload_session`
- `upload_presign_grant`
- `upload_part`
- `upload_completion_attempt`
- `upload_client_capability`
- `upload_failure_event`

`upload_session` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `owner_user_id`
- `app_id` nullable
- `space_id` nullable
- `parent_node_id` nullable
- `slot_code` nullable
- `target_type` nullable
- `target_id` nullable
- `filename_original`
- `filename_normalized`
- `content_type_claimed`
- `content_type_detected` nullable
- `size_bytes_claimed`
- `size_bytes_actual` nullable
- `checksum_algorithm_claimed`
- `checksum_value_claimed` nullable
- `upload_mode`: `single_put`, `multipart`, `tus_facade`, `server_proxy`
- `provider_id`
- `bucket_id`
- `object_key`
- `multipart_upload_id` nullable
- `part_size_bytes` nullable
- `total_parts` nullable
- `uploaded_parts`
- `uploaded_bytes`
- `resumable_offset`
- `status`
- `client_fingerprint` nullable
- `idempotency_key`
- `expires_at`
- lifecycle timestamps

Upload status:

- `created`
- `presigned`
- `uploading`
- `uploaded`
- `verifying`
- `scanning`
- `processing`
- `active`
- `policy_rejected`
- `quota_rejected`
- `expired`
- `canceled`
- `aborted`
- `checksum_failed`
- `scan_failed`
- `virus_detected`
- `processing_failed`
- `orphaned`

`upload_presign_grant` records each presign issuance. The presigned URL itself
must not be persisted as business data.

Fields:

- `id`
- `session_id`
- `grant_type`
- `http_method`
- `part_number` nullable
- `url_expires_at`
- `allowed_headers_json`
- `required_headers_json`
- `content_length_min`
- `content_length_max`
- `issued_at`
- `issued_by`

`upload_part` fields:

- `id`
- `session_id`
- `part_number`
- `size_bytes_claimed`
- `size_bytes_actual`
- `etag`
- `checksum_algorithm`
- `checksum_value`
- `uploaded_at`
- `verified_at`
- `status`

Required constraints:

- Unique: `(tenant_id, idempotency_key)` on `upload_session`.
- Unique: `(session_id, part_number)` on `upload_part`.
- Check: `part_number >= 1 AND part_number <= 10000`.
- Index: `(status, expires_at, id)` for cleanup.
- Index: `(tenant_id, target_type, target_id, slot_code)`.

### File Asset Domain

`file_node` represents the logical file asset. Directory placement belongs to
`drive_node`, not `file_node`.

Tables:

- `file_node`
- `file_version`
- `file_version_alias`
- `file_metadata_common`
- `file_metadata_image`
- `file_metadata_video`
- `file_metadata_audio`
- `file_metadata_document`
- `file_label`
- `file_comment`
- `file_lock`

`file_node` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `owner_user_id` nullable
- `file_kind`: `file`, `folder_asset`, `shortcut_target`, `package`,
  `external_reference`
- `name`
- `normalized_name`
- `extension`
- `mime_type`
- `media_type`
- `current_version_id` nullable
- `file_state`
- `visibility`
- `classification`
- standard audit columns

File state:

- `draft`
- `active`
- `locked`
- `trashed`
- `purge_pending`
- `purged`
- `quarantined`
- `retained`
- `legal_hold`
- `blocked`

`file_version` fields:

- `id`
- `uuid`
- `file_id`
- `version_no`
- `version_label` nullable
- `object_blob_id`
- `size_bytes`
- `checksum_algorithm`
- `checksum_value`
- `content_type`
- `created_by`
- `created_at`
- `version_state`
- `is_current`
- `change_summary` nullable
- `retention_mode` nullable
- `retain_until_at` nullable
- `legal_hold_enabled`
- `deleted_at` nullable

Required constraints:

- Unique: `(file_id, version_no)`.
- At most one current version per file. Use a partial unique index where the
  database supports it.
- Index: `(object_blob_id)`.

### Drive Domain

Drive models spaces, directory trees, mounts, shortcuts, trash, and change logs.

Tables:

- `drive_space`
- `drive_node`
- `drive_shortcut`
- `drive_mount`
- `drive_trash_entry`
- `drive_change_log`
- `drive_sync_cursor`

`drive_space` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `space_type`: `user_drive`, `organization_drive`, `team_drive`,
  `project_drive`, `app_drive`, `system_library`, `shared_drive`, `trash_space`
- `owner_user_id` nullable
- `owner_group_id` nullable
- `app_id` nullable
- `name`
- `root_node_id` nullable
- `quota_policy_id` nullable
- `default_permission_policy_id` nullable
- `status`
- standard audit columns

`drive_node` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `space_id`
- `parent_node_id` nullable
- `file_id` nullable
- `node_type`: `root`, `folder`, `file`, `shortcut`, `mount`, `external_link`
- `name`
- `normalized_name`
- `path_segment`
- `path_hash`
- `materialized_path` nullable
- `depth`
- `sort_key`
- `inherit_permission`
- `permission_fingerprint`
- `trashed_at` nullable
- `trashed_by` nullable
- `deleted_at` nullable
- standard audit columns

Required constraints:

- Unique active name within a folder:
  `(space_id, parent_node_id, normalized_name)` where `deleted_at IS NULL` and
  `trashed_at IS NULL`.
- Index: `(tenant_id, space_id, parent_node_id, trashed_at, deleted_at, sort_key,
  id)`.
- Index: `(tenant_id, file_id)`.
- Index: `(tenant_id, space_id, path_hash)`.

`drive_change_log` is append-only and powers client sync, cache invalidation, and
search indexing.

Fields:

- `id`
- `tenant_id`
- `organization_id` nullable
- `space_id`
- `sequence_no`
- `cursor_token`
- `actor_type`
- `actor_id`
- `event_type`
- `resource_type`
- `resource_id`
- `node_id` nullable
- `file_id` nullable
- `version_id` nullable
- `parent_node_id` nullable
- `payload_json`
- `occurred_at`
- `created_at`

Required constraints:

- Unique: `(space_id, sequence_no)`.
- Index: `(tenant_id, space_id, sequence_no)`.
- Index: `(tenant_id, resource_type, resource_id, sequence_no)`.

### Permission and Sharing Domain

Tables:

- `drive_acl_entry`
- `drive_permission_policy`
- `drive_permission_effective_cache`
- `drive_share_link`
- `drive_share_invitation`
- `drive_access_grant`

`drive_acl_entry` fields:

- `id`
- `tenant_id`
- `organization_id` nullable
- `resource_type`: `space`, `node`, `file`, `share_link`
- `resource_id`
- `principal_type`: `tenant`, `organization`, `group`, `user`,
  `service_account`, `app`, `anonymous`, `external_email`
- `principal_id`
- `role`: `owner`, `manager`, `editor`, `commenter`, `viewer`, `previewer`,
  `downloader`, `uploader`, `metadata_viewer`, `no_access`
- `effect`: `allow`, `deny`
- `inheritance_mode`
- `expires_at` nullable
- standard audit columns

`drive_permission_effective_cache` is a read model. It can be invalidated and
recomputed.

`drive_share_link` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `resource_type`
- `resource_id`
- `link_token_hash`
- `link_scope`
- `role`
- `password_hash` nullable
- `expires_at` nullable
- `max_access_count` nullable
- `access_count`
- `allow_download`
- `allow_preview`
- `watermark_enabled`
- `require_login`
- `allowed_domains_json` nullable
- `status`
- `created_by`
- `created_at`
- `revoked_at` nullable

The raw share token must never be stored.

### Business Integration Domain

Business applications integrate through file slots and bindings.

Tables:

- `file_slot_definition`
- `file_slot_policy`
- `file_binding`
- `file_reference_token`
- `file_legacy_alias`

`file_slot_definition` fields:

- `id`
- `slot_code`
- `app_id`
- `business_domain`
- `display_name`
- `owner_scope`
- `allowed_mime_types_json`
- `denied_mime_types_json`
- `max_file_bytes`
- `max_total_bytes`
- `cardinality`: `single`, `multiple`, `ordered_multiple`, `versioned_single`
- `min_count`
- `max_count`
- `default_visibility`
- `quota_account_scope`
- `upload_mode_policy`
- `scan_policy_id`
- `variant_policy_id`
- `retention_policy_id`
- `lifecycle_policy_id`
- `required_metadata_schema_json`
- `status`
- standard audit columns

`file_binding` fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `app_id`
- `business_domain`
- `slot_code`
- `target_type`
- `target_id`
- `file_id`
- `version_id` nullable
- `node_id` nullable
- `bind_role`
- `sort_order`
- `binding_state`
- `metadata_json`
- standard audit columns
- `deleted_at` nullable

Slot examples:

- `user.avatar`
- `user.identity_document`
- `organization.logo`
- `app.icon`
- `app.cover`
- `course.video`
- `course.attachment`
- `product.main_image`
- `product.gallery`
- `ticket.attachment`
- `chat.attachment`
- `knowledge.document`
- `media.asset`

### Storage Usage and Quota Domain

Storage accounting must distinguish:

- Logical bytes: user-facing file size.
- Physical bytes: actual object storage bytes.
- Billable bytes: billing and quota bytes.
- Retained bytes: bytes retained by versions, trash, retention, or legal hold.

Tables:

- `storage_quota_policy`
- `storage_quota_reservation`
- `storage_usage_ledger`
- `storage_usage_counter`
- `storage_usage_snapshot`
- `storage_reconciliation_run`
- `storage_reconciliation_item`

`storage_usage_ledger` is append-only.

Fields:

- `id`
- `uuid`
- `tenant_id`
- `organization_id` nullable
- `user_id` nullable
- `space_id` nullable
- `app_id` nullable
- `business_domain` nullable
- `target_type` nullable
- `target_id` nullable
- `file_id` nullable
- `version_id` nullable
- `object_blob_id` nullable
- `usage_event_type`
- `delta_logical_bytes`
- `delta_physical_bytes`
- `delta_billable_bytes`
- `delta_retained_bytes`
- `delta_file_count`
- `delta_object_count`
- `delta_version_count`
- `reason`
- `idempotency_key`
- `occurred_at`
- `created_at`

Required constraints:

- Unique: `(tenant_id, idempotency_key)`.
- Indexes for tenant, organization, user, space, app, and time.

`storage_usage_counter` is a read model.

Fields:

- `id`
- `tenant_id`
- `scope_type`: `tenant`, `organization`, `user`, `space`, `app`,
  `business_domain`
- `scope_id`
- optional denormalized `organization_id`, `user_id`, `space_id`, `app_id`
- `used_logical_bytes`
- `used_physical_bytes`
- `used_billable_bytes`
- `retained_bytes`
- `trash_bytes`
- `variant_bytes`
- `file_count`
- `object_count`
- `version_count`
- `last_ledger_id`
- `updated_at`

Quota policy, usage counter, and usage snapshot `scope_type` values must be
database-constrained from the same canonical vocabulary used by TypeScript ports
and OpenAPI schemas.

`storage_quota_reservation` prevents concurrent uploads from exceeding quota.

Fields:

- `id`
- `tenant_id`
- `organization_id` nullable
- `user_id` nullable
- `space_id` nullable
- `upload_session_id`
- `reserved_bytes`
- `expires_at`
- `status`
- lifecycle timestamps

### Security, Compliance, and Audit Domain

Tables:

- `file_security_scan`
- `file_dlp_result`
- `file_retention_policy`
- `file_legal_hold`
- `file_access_log`
- `file_audit_log`

Security scan types:

- `virus`
- `mime_sniff`
- `dlp`
- `image_safety`
- `archive_bomb`
- `malware_static`

Security rules:

- Buckets are private by default.
- Public-read ACLs are prohibited for managed objects.
- Downloads and previews require service-issued short-lived URLs.
- Uploads must be policy checked before presign.
- Uploaded objects remain unavailable until verification and configured scanning
  requirements are satisfied.
- Deletion must respect trash, retention, and legal hold policy.
- Failed permission checks and rejected security operations should be auditable.

## Upload Flow

Create upload session:

1. Validate tenant, organization, user, app, and target access.
2. Load `file_slot_definition` and policy.
3. Validate MIME, extension, size, cardinality, and upload mode.
4. Reserve quota through `storage_quota_reservation`.
5. Select provider and bucket.
6. Generate service-owned object key.
7. Create `upload_session`.
8. Issue presigned single PUT or multipart part URLs.
9. Record `upload_presign_grant`.

Complete upload:

1. Lock `upload_session`.
2. Check status, expiration, and idempotency.
3. Validate object existence using provider HEAD or multipart completion state.
4. Validate size, checksum, and content type.
5. Create `object_blob`.
6. Create `file_node` and `file_version`, or create a new version.
7. Create `drive_node` when the upload targets a drive location.
8. Create `file_binding` when the upload targets a slot and business object.
9. Append `storage_usage_ledger`.
10. Update `storage_usage_counter`.
11. Release or convert quota reservation.
12. Append `drive_change_log`.
13. Append audit records.
14. Transition session to `active` or `scanning` based on policy.

Abort or expire upload:

1. Abort multipart upload at provider when needed.
2. Release quota reservation.
3. Mark session `aborted` or `expired`.
4. Append audit and failure events.

## API Surfaces

### App API

App APIs are for users and business applications. They must not expose providers,
buckets, object keys, or admin policies.

Upload:

- `POST /app/v3/upload/sessions`
- `POST /app/v3/upload/sessions/{sessionId}/presign`
- `GET /app/v3/upload/sessions/{sessionId}`
- `POST /app/v3/upload/sessions/{sessionId}/complete`
- `POST /app/v3/upload/sessions/{sessionId}/abort`
- `POST /app/v3/upload/sessions/{sessionId}/parts/{partNumber}/presign`

Files:

- `GET /app/v3/files/{fileId}`
- `GET /app/v3/files/{fileId}/versions`
- `POST /app/v3/files/{fileId}/download-url`
- `POST /app/v3/files/{fileId}/preview-url`
- `PATCH /app/v3/files/{fileId}`
- `DELETE /app/v3/files/{fileId}`

Drive:

- `GET /app/v3/drive/spaces`
- `GET /app/v3/drive/spaces/{spaceId}/nodes`
- `POST /app/v3/drive/spaces/{spaceId}/folders`
- `PATCH /app/v3/drive/nodes/{nodeId}`
- `POST /app/v3/drive/nodes/{nodeId}/move`
- `POST /app/v3/drive/nodes/{nodeId}/copy`
- `POST /app/v3/drive/nodes/{nodeId}/trash`
- `POST /app/v3/drive/nodes/{nodeId}/restore`
- `GET /app/v3/drive/changes`

Bindings:

- `GET /app/v3/file-bindings`
- `POST /app/v3/file-bindings`
- `PATCH /app/v3/file-bindings/{bindingId}`
- `DELETE /app/v3/file-bindings/{bindingId}`

Usage:

- `GET /app/v3/storage/usage/current`
- `GET /app/v3/storage/usage/spaces`
- `GET /app/v3/storage/quotas/current`

### Backend Admin API

Backend APIs are for administrators and operators.

- `GET /backend/v3/storage/overview`
- `GET /backend/v3/storage/providers`
- `POST /backend/v3/storage/providers`
- `PATCH /backend/v3/storage/providers/{providerId}`
- `POST /backend/v3/storage/providers/{providerId}/health-check`
- `GET /backend/v3/storage/buckets`
- `POST /backend/v3/storage/buckets`
- `PATCH /backend/v3/storage/buckets/{bucketId}`
- `GET /backend/v3/storage/quotas`
- `POST /backend/v3/storage/quotas`
- `PATCH /backend/v3/storage/quotas/{policyId}`
- `GET /backend/v3/storage/usage`
- `GET /backend/v3/storage/usage/ledger`
- `GET /backend/v3/storage/usage/snapshots`
- `GET /backend/v3/file-slots`
- `POST /backend/v3/file-slots`
- `PATCH /backend/v3/file-slots/{slotCode}`
- `GET /backend/v3/files`
- `GET /backend/v3/files/{fileId}`
- `GET /backend/v3/files/{fileId}/versions`
- `GET /backend/v3/files/{fileId}/bindings`
- `GET /backend/v3/files/{fileId}/access-logs`
- `POST /backend/v3/files/{fileId}/lock`
- `POST /backend/v3/files/{fileId}/unlock`
- `POST /backend/v3/files/{fileId}/restore`
- `DELETE /backend/v3/files/{fileId}`
- `GET /backend/v3/drive/spaces`
- `GET /backend/v3/drive/spaces/{spaceId}/nodes`
- `GET /backend/v3/drive/nodes/{nodeId}/permissions`
- `PATCH /backend/v3/drive/nodes/{nodeId}/permissions`
- `GET /backend/v3/drive/share-links`
- `PATCH /backend/v3/drive/share-links/{shareLinkId}`
- `POST /backend/v3/drive/share-links/{shareLinkId}/revoke`
- `GET /backend/v3/security/files/scans`
- `POST /backend/v3/security/files/scans/{scanId}/retry`
- `GET /backend/v3/security/files/dlp-results`
- `GET /backend/v3/security/files/audit-logs`
- `POST /backend/v3/storage/reconciliation-runs`
- `GET /backend/v3/storage/reconciliation-runs`
- `GET /backend/v3/storage/reconciliation-runs/{runId}`
- `POST /backend/v3/storage/gc-jobs`

Backend APIs must support cursor pagination, admin RBAC, audit logging,
idempotency keys for commands, request IDs, and dry-run for high-risk bulk
operations.

Storage provider, bucket, and quota-policy create commands are configuration
commands, not transport operations. They must be exposed through semantic SDK
methods such as `oss.providers.create`, `oss.buckets.create`, and
`oss.quotas.create`, and each command must include an explicit
`idempotencyKey` in addition to `requestId`.

## Admin Product Design

Admin must be a file platform governance console, not only a file browser.

Modules:

1. Overview dashboard
   - Tenant usage, organization usage, user usage, app usage.
   - Upload and download trends.
   - Upload failure rate.
   - Provider health.
   - Scan queue and security findings.
   - Reconciliation and garbage collection state.

2. Storage providers
   - S3-compatible provider configuration.
   - Capability matrix.
   - Health checks.
   - Credential reference management.

3. Buckets and storage policy
   - Logical bucket mapping.
   - Encryption and KMS policy.
   - Object key prefix policy.
   - Lifecycle and storage class policy.
   - Public access block validation.

4. Quota and package policy
   - Tenant, organization, user, app, and space quotas.
   - Single-file limits.
   - Daily upload and download limits.
   - Version and trash retention limits.
   - Quota reservation monitoring.

5. File slots and app integration
   - Slot registry.
   - MIME and size policy.
   - Cardinality policy.
   - Scan, variant, retention, lifecycle policy references.
   - Slot usage examples.

6. File and drive management
   - Browse tenant, organization, user, and space files.
   - File detail, versions, bindings, object details.
   - Lock, unlock, restore, delete, and inspect.

7. Permission and sharing management
   - ACL inspection.
   - Effective permission view.
   - Share links.
   - Revocation and risk review.

8. Security center
   - Scan verdicts.
   - DLP findings.
   - MIME spoofing findings.
   - Virus and malware quarantine.
   - Legal hold and retention.

9. Indexing and synchronization
   - Change log lag.
   - Search indexing state.
   - Preview and thumbnail job state.
   - Permission cache rebuild.

10. Operations and reconciliation
    - Object inventory import.
    - Missing object detection.
    - Orphan object detection.
    - Checksum mismatch detection.
    - Usage counter replay.
    - GC job management.

## App Product Design

App-facing product capabilities:

- My Drive
- Organization Drive
- Shared with me
- Recent files
- Favorites
- Trash
- Upload center
- File picker
- File preview drawer
- Attachment manager
- Image/icon uploader
- Storage usage indicator

Reusable UI blocks:

- `FileUploadButton`
- `FileDropzone`
- `FileUploadQueue`
- `FilePickerDialog`
- `FilePickerInline`
- `FilePreview`
- `FileThumbnail`
- `FileAttachmentList`
- `ImageAssetUpload`
- `IconAssetUpload`
- `StorageUsageBar`
- `StorageQuotaCard`

Business components should accept `slotCode` and `target`, not object-storage
fields.

Example:

```tsx
<FileUploadButton
  slotCode="user.avatar"
  target={{ type: "user_profile", id: userId }}
  onCompleted={(result) => setAvatar(result.fileRef)}
/>
```

## Package Design

The package model follows this dependency direction:

```text
contracts
  <- sdk-ports
  <- sdk-adapter
  <- service
  <- UI components
  <- product pages

contracts
  <- api-contracts
  <- generated SDKs / SDK adapters
```

Phase 1 TypeScript packages:

- `@sdkwork/file-contracts`
- `@sdkwork/file-sdk-ports`
- `@sdkwork/file-upload-client`
- `@sdkwork/file-schema`
- `@sdkwork/file-api-contracts`
- `@sdkwork/file-sdk-generation`
- `@sdkwork/file-sdk-adapter`
- `@sdkwork/file-service`
- `@sdkwork/file-upload-pc-react`
- `@sdkwork/file-picker-pc-react`
- `@sdkwork/file-attachments-pc-react`
- `@sdkwork/file-preview-pc-react`
- `@sdkwork/drive-pc-react`
- `@sdkwork/storage-usage-pc-react`
- `@sdkwork/file-platform-pc-react`

Future TypeScript packages:

- `@sdkwork/drive-contracts`
- `@sdkwork/drive-sdk-ports`
- `@sdkwork/drive-service`
- `@sdkwork/storage-contracts`
- `@sdkwork/storage-admin-sdk-ports`
- `@sdkwork/storage-admin-service`
- `@sdkwork/file-platform-admin-pc-react`
- `@sdkwork/image-asset-pc-react`
- `@sdkwork/media-library-pc-react`

Native Rust packages:

- `sdkwork-file-domain-rust`
- `sdkwork-file-storage-sqlx-rust`
- `sdkwork-file-object-s3-rust`
- `sdkwork-file-upload-rust`
- `sdkwork-file-http-rust`
- `sdkwork-file-worker-rust`
- `sdkwork-file-bootstrap-rust`

Forbidden dependencies:

- Contracts must not depend on React or generated SDK clients.
- Services must not depend on React.
- App frontend components must not depend on storage admin services.
- Business applications must not call S3 directly.
- Business applications must not persist object keys or presigned URLs.

## Phase 1 Scope

Phase 1 should produce a complete foundational upload and file-binding loop.
It also produces a versioned schema catalog and PostgreSQL migration generator
so database table, constraint, index, append-only, and storage-boundary rules
are executable standards rather than prose-only documentation.
It produces app and backend OpenAPI contract documents derived from the
canonical route constants so generated SDKs, admin RBAC metadata, operation ids,
and app/backend authority separation are standardized before concrete HTTP
adapters are added. Every OpenAPI operation id must have a matching canonical
operation contract that records surface, kind, route, and tag; OpenAPI and
contract sets must match exactly. Every templated OpenAPI route must derive a
required `in: path` parameter for each `{name}` segment so generated SDK
signatures match route variables without duplicated hand-written metadata.
Adapter-facing read/list operations must define query parameters for `requestId`,
pagination, business target filters, storage usage scopes, logical bucket
filters, reconciliation filters, and usage ledger/snapshot time windows. App
upload, file-access, file-binding, and
backend storage commands must bind explicit JSON request body schemas so
generated SDKs receive complete typed command inputs.
App upload command responses must also bind explicit JSON schemas so generated
SDKs expose typed upload-session, presigned-part, completion, and abort results.
Foundation read/list responses must be typed as well: app file list/detail,
binding list, drive space/node list, and current usage responses expose only
stable storage-safe resources, while backend storage provider, bucket, quota,
reconciliation, usage counter, usage ledger, and usage snapshot list responses
use explicit admin resource envelopes. Backend storage mutation responses return
the same typed admin resource schemas, not generic objects.
The OpenAPI standard is global: every app and backend operation must provide a
typed JSON `200` response, and every non-GET command must provide a JSON request
body whose schema includes `requestId`. This applies across file, drive,
storage, file-slot, security, and audit APIs so generated SDKs never fall back
to weak response types or command inputs without tracing.
Each OpenAPI surface must publish only component schemas reachable from its own
paths. App SDK artifacts must not carry backend admin governance, security, or
audit schemas unless an app operation references them. After pruning, every
remaining `#/components/schemas/*` reference must resolve inside the same
surface document so generated SDK input cannot contain dangling schema refs.
OpenAPI object schemas must be bounded: `additionalProperties: true` is not
allowed because it generates weak DTOs and hides producer/consumer drift.
Map-like fields must declare an explicit value schema, and selection inputs such
as storage garbage-collection criteria must be structured schemas.
Reusable platform type fields must be exported as OpenAPI enums sourced from
the canonical contracts, including upload mode, drive node type, drive space
type, and storage usage scope type.
It also produces the generated SDK adapter boundary that accepts approved
semantic app/backend SDK wrappers and maps them into the file component service
and backend admin storage port. This boundary is intentionally transport-free:
it must not call raw HTTP, build auth headers, or fork generated SDK output.
The backend admin storage port covers provider, bucket, quota, usage counter,
usage ledger, usage snapshot, reconciliation run, and garbage-collection job
operations through generated SDK wrapper methods. Provider, bucket, and
quota-policy configuration create commands are part of this phase and require
explicit idempotency keys so admin consoles and automation can retry safely
without duplicating storage configuration.
Adapter validation requires every mapped command to have a JSON request body and
every mapped operation to have a typed JSON `200` response, keeping generated
SDK wrappers aligned with OpenAPI instead of drifting into weak DTOs.
The SDK generation package publishes deterministic app/backend TypeScript SDK
targets and OpenAPI JSON artifacts for the repository-standard generator, with
package names `@sdkwork/file-app-sdk` and `@sdkwork/file-backend-sdk`.
Its manifest validation must delegate back to the API contract standard, so
custom source documents cannot bypass route, operation, typed response,
command request, surface pruning, or schema `$ref` resolution checks before
being exported as SDK inputs.
It also defines the standard SDK family file layout under `sdks/file-app-sdk`
and `sdks/file-backend-sdk`: each family has `.sdkwork-assembly.json`,
`openapi/<family>.openapi.json`, `openapi/<family>.sdkgen.json`, and README
content. A root `sdks/file-sdk-generation-manifest.json` records deterministic
file hashes so generated SDK inputs can be checked for drift before code
generation. The same package provides a safe artifact materializer and drift
checker that operate only on planned files, reject unsafe paths or stale hashes,
and never delete unplanned operator-owned files. Repository tooling uses the
standard Node filesystem host, which resolves all artifact paths under the
workspace root and rejects direct read or write attempts that escape that root.
The repository command surface is fixed as `pnpm.cmd sdk:file:artifacts:check`
and `pnpm.cmd sdk:file:artifacts:write`, with package-local equivalents on
`@sdkwork/file-sdk-generation`. Check mode is the safe default, returns a
non-zero exit code for missing or drifted planned artifacts, and emits a
machine-readable JSON report when `--json` is supplied. Write mode materializes
only the planned app/backend file SDK family inputs and then the same check
must report every planned artifact as unchanged.

Tables:

- `object_provider`
- `object_bucket`
- `object_blob`
- `object_tag`
- `upload_session`
- `upload_presign_grant`
- `upload_part`
- `upload_completion_attempt`
- `file_node`
- `file_version`
- `file_metadata_common`
- `drive_space`
- `drive_node`
- `drive_acl_entry`
- `drive_change_log`
- `file_slot_definition`
- `file_binding`
- `storage_quota_policy`
- `storage_quota_reservation`
- `storage_usage_ledger`
- `storage_usage_counter`
- `storage_usage_snapshot`
- `storage_reconciliation_run`
- `storage_reconciliation_item`
- `storage_gc_job`
- `file_security_scan`
- `file_audit_log`

Capabilities:

- S3-compatible provider configuration.
- Logical bucket configuration.
- Presigned single PUT upload.
- Presigned multipart upload.
- Upload session complete and abort.
- File asset and version creation.
- Minimal drive space and node model.
- Business file slots and file bindings.
- Tenant, organization, user, app, and space storage usage counters.
- Quota reservation and ledger-driven accounting.
- Basic ACL.
- Download URL issuance.
- Upload and download audit.
- Admin overview, provider, bucket, quota, slot, usage, and audit pages.
- App upload button/dropzone and file picker.

Database enum boundaries must align with OpenAPI enum boundaries. Provider
type, logical bucket scope, upload mode, drive space type, drive node type,
quota scope, and usage scope columns use PostgreSQL check constraints sourced
from the canonical contracts.

## Phase 2 Scope

- Trash and restore flows.
- Share links.
- Version retention policy.
- Thumbnail generation.
- Basic preview.
- Search index.
- Permission effective cache.
- Drive change delta API.
- Object reconciliation.
- Garbage collection.

## Phase 3 Scope

- DLP.
- Legal hold.
- Retention.
- Object Lock integration.
- Cost allocation.
- Cold storage lifecycle.
- AI search and embedding index.
- Desktop sync.
- Mobile weak-network resumable upload enhancements.

## Verification Requirements

Implementation must include focused tests for:

- Upload session idempotency.
- Multipart complete retry.
- Quota reservation concurrency.
- Usage ledger and counter replay consistency.
- Tenant isolation.
- Organization usage accounting.
- User usage accounting.
- Space usage accounting.
- ACL enforcement.
- Download URL permission checks.
- Presigned URL expiry and grant audit.
- Scan rejection states.
- File binding cardinality.
- Drive node name conflict.
- API schema contracts.
- Admin RBAC.
- Frontend slot-policy enforcement.

## Open Questions

- Which S3-compatible provider should be the default local development target:
  MinIO, localstack, or a project-owned test adapter?
- Should phase 1 require virus scanning before activation, or allow a policy
  mode where files are active after checksum verification and scanned
  asynchronously?
- Should file search be included in phase 1 as metadata-only search, or deferred
  completely to phase 2?
- Should storage quota be enforced on logical bytes, billable bytes, or both by
  default?

