-- sdkwork:seed common
-- Storage-center bootstrap data for the tenant that owns the production
-- console (tenant 100001, organization 0).
--
-- Why this exists
-- ---------------
-- `/backend/v3/api/storage/defaultBuckets` resolves a logical scope to a
-- bucket row in `storage_bucket` through `storage_default_bucket_policy`. With
-- no seeded rows the console opened with an empty default-bucket section even
-- after the governance tables existed, so an operator still had to hand-create
-- a cloud account and a bucket before the first upload could work.
--
-- The deployment default is Tencent Cloud COS: every bucket below points at the
-- built-in `tencent_cos` provider, so the console opens on the SDKWork primary
-- cloud and the operator only has to replace the placeholder credential in the
-- account center (`iam_provider_account`, created by the Drive storage bootstrap)
-- to complete the integration.
--
-- The provider rows are reference data for the *governance* plane only. The
-- object provider account catalog is IAM-owned and the object bytes are
-- Drive-owned (`dr_drive_storage_provider`); nothing here duplicates either.
--
-- Idempotency: every insert is `ON CONFLICT DO NOTHING`, so re-running the seed
-- never rewrites an operator edit (a renamed bucket, a re-pointed default scope)
-- and repeated seeds are no-ops.
-- Deterministic ids: fixed small ids, far below the Snowflake range produced by
-- `next_cloud_runtime_id`, so runtime inserts can never collide with seed rows.

INSERT INTO storage_provider
    (id, uuid, tenant_id, organization_id, data_scope, status, version,
     name, supplier_code, provider_type, endpoint_url, region)
VALUES
    (9001, 'seed-storage-provider-s3-compatible',              100001, 0, 0, 1, 0, 'Amazon S3 (compatible)',             's3_compatible',                's3_compatible',                'https://s3.us-east-1.amazonaws.com',            'us-east-1'),
    (9002, 'seed-storage-provider-aliyun-oss',                 100001, 0, 0, 1, 0, 'Alibaba Cloud OSS',                  'aliyun_oss',                   'aliyun_oss',                   'https://oss-cn-hangzhou.aliyuncs.com',          'cn-hangzhou'),
    (9003, 'seed-storage-provider-tencent-cos',                100001, 0, 0, 1, 0, 'Tencent Cloud COS',                  'tencent_cos',                  'tencent_cos',                  'https://cos.ap-guangzhou.myqcloud.com',         'ap-guangzhou'),
    (9004, 'seed-storage-provider-huawei-obs',                 100001, 0, 0, 1, 0, 'Huawei Cloud OBS',                   'huawei_obs',                   'huawei_obs',                   'https://obs.cn-north-1.myhuaweicloud.com',      'cn-north-1'),
    (9005, 'seed-storage-provider-volcengine-tos',             100001, 0, 0, 1, 0, 'Volcengine TOS',                     'volcengine_tos',               'volcengine_tos',               'https://tos-cn-beijing.volces.com',             'cn-beijing'),
    (9006, 'seed-storage-provider-google-cloud-storage',       100001, 0, 0, 1, 0, 'Google Cloud Storage',               'google_cloud_storage',         'google_cloud_storage',         'https://storage.googleapis.com',                'us-central1'),
    (9007, 'seed-storage-provider-baidu-bos',                  100001, 0, 0, 1, 0, 'Baidu Object Storage',               'baidu_bos',                    'baidu_bos',                    'https://bj.bcebos.com',                         'bj'),
    (9008, 'seed-storage-provider-kingsoft-ks3',               100001, 0, 0, 1, 0, 'Kingsoft Cloud KS3',                 'kingsoft_ks3',                 'kingsoft_ks3',                 'https://ks3-cn-beijing.ksyuncs.com',            'BEIJING'),
    (9009, 'seed-storage-provider-qiniu-kodo',                 100001, 0, 0, 1, 0, 'Qiniu Kodo',                         'qiniu_kodo',                   'qiniu_kodo',                   'https://s3-cn-east-1.qiniucs.com',              'cn-east-1'),
    (9010, 'seed-storage-provider-china-mobile-ecloud',        100001, 0, 0, 1, 0, 'China Mobile Ecloud',                'china_mobile_ecloud',          'china_mobile_ecloud',          'https://eos-wuxi-1.cmecloud.cn',                'wuxi-1'),
    (9011, 'seed-storage-provider-china-telecom-eos',          100001, 0, 0, 1, 0, 'China Telecom EOS',                  'china_telecom_eos',            'china_telecom_eos',            'https://eos-shanghai-1.ctyun.cn',               'shanghai'),
    (9012, 'seed-storage-provider-china-unicom-wo',            100001, 0, 0, 1, 0, 'China Unicom Object Storage',        'china_unicom_wo',              'china_unicom_wo',              'https://obs-hangzhou.cucloud.cn',               'hangzhou'),
    (9013, 'seed-storage-provider-minio',                      100001, 0, 0, 1, 0, 'MinIO',                              'minio',                        'minio',                        'https://minio.internal:9000',                   'us-east-1'),
    (9014, 'seed-storage-provider-cloudflare-r2',              100001, 0, 0, 1, 0, 'Cloudflare R2',                      'cloudflare_r2',                'cloudflare_r2',                'https://r2.cloudflarestorage.com',              'auto'),
    (9015, 'seed-storage-provider-backblaze-b2',               100001, 0, 0, 1, 0, 'Backblaze B2',                       'backblaze_b2',                 'backblaze_b2',                 'https://s3.us-west-004.backblazeb2.com',        'us-west-004'),
    (9016, 'seed-storage-provider-wasabi',                     100001, 0, 0, 1, 0, 'Wasabi',                             'wasabi',                       'wasabi',                       'https://s3.us-east-1.wasabisys.com',            'us-east-1'),
    (9017, 'seed-storage-provider-digitalocean-spaces',        100001, 0, 0, 1, 0, 'DigitalOcean Spaces',                'digitalocean_spaces',          'digitalocean_spaces',          'https://nyc3.digitaloceanspaces.com',           'nyc3'),
    (9018, 'seed-storage-provider-linode-object-storage',      100001, 0, 0, 1, 0, 'Linode Object Storage',              'linode_object_storage',        'linode_object_storage',        'https://us-east-1.linodeobjects.com',           'us-east-1'),
    (9019, 'seed-storage-provider-vultr-object-storage',       100001, 0, 0, 1, 0, 'Vultr Object Storage',               'vultr_object_storage',         'vultr_object_storage',         'https://ewr1.vultrobjects.com',                 'ewr1'),
    (9020, 'seed-storage-provider-scaleway-object-storage',    100001, 0, 0, 1, 0, 'Scaleway Object Storage',            'scaleway_object_storage',      'scaleway_object_storage',      'https://s3.fr-par.scw.cloud',                   'fr-par'),
    (9021, 'seed-storage-provider-oracle-cloud-storage',       100001, 0, 0, 1, 0, 'Oracle Cloud Object Storage',        'oracle_cloud_storage',         'oracle_cloud_storage',         'https://objectstorage.us-ashburn-1.oraclecloud.com', 'us-ashburn-1'),
    (9022, 'seed-storage-provider-ibm-cos',                    100001, 0, 0, 1, 0, 'IBM Cloud Object Storage',           'ibm_cos',                      'ibm_cos',                      'https://s3.us-east.cloud-object-storage.appdomain.cloud', 'us-east'),
    (9023, 'seed-storage-provider-alibaba-cloud-international', 100001, 0, 0, 1, 0, 'Alibaba Cloud OSS International',    'alibaba_cloud_international',  'alibaba_cloud_international',  'https://oss-ap-southeast-1.aliyuncs.com',       'ap-southeast-1'),
    (9024, 'seed-storage-provider-tencent-cloud-international', 100001, 0, 0, 1, 0, 'Tencent Cloud COS International',    'tencent_cloud_international',  'tencent_cloud_international',  'https://cos.ap-singapore.myqcloud.com',         'ap-singapore'),
    (9025, 'seed-storage-provider-local-filesystem',           100001, 0, 0, 1, 0, 'Built-in Local Filesystem',          'local_filesystem',             'local_filesystem',             'file:///var/lib/sdkwork-drive',                 '')
