#!/usr/bin/env python3
"""Migrate CloudRouter storage providers/buckets to Drive storage provider volumes.

The CloudRouter storage center no longer owns provider/bucket configuration:
the surface moved to sdkwork-drive (`/backend/v3/api/drive/storage/*`). This
script copies `object_provider` + `object_bucket` rows into
`dr_drive_storage_provider` (one Drive provider per bucket; Drive is
single-bucket per provider), preserving plain credential references verbatim
and keeping vault/kms/secret/env references as-is.

The script is idempotent: re-running it updates already-migrated rows in
place. It never deletes source rows; dropping `object_provider` /
`object_bucket` after a verified migration is a manual follow-up step.

Usage:
  python -B tools/migrate_storage_to_drive_providers.py --source-db <url> --target-db <url> --dry-run
  python -B tools/migrate_storage_to_drive_providers.py --source-db <url> --target-db <url> --apply
  python -B tools/migrate_storage_to_drive_providers.py --source-db <url> --target-db <url> --sql out.sql
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

# CloudRouter provider_type -> Drive provider_kind mapping.
# Drive built-in kinds: s3_compatible, google_cloud_storage, aliyun_oss,
# tencent_cos, huawei_obs, volcengine_tos, local_filesystem, custom:<vendor>.
PROVIDER_KIND_MAP = {
    "aws_s3": "s3_compatible",
    "minio": "s3_compatible",
    "cloudflare_r2": "s3_compatible",
    "local_dev_s3": "s3_compatible",
    "s3_compatible": "s3_compatible",
    "oss_s3": "aliyun_oss",
    "cos_s3": "tencent_cos",
    "huawei_obs": "huawei_obs",
    "volcengine_tos": "volcengine_tos",
    "baidu_bos": "custom:baidu_bos",
    "qiniu_kodo": "custom:qiniu_kodo",
    "jdcloud_oss": "custom:jdcloud_oss",
}

STATUS_MAP = {
    "active": "active",
    "archived": "disabled",
    "disabled": "disabled",
}

MIGRATION_OPERATOR = "storage-migration"


@dataclass(frozen=True)
class ProviderRow:
    provider_uuid: str
    tenant_id: str
    organization_id: str
    provider_type: str
    endpoint_url: str | None
    region: str | None
    credential_ref: str | None
    name: str
    path_style_enabled: bool
    status: str


@dataclass(frozen=True)
class BucketRow:
    bucket_uuid: str
    tenant_id: str
    organization_id: str
    provider_uuid: str
    bucket_name: str
    bucket_region: str | None
    status: str


def load_rows(conn, *, dry_run: bool) -> tuple[list[ProviderRow], list[BucketRow]]:
    providers: list[ProviderRow] = []
    buckets: list[BucketRow] = []
    if dry_run:
        return providers, buckets
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT uuid, tenant_id, organization_id, provider_type,
                   endpoint_url, region, credential_ref, name,
                   path_style_enabled, status
            FROM object_provider
            WHERE status <> 'deleted'
            ORDER BY uuid
            """
        )
        for row in cur.fetchall():
            providers.append(
                ProviderRow(
                    provider_uuid=row[0],
                    tenant_id=row[1],
                    organization_id=row[2] or "0",
                    provider_type=row[3],
                    endpoint_url=row[4],
                    region=row[5],
                    credential_ref=row[6],
                    name=row[7] or row[0],
                    path_style_enabled=bool(row[8]),
                    status=row[9] or "active",
                )
            )
        cur.execute(
            """
            SELECT uuid, tenant_id, organization_id, provider_id,
                   bucket_name, bucket_region, status
            FROM object_bucket
            WHERE status <> 'deleted'
            ORDER BY uuid
            """
        )
        for row in cur.fetchall():
            buckets.append(
                BucketRow(
                    bucket_uuid=row[0],
                    tenant_id=row[1],
                    organization_id=row[2] or "0",
                    provider_uuid=row[3],
                    bucket_name=row[4],
                    bucket_region=row[5],
                    status=row[6] or "active",
                )
            )
    return providers, buckets


