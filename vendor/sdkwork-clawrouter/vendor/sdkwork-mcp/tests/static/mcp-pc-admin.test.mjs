import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('mcp admin permission catalog matches admin-core constants', () => {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'specs/mcp-admin.permissions.json'), 'utf8'),
  );
  const permissions = fs.readFileSync(
    path.join(
      repoRoot,
      'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin-core/src/permissions.ts',
    ),
    'utf8',
  );
  for (const entry of catalog.permissions) {
    assert.match(permissions, new RegExp(entry.code.replace(/\./g, '\\.')));
  }
});

test('admin-core exposes hasMcpAdminPermission helper', () => {
  const access = fs.readFileSync(
    path.join(
      repoRoot,
      'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin-core/src/access.ts',
    ),
    'utf8',
  );
  assert.match(access, /hasMcpAdminPermission/);
  assert.match(access, /MCP_ADMIN_ROLES\.operator/);
});

test('admin server detail page includes settings tab', () => {
  const detail = fs.readFileSync(
    path.join(
      repoRoot,
      'apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin/src/pages/AdminServerDetailPage.tsx',
    ),
    'utf8',
  );
  assert.match(detail, /AdminServerSettingsPanel/);
  assert.match(detail, /settings/);
});
