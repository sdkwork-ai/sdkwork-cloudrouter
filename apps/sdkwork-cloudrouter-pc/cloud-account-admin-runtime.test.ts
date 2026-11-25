import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCloudAccountCreateBody,
  buildCloudAccountCredentialBody,
  buildCloudAccountUpdateBody,
  cloudAccountCredentialKindForType,
  cloudAccountRequiredCredentialFields,
  cloudAccountScopeLabelKey,
  cloudAccountStatusLabelKey,
  cloudAccountVendorLabelKey,
  emptyCloudAccountCredentialDraft,
  invalidCloudAccountDraftFields,
  isCloudAccountCredentialDraftComplete,
  isValidCloudAccountCredentialExpiry,
  missingCloudAccountDraftFields,
  parseCloudAccountCredentials,
  parseCloudAccountPage,
  readableCloudAccountScopeLevels,
  toCloudAccountRecord,
  type CloudAccountDraft,
} from './packages/sdkwork-cloudrouter-pc-admin-iam/src/cloudAccounts/cloudAccountModel.ts';

/**
 * The cloud account page is a projection over the platform IAM account center
 * (`/backend/v3/api/iam/provider_accounts`). These tests pin the parts that are
 * easy to get silently wrong: the wire projections the page parses, the
 * request bodies it sends (immutable fields never ride a PATCH), and the
 * ownership-level projection that decides which levels the admin surface may
 * offer.
 */

const accountRow = {
  id: 'iampacct-01',
  uuid: 'uuid-01',
  tenantId: '100001',
  organizationId: '0',
  scopeType: 'tenant',
  vendorCode: 'aliyun',
  accountCode: 'ops-primary',
  displayName: '运维主账号',
  accountType: 'long_term_key',
  environment: 'production',
  capabilityCodes: ['dns'],
  regionCode: 'cn-hangzhou',
  isDefault: true,
  status: 'active',
  version: '3',
  credentialConfigured: true,
  credentialCount: '2',
  updatedAt: '2026-11-20T02:00:00Z',
};

test('cloud account page parses the provider-account listing projection', () => {
  const page = parseCloudAccountPage({
    items: [accountRow, { id: '' }],
    pageInfo: { mode: 'offset', page: 2, pageSize: 20, totalItems: '21', hasMore: true },
  });

  assert.equal(page.items.length, 1, 'a row without an id is unreadable and must be dropped');
  assert.equal(page.items[0]?.id, 'iampacct-01');
  assert.equal(page.items[0]?.credentialCount, 2, 'credentialCount arrives as an int64 string');
  assert.equal(page.items[0]?.credentialConfigured, true);
  assert.equal(page.items[0]?.isDefault, true);
  assert.equal(page.items[0]?.scopeType, 'tenant');
  assert.equal(page.items[0]?.regionCode, 'cn-hangzhou');
  assert.deepEqual(page.items[0]?.capabilityCodes, ['dns']);
  assert.equal(page.total, 21, 'total reads pageInfo.totalItems rather than the page length');
  assert.equal(page.pageInfo?.hasMore, true);
});

test('cloud account page falls back to the loaded rows when page info is absent', () => {
  const page = parseCloudAccountPage({ items: [accountRow] });
  assert.equal(page.total, 1);
  assert.equal(page.pageInfo, undefined);
});

test('cloud account record tolerates a bare projection and rejects unreadable rows', () => {
  assert.equal(toCloudAccountRecord(null), undefined);
  assert.equal(toCloudAccountRecord({ displayName: 'no id' }), undefined);
  const record = toCloudAccountRecord({ id: 'iampacct-02', credentialCount: 'not-a-number' });
  assert.equal(record?.credentialConfigured, false);
  assert.equal(record?.credentialCount, 0);
  assert.deepEqual(record?.capabilityCodes, []);
});

test('credential listing parses the projection that carries no ciphertext', () => {
  const credentials = parseCloudAccountCredentials({
    items: [
      {
        id: 'iamcred-01',
        providerAccountId: 'iampacct-01',
        credentialKind: 'access_key_pair',
        credentialName: 'default',
        maskedLabel: 'LTAI****9xQ',
        secretFingerprint: 'sha256:abcdef',
        status: 'active',
        expiresAt: '2027-01-01T00:00:00Z',
      },
      { providerAccountId: 'iampacct-01' },
    ],
  });
  assert.equal(credentials.length, 1);
  assert.equal(credentials[0]?.maskedLabel, 'LTAI****9xQ');
  assert.equal(credentials[0]?.status, 'active');
  assert.equal(
    'secretCiphertext' in (credentials[0] ?? {}),
    false,
    'the listing projection must never carry secret material',
  );
});