ON CONFLICT DO NOTHING;

-- One Tencent Cloud COS bucket per logical scope. The default-bucket policy
-- table requires `bucket_logical_scope` to equal the policy's `logical_scope`,
-- so the scope is carried on the bucket row exactly as the governance contract
-- expects. Bucket names are distinct per scope so the unique
-- (tenant, organization, provider, name) key stays stable across re-runs.
INSERT INTO storage_bucket
    (id, uuid, tenant_id, organization_id, data_scope, status, version,
     provider_id, bucket_name, bucket_region, logical_scope)
SELECT
    scope.bucket_id,
    scope.bucket_uuid,
    100001,
    0,
    0,
    1,
    0,
    9003,
    'sdkwork-cos-' || replace(scope.logical_scope, '_', '-'),
    'ap-guangzhou',
    scope.logical_scope
FROM (VALUES
    (9101, 'seed-storage-bucket-cos-migration-import',    'migration_import'),
    (9102, 'seed-storage-bucket-cos-system-archive',      'system_archive'),
    (9103, 'seed-storage-bucket-cos-system-quarantine',   'system_quarantine'),
    (9104, 'seed-storage-bucket-cos-system-temp',         'system_temp'),
    (9105, 'seed-storage-bucket-cos-system-variant',      'system_variant'),
    (9106, 'seed-storage-bucket-cos-tenant-private',      'tenant_private'),
    (9107, 'seed-storage-bucket-cos-tenant-public-asset', 'tenant_public_asset')
) AS scope(bucket_id, bucket_uuid, logical_scope)
ON CONFLICT DO NOTHING;

-- Tencent Cloud COS is the deployment's default cloud. Each logical scope
-- resolves to its COS bucket so the console opens fully configured; the
-- operator completes the integration by replacing the account credential.
INSERT INTO storage_default_bucket_policy
    (id, uuid, tenant_id, organization_id, data_scope, status, version,
     logical_scope, bucket_id, bucket_logical_scope, updated_by, reason, request_id)
SELECT
    policy.policy_id,
    policy.policy_uuid,
    100001,
    0,
    0,
    1,
    0,
    policy.logical_scope,
    policy.bucket_id,
    policy.logical_scope,
    0,
    '默认云存储（腾讯云 COS）',
    ''
FROM (VALUES
    (9201, 'seed-storage-default-bucket-migration-import',    9101, 'migration_import'),
    (9202, 'seed-storage-default-bucket-system-archive',      9102, 'system_archive'),
    (9203, 'seed-storage-default-bucket-system-quarantine',   9103, 'system_quarantine'),
    (9204, 'seed-storage-default-bucket-system-temp',         9104, 'system_temp'),
    (9205, 'seed-storage-default-bucket-system-variant',      9105, 'system_variant'),
    (9206, 'seed-storage-default-bucket-tenant-private',      9106, 'tenant_private'),
    (9207, 'seed-storage-default-bucket-tenant-public-asset', 9107, 'tenant_public_asset')
) AS policy(policy_id, policy_uuid, bucket_id, logical_scope)
ON CONFLICT DO NOTHING;
