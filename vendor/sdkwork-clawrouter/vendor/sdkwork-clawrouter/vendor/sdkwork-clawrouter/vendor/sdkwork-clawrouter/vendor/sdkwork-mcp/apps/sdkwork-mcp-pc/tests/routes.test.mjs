import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('mcp pc routes include marketplace and admin surfaces', () => {
  const appSource = fs.readFileSync(path.join(appRoot, 'src/App.tsx'), 'utf8');
  for (const route of [
    '/mcp-hub',
    '/console/mcp',
    '/admin/servers',
    '/admin/categories',
    '/admin/invocations',
  ]) {
    assert.match(appSource, new RegExp(route.replace(/\//g, '\\/')));
  }
});

test('hub uses generated MCP server SDK services', () => {
  const marketplace = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-pc-hub/src/pages/MarketplacePage.tsx'),
    'utf8',
  );
  assert.match(marketplace, /fetchMarketplaceCatalog/);
  assert.doesNotMatch(marketplace, /skillPackages/);
});

test('admin uses backend mcpAdmin services', () => {
  const servers = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-pc-admin/src/pages/AdminServersPage.tsx'),
    'utf8',
  );
  assert.match(servers, /createAdminServer/);
  assert.doesNotMatch(servers, /skillPackages/);
});

test('admin capability panel uses upsert admin services', () => {
  const panel = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-pc-admin/src/components/AdminCapabilityPanel.tsx'),
    'utf8',
  );
  assert.match(panel, /upsertAdminTool/);
  assert.match(panel, /upsertAdminResource/);
  assert.match(panel, /upsertAdminPrompt/);
});

test('admin server settings panel uses updateAdminServer', () => {
  const settings = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-pc-admin/src/components/AdminServerSettingsPanel.tsx'),
    'utf8',
  );
  assert.match(settings, /updateAdminServer/);
  assert.match(settings, /lifecycle_status/);
});

test('admin permission catalog is declared in specs', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(appRoot, '../../specs/mcp-admin.permissions.json'), 'utf8'),
  );
  assert.ok(catalog.permissions.some((entry) => entry.code === 'mcp.admin.server.manage'));
});
