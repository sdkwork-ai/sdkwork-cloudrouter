import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLOUD_ROUTER_IAM_ADMIN_I18N_CATALOGS } from '@sdkwork/cloudrouter-pc-admin-iam/i18n';

/**
 * 身份与访问 catalog registration.
 *
 * Every IAM admin page resolves its copy through
 * `useSdkworkModuleMessages(<catalog>)`, which returns the catalog's default
 * locale unless the catalog was registered with the host `SdkworkI18nProvider`.
 * The host used to register only the official-account catalog, so the tenant,
 * organization, OAuth, audit, account-binding, and mini-program pages rendered
 * English copy inside a zh-CN console.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const EXPECTED_NAMESPACES = [
  'iam.account-binding.admin',
  'iam.audit.admin',
  'iam.oauth.admin',
  'iam.oauth.miniPrograms',
  'iam.oauth.officialAccounts',
  'iam.organization.admin',
  'iam.tenant.admin',
];

test('the 身份与访问 catalog bundle covers every module namespace once', () => {
  const namespaces = CLOUD_ROUTER_IAM_ADMIN_I18N_CATALOGS
    .map((catalog) => catalog.namespace)
    .sort();
  assert.deepEqual(namespaces, EXPECTED_NAMESPACES);
  assert.equal(
    new Set(namespaces).size,
    namespaces.length,
    'a namespace registered twice would shadow the other catalog',
  );
});

test('every registered catalog can answer a zh-CN console', () => {
  for (const catalog of CLOUD_ROUTER_IAM_ADMIN_I18N_CATALOGS) {
    assert.ok(
      catalog.locales['zh-CN'],
      `${catalog.namespace} has no zh-CN dictionary`,
    );
  }
});

test('the host provider registers the whole bundle, not a single catalog', () => {
  const main = readFileSync(path.join(here, 'src/main.tsx'), 'utf8');
  assert.match(main, /\.\.\.CLOUD_ROUTER_IAM_ADMIN_I18N_CATALOGS/u);
  assert.doesNotMatch(
    main,
    /SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,/u,
    'the official-account catalog must arrive through the bundle, not a one-off import',
  );
});
