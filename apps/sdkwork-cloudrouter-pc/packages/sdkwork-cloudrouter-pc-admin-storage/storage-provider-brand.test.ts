/**
 * Brand-resolution guard for the storage provider inventory.
 *
 * The provider column is the operator's main recognition cue, so the fallback
 * rules must not regress silently: a vendor without a published vector mark has
 * to degrade to a stable monogram instead of borrowing an unrelated logo, the
 * local filesystem must never look like a cloud vendor, and every embedded mark
 * has to stay a single valid 24x24 path with its published brand colour.
 *
 * Run: node --import tsx --test storage-provider-brand.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kindMonogram,
  resolveStorageProviderBrand,
  storageProviderBrandInk,
  storageProviderBrandKinds,
} from './src/components/storage-provider-brand';
import { STORAGE_PROVIDER_BRAND_ICONS } from './src/components/storage-provider-brand-icons.generated';

test('major cloud vendors resolve to their brand mark', () => {
  for (const kind of ['aliyun_oss', 's3_compatible', 'cloudflare_r2', 'minio', 'huawei_obs', 'google_cloud_storage', 'wasabi']) {
    const brand = resolveStorageProviderBrand(kind);
    assert.equal(brand.kind, 'brand', `${kind} must resolve to a brand mark`);
  }
});

test('vendors without a published mark degrade to a curated monogram', () => {
  const cases: Record<string, string> = {
    tencent_cos: 'TC',
    tencent_cloud_international: 'TC',
    china_mobile_ecloud: 'CM',
    china_telecom_eos: 'CT',
    china_unicom_wo: 'CU',
    kingsoft_ks3: 'KS',
    qiniu_kodo: 'QN',
    volcengine_tos: 'VE',
    linode_object_storage: 'LN',
  };
  for (const [kind, monogram] of Object.entries(cases)) {
    const brand = resolveStorageProviderBrand(kind);
    assert.equal(brand.kind, 'monogram', `${kind} must not borrow a vendor logo`);
    if (brand.kind === 'monogram') {
      assert.equal(brand.monogram, monogram);
    }
    assert.equal(kindMonogram(kind), monogram);
  }
});

test('non-vendor kinds never resolve to a vendor mark', () => {
  assert.equal(resolveStorageProviderBrand('local_filesystem').kind, 'local');
  assert.equal(resolveStorageProviderBrand('custom').kind, 'generic');
  // `custom:<slug>` is a parameterized kind: still the generic endpoint.
  assert.equal(resolveStorageProviderBrand('custom:minio').kind, 'generic');
  assert.equal(resolveStorageProviderBrand('CUSTOM:aliyun_oss').kind, 'generic');
});

test('unknown kinds fall back deterministically', () => {
  assert.deepEqual(resolveStorageProviderBrand('never_heard_of_it'), resolveStorageProviderBrand('never_heard_of_it'));
  assert.equal(resolveStorageProviderBrand('').kind, 'monogram');
  assert.equal(kindMonogram(''), '?');
});

test('light brand colours carry a legible ink override', () => {
  const gcs = STORAGE_PROVIDER_BRAND_ICONS.google_cloud_storage;
  assert.equal(gcs.hex, 'AECBFA');
  assert.equal(storageProviderBrandInk(gcs), '#4285F4');
});

test('brand colours match the published official value', () => {
  const expected: Record<string, string> = {
    aliyun_oss: 'FF6A00',
    s3_compatible: 'FF9900',
    cloudflare_r2: 'F38020',
    minio: 'C72E49',
    wasabi: '01CD3E',
    backblaze_b2: 'E21E29',
    digitalocean_spaces: '0080FF',
    scaleway_object_storage: '4F0599',
    vultr_object_storage: '007BFC',
    huawei_obs: 'FF0000',
    baidu_bos: '2932E1',
  };
  for (const [kind, hex] of Object.entries(expected)) {
    const brand = resolveStorageProviderBrand(kind);
    assert.equal(brand.kind, 'brand', `${kind} must resolve to a brand mark`);
    if (brand.kind === 'brand') {
      assert.equal(brand.icon.hex, hex, `${kind} must use its published brand colour`);
    }
  }
});

test('every embedded mark is a single usable 24x24 path', () => {
  const kinds = storageProviderBrandKinds();
  assert.ok(kinds.length >= 12);
  for (const kind of kinds) {
    const icon = STORAGE_PROVIDER_BRAND_ICONS[kind as keyof typeof STORAGE_PROVIDER_BRAND_ICONS];
    assert.match(icon.path, /^[Mm]/, `${kind} path must start with a moveto command`);
    assert.ok(!icon.path.includes('<'), `${kind} path must be bare path data`);
    assert.match(icon.hex, /^[0-9A-F]{6}$/, `${kind} hex must be a bare 6-digit colour`);
    if (icon.ink !== undefined) {
      assert.match(icon.ink, /^[0-9A-F]{6}$/, `${kind} ink must be a bare 6-digit colour`);
    }
  }
});
