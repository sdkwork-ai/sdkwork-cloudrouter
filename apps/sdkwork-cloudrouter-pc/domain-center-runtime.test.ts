import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ADMIN_MODULES,
  getActiveModuleFromPath,
  getAdminModuleMenu,
  resolveAdminRoutePermissionHint,
} from '@sdkwork/cloudrouter-pc-admin-shell';
import { ADMIN_MODULE_CATALOG, ADMIN_MODULE_IDS } from './packages/sdkwork-cloudroutes-pc-commons/src/admin-modules.ts';

test('domain center is its own admin module with the industry-standard chain', () => {
  const domainCenter = ADMIN_MODULES.find((module) => module.id === 'domainCenter');

  assert.ok(domainCenter, 'the domain center must be a header module');
  assert.equal(domainCenter.defaultPath, '/admin/domains');
  assert.deepEqual(domainCenter.pathPrefixes, ['/admin/domains']);
  assert.equal(getActiveModuleFromPath('/admin/domains'), 'domainCenter');
  assert.equal(getActiveModuleFromPath('/admin/domains/dns'), 'domainCenter');

  const menu = getAdminModuleMenu('domainCenter');
  assert.deepEqual(
    menu.items?.map((item) => item.path),
    ['/admin/domains'],
    'the overview is the module landing item',
  );

  const groups = new Map(menu.groups.map((group) => [group.groupKey, group]));
  assert.deepEqual(
    groups.get('admin.menu.domains.management')?.items.map((item) => item.path),
    ['/admin/domains/zones', '/admin/domains/hostnames'],
  );
  assert.deepEqual(
    groups.get('admin.menu.domains.resolution')?.items.map((item) => item.path),
    ['/admin/domains/dns'],
  );
  assert.deepEqual(
    groups.get('admin.menu.domains.security')?.items.map((item) => item.path),
    ['/admin/domains/certificates', '/admin/domains/accounts'],
  );
});

test('the module manager catalog knows the domain center module', () => {
  assert.deepEqual(
    ADMIN_MODULE_CATALOG.map((entry) => entry.id),
    [...ADMIN_MODULE_IDS],
  );
  const entry = ADMIN_MODULE_CATALOG.find((candidate) => candidate.id === 'domainCenter');
  assert.ok(entry, 'the site-settings module manager must list the domain center');
  assert.equal(entry.labelKey, 'admin.siteSettings.adminModules.items.domainCenter.label');
});

test('every domain center route is guarded by the admin access permission', () => {
  assert.equal(resolveAdminRoutePermissionHint('/admin/domains'), 'cloudrouter.admin.access');
  assert.equal(resolveAdminRoutePermissionHint('/admin/domains/zones'), 'cloudrouter.admin.access');
  assert.equal(resolveAdminRoutePermissionHint('/admin/domains/dns'), 'cloudrouter.admin.access');
  assert.equal(resolveAdminRoutePermissionHint('/admin/domains/certificates'), 'cloudrouter.admin.access');
});

test('the host mount wires all six sections to the deployments domain SDK', () => {
  const source = readFileSync(new URL('./src/admin/cloudRouterAdminHostMount.tsx', import.meta.url), 'utf8');
  for (const segment of ['', '/zones', '/hostnames', '/dns', '/certificates', '/accounts']) {
    assert.match(
      source,
      new RegExp(`route\\('domains${segment}', 'sdkwork-cloudrouter', '@sdkwork/cloudrouter-pc-admin-domain'`),
      `missing host route for /admin/domains${segment}`,
    );
  }
  assert.match(source, /'sdkwork-deployments-app-sdk'/);
});

test('root-domain filings are edited independently through the deployments zone update contract', () => {
  const page = readFileSync(new URL(
    './packages/sdkwork-cloudrouter-pc-admin-domain/src/pages/DomainZonesPage.tsx',
    import.meta.url,
  ), 'utf8');
  const dialog = readFileSync(new URL(
    './packages/sdkwork-cloudrouter-pc-admin-domain/src/components/DomainZoneFilingDialog.tsx',
    import.meta.url,
  ), 'utf8');
  assert.match(page, /admin\.domainCenter\.zones\.actions\.filing/);
  assert.match(page, /zone\.policeFiling\?\.recordNumber/);
  assert.match(dialog, /filing: toZoneFilingInput\(form\)/);
  assert.match(dialog, /policeFiling: toZonePoliceFilingInput\(policeForm\)/);
  assert.match(dialog, /kind === 'icp' \? \{ filing: null \} : \{ policeFiling: null \}/);
  assert.doesNotMatch(dialog, /fetch\(|axios|Authorization/);
});

test('the domain center catalog translates navigation and validation keys into both locales', async () => {
  const { adminDomainCenterMessages } = await import(
    './packages/sdkwork-cloudrouter-pc-i18n/src/resources/admin/domain-center.ts'
  );

  const enKeys = Object.keys(adminDomainCenterMessages.en).sort();
  const zhKeys = Object.keys(adminDomainCenterMessages.zh).sort();
  assert.deepEqual(zhKeys, enKeys, 'en and zh must carry the same keys');

  assert.equal(adminDomainCenterMessages.en['admin.header.domainCenter'], 'Domain Center');
  assert.equal(adminDomainCenterMessages.zh['admin.header.domainCenter'], '域名中心');
  assert.equal(adminDomainCenterMessages.zh['admin.menu.domains.dns'], '解析记录');
  assert.equal(adminDomainCenterMessages.zh['admin.menu.domains.certificates'], '证书管理');
  assert.equal(
    adminDomainCenterMessages.en['admin.domainCenter.zones.filing.police.fields.recordNumber'],
    'Public security filing number',
  );
  assert.equal(
    adminDomainCenterMessages.zh['admin.domainCenter.zones.filing.police.fields.recordUrl'],
    '公安备案链接',
  );
  assert.match(
    adminDomainCenterMessages.zh['admin.domainCenter.validation.wildcardRequiresDns01'],
    /DNS-01/u,
  );
});