def strict_tls_for(endpoint_url: str | None) -> bool:
    return not (endpoint_url or "").startswith("http://")


def build_provider_sql(
    provider: ProviderRow,
    bucket: BucketRow,
) -> str:
    # drive 表约束预检：id VARCHAR(64)、display_name/bucket VARCHAR(255)、
    # credential_ref VARCHAR(255)、endpoint_url 长度；超限直接失败而非静默截断。
    if len(bucket.bucket_uuid) > 64:
        raise ValueError(f"bucket uuid {bucket.bucket_uuid} exceeds dr_drive_storage_provider.id limit (64)")
    if len(provider.name or "") > 255:
        raise ValueError(f"provider name for {bucket.bucket_uuid} exceeds display_name limit (255)")
    if len(bucket.bucket_name) > 255:
        raise ValueError(f"bucket name {bucket.bucket_name} exceeds bucket limit (255)")
    if len(provider.credential_ref or "") > 255:
        raise ValueError(f"credential_ref for {bucket.bucket_uuid} exceeds limit (255)")
    kind = PROVIDER_KIND_MAP.get(provider.provider_type, "s3_compatible")
    endpoint = provider.endpoint_url or ""
    region = bucket.bucket_region or provider.region or ""
    credential_ref = provider.credential_ref or ""
    display_name = provider.name.replace("'", "''")
    bucket_name = bucket.bucket_name.replace("'", "''")
    endpoint_safe = endpoint.replace("'", "''")
    region_safe = region.replace("'", "''")
    credential_safe = credential_ref.replace("'", "''")
    status = STATUS_MAP.get(bucket.status, "active")
    strict_tls = "TRUE" if strict_tls_for(endpoint) else "FALSE"
    path_style = "TRUE" if provider.path_style_enabled else "FALSE"
    return (
        "INSERT INTO dr_drive_storage_provider (\n"
        "    id, tenant_id, organization_id, display_name, root_entry_id,\n"
        "    provider_kind, endpoint_url, region, bucket, path_style, strict_tls,\n"
        "    credential_ref, server_side_encryption_mode, default_storage_class,\n"
        "    status, version, created_by, updated_by\n"
        ") VALUES (\n"
        f"    '{bucket.bucket_uuid}', '{bucket.tenant_id}', '{bucket.organization_id}', "
        f"'{display_name}', '{bucket.bucket_uuid}',\n"
        f"    '{kind}', '{endpoint_safe}', '{region_safe}', '{bucket_name}', "
        f"{path_style}, {strict_tls},\n"
        f"    '{credential_safe}', NULL, NULL,\n"
        f"    '{status}', 1, '{MIGRATION_OPERATOR}', '{MIGRATION_OPERATOR}'\n"
        ") ON CONFLICT (id) DO UPDATE SET\n"
        "    tenant_id = EXCLUDED.tenant_id,\n"
        "    organization_id = EXCLUDED.organization_id,\n"
        "    display_name = EXCLUDED.display_name,\n"
        "    provider_kind = EXCLUDED.provider_kind,\n"
        "    endpoint_url = EXCLUDED.endpoint_url,\n"
        "    region = EXCLUDED.region,\n"
        "    bucket = EXCLUDED.bucket,\n"
        "    path_style = EXCLUDED.path_style,\n"
        "    strict_tls = EXCLUDED.strict_tls,\n"
        "    credential_ref = EXCLUDED.credential_ref,\n"
        "    status = EXCLUDED.status,\n"
        "    version = dr_drive_storage_provider.version + 1,\n"
        "    updated_by = EXCLUDED.updated_by,\n"
        "    updated_at = now();\n"
    )


