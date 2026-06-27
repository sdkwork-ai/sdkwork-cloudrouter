#!/usr/bin/env node
/**
 * One-shot v4.1 table name migration for authored frontend contract YAML.
 * Replaces retired plus_* / studio_* references with v4.1 system-of-record tables.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPLACEMENTS = [
  ['plus_user_agent_skill', 'ai_user_agent_skill'],
  ['plus_agent_skill_package', 'ai_agent_skill_package'],
  ['plus_agent_skill', 'ai_agent_skill'],
  ['plus_invitation_relation', 'promotion_code_redemption'],
  ['plus_invitation_code', 'promotion_code'],
  ['plus_content_vote', 'content_reaction'],
  ['studio_catalog_artifact', 'ai_skill_artifact'],
  ['studio_catalog_asset', 'ai_skill_asset'],
  ['studio_catalog_action', 'ai_skill_action'],
  ['plus_category', 'c_category'],
  ['plus_app', 'appstore_app'],
  ['platform_app', 'appstore_app'],
  ['plus_feeds', 'content_forum_post'],
  ['plus_comments', 'content_comment'],
  ['plus_favorite', 'content_favorite'],
  ['studio_app_template', 'appstore_app_template'],
  ['platform_app_template', 'appstore_app_template'],
  ['platform_app_template_version', 'appstore_app_template_version'],
  ['platform_app_template_usage', 'appstore_app_template_usage'],
];

const APP_JSON_ONLY_SOURCES = new Set([
  'ai_skill_action',
  'ai_skill_asset',
  'ai_skill_artifact',
]);

const TARGET_DIRS = [
  path.join(root, 'docs', 'schema-registry', 'frontend-field-contracts'),
];

const TARGET_FILES = [
  path.join(root, 'docs', 'schema-registry', 'frontend-route-classification.yaml'),
  path.join(root, 'docs', 'schema-registry', 'tables', '008-ops.yaml'),
];

function migrateText(content, fileLabel) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.replaceAll(from, to);
  }

  const isAppPlatformFile =
    fileLabel.includes('operations/app-platform.yaml')
    || fileLabel.includes('models/app-center.yaml')
    || (fileLabel.includes('operations/backend-platform.yaml') && next.includes('/admin/apps'));

  if (isAppPlatformFile) {
    next = next
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('- ')) {
          return true;
        }
        const table = trimmed.slice(2).trim();
        return !APP_JSON_ONLY_SOURCES.has(table);
      })
      .join('\n');
  }

  return next;
}

function walkYamlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkYamlFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of walkYamlFiles(dir)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = migrateText(before, path.relative(root, file).replaceAll('\\', '/'));
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed += 1;
      console.log(`updated ${path.relative(root, file)}`);
    }
  }
}

for (const file of TARGET_FILES) {
  if (!fs.existsSync(file)) {
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = migrateText(before, path.relative(root, file).replaceAll('\\', '/'));
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
    console.log(`updated ${path.relative(root, file)}`);
  }
}

console.log(`v4.1 frontend contract table migration complete (${changed} files)`);