test('label keys resolve known vocabulary and stay undefined for unknown vendors', () => {
  assert.equal(cloudAccountVendorLabelKey('aliyun'), 'admin.iam.cloudAccounts.vendors.aliyun');
  assert.equal(cloudAccountVendorLabelKey('Cloudflare'), 'admin.iam.cloudAccounts.vendors.cloudflare');
  assert.equal(
    cloudAccountVendorLabelKey('some-cloud'),
    undefined,
    'an unknown vendor renders its code rather than a borrowed label',
  );
  assert.equal(cloudAccountScopeLabelKey('platform'), 'admin.iam.cloudAccounts.scopes.platform');
  assert.equal(cloudAccountStatusLabelKey('disabled'), 'admin.iam.cloudAccounts.statuses.disabled');
});

test('ownership levels mirror the server gates instead of collapsing them', () => {
  assert.deepEqual(
    readableCloudAccountScopeLevels(['iam.provider_accounts.read']),
    ['user'],
    'a member without manage_shared is offered personal accounts only',
  );
  assert.deepEqual(
    readableCloudAccountScopeLevels(['*']),
    ['user', 'organization', 'tenant'],
    'manage_shared adds the shared levels but not the platform default',
  );
  assert.deepEqual(
    readableCloudAccountScopeLevels(['*'], '100001'),
    ['user', 'organization', 'tenant', 'platform'],
    'the platform default additionally needs membership of the platform tenant',
  );
});

const draft: CloudAccountDraft = {
  vendorCode: 'Aliyun',
  accountCode: 'ops-primary',
  displayName: '运维主账号',
  scopeType: 'tenant',
  accountType: 'long_term_key',
  environment: 'production',
  regionCode: 'cn-hangzhou',
  externalAccountId: '',
  capabilityCodes: ['dns'],
  isDefault: true,
};

test('draft validation mirrors the service regexes', () => {
  assert.deepEqual(missingCloudAccountDraftFields(draft), []);
  assert.deepEqual(invalidCloudAccountDraftFields(draft), [], 'vendor and code are normalized before matching');
  assert.deepEqual(invalidCloudAccountDraftFields({ ...draft, accountCode: 'A' }), ['accountCode']);
  assert.deepEqual(invalidCloudAccountDraftFields({ ...draft, vendorCode: 'Ali Cloud' }), ['vendorCode']);
  assert.deepEqual(missingCloudAccountDraftFields({ ...draft, displayName: '   ' }), ['displayName']);
});

test('create body normalizes identity fields and omits absent optional keys', () => {
  assert.deepEqual(buildCloudAccountCreateBody(draft), {
    vendorCode: 'aliyun',
    accountCode: 'ops-primary',
    displayName: '运维主账号',
    scopeType: 'tenant',
    accountType: 'long_term_key',
    environment: 'production',
    regionCode: 'cn-hangzhou',
    capabilityCodes: ['dns'],
    isDefault: true,
  });
  assert.deepEqual(buildCloudAccountCreateBody({ ...draft, regionCode: '  ', isDefault: false }), {
    vendorCode: 'aliyun',
    accountCode: 'ops-primary',
    displayName: '运维主账号',
    scopeType: 'tenant',
    accountType: 'long_term_key',
    environment: 'production',
    capabilityCodes: ['dns'],
  });
});

test('update body never carries immutable identity fields', () => {
  const update = buildCloudAccountUpdateBody({ ...draft, regionCode: '', capabilityCodes: [] });
  assert.equal('vendorCode' in update, false);
  assert.equal('accountCode' in update, false);
  assert.equal('scopeType' in update, false);
  assert.equal('isDefault' in update, false);
  assert.equal('regionCode' in update, false, 'a blank optional value is omitted rather than sent empty');
  assert.deepEqual(update.capabilityCodes, [], 'an explicit empty capability list clears the restriction');
});

test('credential body follows the chosen kind and normalizes the expiry to RFC3339', () => {
  assert.equal(cloudAccountCredentialKindForType('temporary_credential'), 'access_key_pair');
  assert.equal(cloudAccountCredentialKindForType('managed_identity'), undefined);
  assert.deepEqual(cloudAccountRequiredCredentialFields('temporary_credential'), [
    'key_id',
    'key_secret',
    'session_token',
  ]);

  const credentialDraft = {
    ...emptyCloudAccountCredentialDraft('access_key_pair'),
    accessKeyId: 'AK',
    secretAccessKey: 'SK',
    expiresAt: '2030-01-02T03:04',
  };
  assert.equal(isCloudAccountCredentialDraftComplete(credentialDraft, 'long_term_key'), true);
  const body = buildCloudAccountCredentialBody(credentialDraft);
  assert.equal(body.credentialKind, 'access_key_pair');
  assert.equal(body.credentialName, 'default');
  assert.equal(body.accessKeyId, 'AK');
  assert.equal(body.secretAccessKey, 'SK');
  assert.match(String(body.expiresAt), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  assert.equal(isValidCloudAccountCredentialExpiry(''), true);
  assert.equal(isValidCloudAccountCredentialExpiry('2030-01-02T03:04'), true);
  assert.equal(isValidCloudAccountCredentialExpiry('not-a-date'), false);
});
