#!/usr/bin/env node
/**
 * v4.1 route contract alignment: table names, column renames, app metrics, OAuth trim.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const OAUTH_ROUTE_BLOCK = `- route: /admin/oauth/login-platforms
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
- route: /admin/oauth/official-accounts
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
- route: /admin/oauth/mini-programs
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
`;

const OAUTH_CLASSIFICATION_BLOCK = `- route: /admin/oauth/login-platforms
  package: sdkwork-clawrouter-pc-admin-oauth
  owner: appbase-iam
  route_scope: admin
  delivery_kind: sdk_backed_business_runtime
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  api_surface: backend
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
  evidence:
  - apps/sdkwork-clawrouter-pc/src/App.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/index.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts
  - docs/schema-registry/frontend-field-contracts.yaml
- route: /admin/oauth/official-accounts
  package: sdkwork-clawrouter-pc-admin-oauth
  owner: appbase-iam
  route_scope: admin
  delivery_kind: sdk_backed_business_runtime
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  api_surface: backend
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
  evidence:
  - apps/sdkwork-clawrouter-pc/src/App.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/index.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts
  - docs/schema-registry/frontend-field-contracts.yaml
- route: /admin/oauth/mini-programs
  package: sdkwork-clawrouter-pc-admin-oauth
  owner: appbase-iam
  route_scope: admin
  delivery_kind: sdk_backed_business_runtime
  dependency_owned: true
  dependency_sdk_family: sdkwork-iam-backend-sdk
  api_surface: backend
  required_tables:
  - iam_oauth_resource_account
  - ops_audit_log
  evidence:
  - apps/sdkwork-clawrouter-pc/src/App.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/index.tsx
  - apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts
  - docs/schema-registry/frontend-field-contracts.yaml
`;

const APP_PLATFORM_METRICS = ['download_count', 'rating_avg', 'rating_count'];
const APP_SKILL_TABLES = ['ai_skill_action', 'ai_skill_asset', 'ai_skill_artifact'];

function replaceOAuthRoutesYaml(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const marker = '- route: /admin/oauth\n';
  const index = normalized.indexOf(marker);
  if (index === -1) {
    return content;
  }
  const next = `${normalized.slice(0, index)}${OAUTH_ROUTE_BLOCK}`;
  return content.includes('\r\n') ? next.replace(/\n/g, '\r\n') : next;
}

function replaceOAuthClassification(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const marker = '- route: /admin/oauth\n';
  const index = normalized.indexOf(marker);
  if (index === -1) {
    return content;
  }
  const next = `${normalized.slice(0, index)}${OAUTH_CLASSIFICATION_BLOCK}`;
  return content.includes('\r\n') ? next.replace(/\n/g, '\r\n') : next;
}

function fixContentReactionBlocks(content) {
  return content.replace(
    /    content_reaction:\n    - user_id\n    - content_type\n    - content_id\n    - rating/g,
    '    content_reaction:\n    - target_type\n    - target_id\n    - reaction_type\n    - reaction_value',
  );
}

function fixRequiredColumnsBlocks(content) {
  const lines = content.split('\n');
  const out = [];
  let currentTable = null;

  for (const line of lines) {
    const tableMatch = line.match(/^    ([a-z_]+):$/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      out.push(line);
      continue;
    }

    if (line.match(/^  [a-z_]+:/) || line.startsWith('- route:')) {
      currentTable = null;
    }

    if (currentTable === 'c_category' && line.trim() === '- type') {
      out.push('    - category_type');
      continue;
    }
    if (currentTable === 'c_category' && line.trim() === '- group_name') {
      continue;
    }
    if (currentTable === 'content_comment' && line.trim() === '- content') {
      out.push('    - body');
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

function stripAppSkillTables(content) {
  let next = content;
  for (const table of APP_SKILL_TABLES) {
    next = next.replace(new RegExp(`^  - ${table}\\n`, 'gm'), '');
    next = next.replace(new RegExp(`^    ${table}:\\n(?:^    - .+\\n)+`, 'gm'), '');
  }

  for (const route of ['- route: /apps', '- route: /apps/:id', '- route: /admin/app']) {
    const routeIndex = next.indexOf(`${route}\n`);
    if (routeIndex === -1) {
      continue;
    }
    const platformIndex = next.indexOf('    appstore_app:\n', routeIndex);
    if (platformIndex === -1) {
      continue;
    }
    const afterPlatform = next.indexOf('\n    ', platformIndex + 1);
    const blockEnd = afterPlatform === -1 ? next.length : afterPlatform;
    const platformBlock = next.slice(platformIndex, blockEnd);
    if (platformBlock.includes('download_count')) {
      continue;
    }
    const insert = APP_PLATFORM_METRICS.map((column) => `    - ${column}`).join('\n');
    next = `${next.slice(0, blockEnd)}\n${insert}${next.slice(blockEnd)}`;
  }

  next = next.replace(
    /  - studio_app_template\n/g,
    '  - appstore_app_template\n',
  );
  next = next.replace(
    /^    studio_app_template:\n/gm,
    '    appstore_app_template:\n',
  );

  return next;
}

function migrateRoutesYaml(content) {
  let next = content;
  next = next.replaceAll('content_forum_comment', 'content_comment');
  next = stripAppSkillTables(next);
  next = fixContentReactionBlocks(next);
  next = fixRequiredColumnsBlocks(next);
  next = replaceOAuthRoutesYaml(next);
  return next;
}

function migrateOAuthOperations(content) {
  return content.replaceAll('/admin/oauth/resource-accounts', '/admin/oauth/login-platforms');
}

function migrateOAuthModels(content) {
  return content.replace('/admin/oauth\n', '/admin/oauth/login-platforms\n');
}

function writeIfChanged(file, content) {
  const before = fs.readFileSync(file, 'utf8');
  if (before === content) {
    return false;
  }
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

const routesYaml = path.join(root, 'docs', 'schema-registry', 'frontend-field-contracts', 'routes', 'routes.yaml');
const classificationYaml = path.join(root, 'docs', 'schema-registry', 'frontend-route-classification.yaml');
const staticSnapshotsYaml = path.join(root, 'docs', 'schema-registry', 'frontend-static-source-snapshots.yaml');
const oauthOpsYaml = path.join(
  root,
  'docs',
  'schema-registry',
  'frontend-field-contracts',
  'operations',
  'backend-iam-oauth.yaml',
);
const oauthModelsYaml = path.join(
  root,
  'docs',
  'schema-registry',
  'frontend-field-contracts',
  'models',
  'admin-oauth.yaml',
);

let changed = 0;

if (writeIfChanged(routesYaml, migrateRoutesYaml(fs.readFileSync(routesYaml, 'utf8')))) {
  changed += 1;
  console.log('updated routes/routes.yaml');
}

if (writeIfChanged(classificationYaml, replaceOAuthClassification(fs.readFileSync(classificationYaml, 'utf8')))) {
  changed += 1;
  console.log('updated frontend-route-classification.yaml');
}

if (writeIfChanged(staticSnapshotsYaml, fs.readFileSync(staticSnapshotsYaml, 'utf8').replaceAll('plus_app', 'appstore_app'))) {
  changed += 1;
  console.log('updated frontend-static-source-snapshots.yaml');
}

if (writeIfChanged(oauthOpsYaml, migrateOAuthOperations(fs.readFileSync(oauthOpsYaml, 'utf8')))) {
  changed += 1;
  console.log('updated operations/backend-iam-oauth.yaml');
}

if (writeIfChanged(oauthModelsYaml, migrateOAuthModels(fs.readFileSync(oauthModelsYaml, 'utf8')))) {
  changed += 1;
  console.log('updated models/admin-oauth.yaml');
}

console.log(`v4.1 routes contract migration complete (${changed} files)`);
