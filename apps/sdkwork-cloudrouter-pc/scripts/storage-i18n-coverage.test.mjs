/**
 * 存储控制台 i18n 覆盖门禁。
 *
 * 背景：服务商表单从 cloudrouter 本地实现收敛到 drive 的共享编辑器后，
 * `resources/admin/storage.ts` 里旧表单的 key 被删除。删除本身没问题，
 * 但只要有「仍被引用」的 key 被误删，`t(key, fallback)` 就会退化成裸 key，
 * 界面上看不出来、其它门禁也不报 —— 这类缺陷只能靠双向对账兜住。
 *
 * 三条断言：
 *  1. 控制台静态引用的 `admin.storage.*` key，在 en / zh 两份表里都必须存在；
 *  2. 两份表的 key 集合必须完全一致（少一侧就是某语言下退化成裸 key）；
 *  3. **枚举值覆盖**：服务端允许取值的枚举（`admin_storage.rs` 里的
 *     `LOGICAL_SCOPES` / `*_SCOPE_TYPES` / `RESOURCE_STATUSES` / `JOB_STATUSES`）
 *     与 drive 的服务商类型联合（`StorageProviderKind`）都必须有对应的
 *     `admin.storage.value.<group>.<value>` 标签。
 *
 * 第 3 条是真实缺陷换来的：`providerType` 曾经只有 6 个厂商档，而 drive 的联合
 * 有 8 档（缺 `local_filesystem` / `custom`）；`scopeType` 缺 `business_domain`
 * （它只出现在 usage 段的取值域里）；`status` 缺 `archived`。三处都会让表格里
 * 冒出裸 token，而任何「key 是否存在」的检查都发现不了。
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(here, '../../..');
const workspaceRoot = resolve(here, '../../../..');

const SOURCE_ROOTS = [
  join(appRoot, 'src'),
  join(appRoot, 'packages', 'sdkwork-cloudrouter-pc-admin-storage', 'src'),
];
const I18N_FILE = join(
  appRoot,
  'packages',
  'sdkwork-cloudrouter-pc-i18n',
  'src',
  'resources',
  'admin',
  'storage.ts',
);
const SERVER_ENUMS_FILE = join(
  repoRoot,
  'services',
  'sdkwork-cloudrouter-router-service',
  'src',
  'api',
  'admin_storage.rs',
);
const DRIVE_PROVIDER_KIND_FILE = join(
  workspaceRoot,
  'sdkwork-drive',
  'apps',
  'sdkwork-drive-pc',
  'packages',
  'sdkwork-drive-pc-admin-storage-providers',
  'src',
  'types',
  'storageProviderAdminTypes.ts',
);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.vite', 'coverage']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** 源码里 `t('admin.storage.…')` 的静态 key；模板拼接的另走枚举断言。 */
function collectReferencedKeys() {
  const found = new Map();
  const pattern = /\bt\(\s*['"`](admin\.storage\.[A-Za-z0-9_.-]*?)['"`]/g;
  for (const file of SOURCE_ROOTS.flatMap((root) => walk(root))) {
    const text = readFileSync(file, 'utf8');
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[1];
      if (key.endsWith('.')) continue;
      if (!found.has(key)) found.set(key, new Set());
      found.get(key).add(file.slice(repoRoot.length + 1).replace(/\\/g, '/'));
    }
  }
  return found;
}

/** `storage.ts` 是扁平字面量对象，正则解析 en / zh 两个 map 的 key 集合即可。 */
function parseBundles() {
  const bundles = { en: new Set(), zh: new Set() };
  let current = null;
  for (const rawLine of readFileSync(I18N_FILE, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^en:\s*\{$/.test(line)) { current = 'en'; continue; }
    if (/^['"]?zh(-CN)?['"]?:\s*\{$/.test(line)) { current = 'zh'; continue; }
    if (current && line === '},') { current = null; continue; }
    if (!current) continue;
    const match = /^['"]([^'"]+)['"]\s*:/.exec(line);
    if (match) bundles[current].add(match[1]);
  }
  return bundles;
}

/** 解析 Rust 里的 `const NAME: &[&str] = &[ "a", "b", ];`。 */
function parseServerEnumArrays() {
  const text = readFileSync(SERVER_ENUMS_FILE, 'utf8');
  const enums = new Map();
  const pattern = /const ([A-Z_]+): &\[&str\] = &\[([\s\S]*?)\];/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const values = [...match[2].matchAll(/"([a-z_0-9]+)"/g)].map((item) => item[1]);
    enums.set(match[1], values);
  }
  return enums;
}

/** 解析 drive 的 `export type StorageProviderKind = 'a' | 'b' | \`custom:${string}\`;`。 */
function parseDriveProviderKinds() {
  const text = readFileSync(DRIVE_PROVIDER_KIND_FILE, 'utf8');
  const match = /export type StorageProviderKind =([\s\S]*?);/.exec(text);
  assert.ok(match, 'drive 的 StorageProviderKind 联合未能解析');
  return [...match[1].matchAll(/'([a-z_0-9]+)'/g)].map((item) => item[1]);
}

const referenced = collectReferencedKeys();
const bundles = parseBundles();

test('控制台引用的 admin.storage.* key 在 en / zh 两份表里都存在', () => {
  assert.ok(referenced.size > 50, `引用到的存储 key 过少（${referenced.size}），枚举逻辑可能失效`);
  const missing = [];
  for (const [key, files] of [...referenced].sort()) {
    if (!bundles.en.has(key)) missing.push(`[en] ${key} ← ${[...files].join(', ')}`);
    if (!bundles.zh.has(key)) missing.push(`[zh] ${key} ← ${[...files].join(', ')}`);
  }
  assert.deepEqual(missing, []);
});

test('en / zh 的 admin.storage.* key 集合完全一致', () => {
  const onlyEn = [...bundles.en].filter((key) => !bundles.zh.has(key)).sort();
  const onlyZh = [...bundles.zh].filter((key) => !bundles.en.has(key)).sort();
  assert.deepEqual({ onlyEn, onlyZh }, { onlyEn: [], onlyZh: [] });
});

test('服务端枚举的每个允许取值都有 i18n 标签', () => {
  const enums = parseServerEnumArrays();
  /** Rust 常量 → i18n 的 value 组名。 */
  const groups = {
    LOGICAL_SCOPES: 'logicalScope',
    QUOTA_SCOPE_TYPES: 'scopeType',
    USAGE_SCOPE_TYPES: 'scopeType',
    RESOURCE_STATUSES: 'status',
    JOB_STATUSES: 'jobStatus',
  };
  const missing = [];
  for (const [constant, group] of Object.entries(groups)) {
    const values = enums.get(constant);
    assert.ok(values?.length, `未能在 admin_storage.rs 里解析 ${constant}`);
    for (const value of values) {
      const key = `admin.storage.value.${group}.${value}`;
      if (!bundles.en.has(key)) missing.push(`[en] ${constant}: ${key}`);
      if (!bundles.zh.has(key)) missing.push(`[zh] ${constant}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('drive 的每个存储服务商类型都有 i18n 标签', () => {
  // drive 的工作区包是 cloudrouter 存储包的 workspace 依赖，源码必然在位；
  // 若不在（例如只 checkout 了本仓），跳过而不是假红。
  if (!existsSync(DRIVE_PROVIDER_KIND_FILE)) {
    return;
  }
  const missing = [];
  for (const kind of parseDriveProviderKinds()) {
    const key = `admin.storage.value.providerType.${kind}`;
    if (!bundles.en.has(key)) missing.push(`[en] ${key}`);
    if (!bundles.zh.has(key)) missing.push(`[zh] ${key}`);
  }
  assert.deepEqual(missing, []);
});