def run_dry_run(providers: list[ProviderRow], buckets: list[BucketRow]) -> None:
    if not providers and not buckets:
        print("Dry-run: source tables are empty or the database is not reachable; nothing to migrate.")
        return
    print(f"Dry-run plan:")
    print(f"  providers loaded: {len(providers)}")
    print(f"  buckets loaded:   {len(buckets)}")
    by_provider = {bucket.provider_uuid: bucket for bucket in buckets}
    print(f"  bucket -> drive provider mappings: {len(by_provider)}")
    for bucket in buckets:
        provider = next(
            (p for p in providers if p.provider_uuid == bucket.provider_uuid),
            None,
        )
        if provider is None:
            print(f"  WARN bucket {bucket.bucket_uuid} ({bucket.bucket_name}) references "
                  f"missing provider {bucket.provider_uuid}; skipped")
            continue
        kind = PROVIDER_KIND_MAP.get(provider.provider_type, "s3_compatible")
        print(f"  -> {bucket.bucket_uuid} provider_kind={kind} "
              f"bucket={bucket.bucket_name} endpoint={provider.endpoint_url or ''} "
              f"credential={mask_credential(provider.credential_ref)}")


def mask_credential(ref: str | None) -> str:
    if not ref:
        return "(none)"
    if ref.startswith("plain:"):
        return "plain:***"
    return ref


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-db", required=True, help="CloudRouter PostgreSQL DSN")
    parser.add_argument("--target-db", required=True, help="Drive PostgreSQL DSN")
    parser.add_argument("--dry-run", action="store_true", help="Print the migration plan without touching data")
    parser.add_argument("--apply", action="store_true", help="Apply the migration to the target database")
    parser.add_argument("--sql", metavar="FILE", help="Write the generated SQL to FILE instead of applying")
    args = parser.parse_args()

    if not (args.dry_run or args.apply or args.sql):
        parser.error("choose one of --dry-run, --apply, or --sql")

    import psycopg2

    if args.dry_run:
        # 只读连源库取统计（失败时降级为提示）。
        try:
            conn = psycopg2.connect(args.source_db, connect_timeout=5)
            providers, buckets = load_rows(conn, dry_run=False)
            conn.close()
            run_dry_run(providers, buckets)
        except Exception as exc:  # noqa: BLE001
            print(f"Dry-run could not connect to the source database: {exc}")
            return 2
        return 0

    if args.sql:
        conn = psycopg2.connect(args.source_db, connect_timeout=5)
        providers, buckets = load_rows(conn, dry_run=False)
        conn.close()
        by_provider = {p.provider_uuid: p for p in providers}
        statements = []
        migrated = 0
        for bucket in buckets:
            provider = by_provider.get(bucket.provider_uuid)
            if provider is None:
                continue
            statements.append(build_provider_sql(provider, bucket))
            migrated += 1
        with open(args.sql, "w", encoding="utf-8") as f:
            f.write("-- Generated by tools/migrate_storage_to_drive_providers.py\n")
            f.write("-- Run against the DRIVE database.\n")
            f.write("BEGIN;\n")
            f.writelines(statements)
            f.write("COMMIT;\n")
        print(f"Wrote {migrated} provider statements to {args.sql}")
        return 0

    source = psycopg2.connect(args.source_db, connect_timeout=5)
    providers, buckets = load_rows(source, dry_run=False)
    source.close()
    by_provider = {p.provider_uuid: p for p in providers}
    statements = []
    migrated = 0
    for bucket in buckets:
        provider = by_provider.get(bucket.provider_uuid)
        if provider is None:
            continue
        statements.append(build_provider_sql(provider, bucket))
        migrated += 1
    if migrated == 0:
        print("Nothing to migrate.")
        return 0
    target = psycopg2.connect(args.target_db, connect_timeout=5)
    try:
        with target.cursor() as cur:
            for statement in statements:
                cur.execute(statement)
        target.commit()
    except Exception:
        target.rollback()
        raise
    finally:
        target.close()
    print(f"Applied {migrated} drive storage provider rows (idempotent upsert).")
    print("Source rows are untouched. Verify the Drive storage admin page, then")
    print("drop object_provider/object_bucket manually when ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
