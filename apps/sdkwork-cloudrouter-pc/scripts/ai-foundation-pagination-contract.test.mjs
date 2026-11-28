/**
 * 人工智能基础管理分页门禁。
 *
 * 背景：技能 / MCP / 插件 / Agent 四个管理模块的列表页与分类页由兄弟仓库
 * （sdkwork-skills、sdkwork-mcp、sdkwork-plugins、sdkwork-agents）提供，
 * 通过 `route(...)` 挂到本控制台的「人工智能基础管理」分组。这些页面曾经把
 * 整个目录一次性拉 `pageSize: 200` 再全量渲染：目录一大，底部就没有任何翻页
 * 入口，操作者只能靠搜索猜位置；宿主 i18n / 契约门禁也都不覆盖外部包，所以
 * 这个体验缺陷没有任何门禁会报红。
 *
 * 本门禁做三件事：
 *  1. 每个模块都带 `AdminListPagination` 组件（四个目录共用的分页插件）；
 *  2. 每个列表页/分类页都渲染它，而不是各自手写一套翻页控件；
 *  3. 每个 copy 模块都为 en / zh 两个投影提供 `pagination` 文案块，
 *     即分页栏的文案走本地化，而不是写死英文。
 *
 * 兄弟仓库不存在时（只 checkout 了本仓）按模块跳过，不假红。
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, '../../../..');

/** 分页插件本体：导出名 + 每个模块内的相对路径。 */
const COMPONENT_EXPORT = /\bexport\s+function\s+AdminListPagination\s*\(/;

/** 列表页必须导入并渲染分页插件，而不是自造一套翻页控件。 */
const COMPONENT_IMPORT = /\bAdminListPagination\b/;
const COMPONENT_USAGE = /<AdminListPagination\b/;

/**
 * 分页文案块。en 与 zh 两个投影各一份，因此每个 copy 模块至少出现两次
 * `pagination: {`，且都带 `showing` / `page` / `pageSize` 三个键。
 */
const COPY_BLOCK = /\bpagination:\s*\{/g;
const COPY_SHOWING = /\bshowing:\s*[((]/g;
const COPY_PAGE_SIZE = /\bpageSize:\s*['"]/g;

const MODULES = [
  {
    id: 'skills',
    packageRoot: join(workspaceRoot, 'sdkwork-skills', 'apps', 'sdkwork-skills-pc', 'packages'),
    components: [
      'sdkwork-skills-pc-admin/src/components/AdminListPagination.tsx',
      'sdkwork-skills-pc-admin-skill/src/components/AdminListPagination.tsx',
    ],
    copyFiles: ['sdkwork-skills-pc-admin/src/copy/skillsAdminCopy.ts'],
    pages: [
      'sdkwork-skills-pc-admin/src/index.tsx',
      'sdkwork-skills-pc-admin-skill/src/pages/SkillCategoriesPage.tsx',
    ],
  },
  {
    id: 'mcp',
    packageRoot: join(workspaceRoot, 'sdkwork-mcp', 'apps', 'sdkwork-mcp-pc', 'packages'),
    components: ['sdkwork-mcp-pc-admin/src/components/AdminListPagination.tsx'],
    copyFiles: ['sdkwork-mcp-pc-admin/src/copy/mcpAdminCopy.ts'],
    pages: [
      'sdkwork-mcp-pc-admin/src/pages/AdminServersPage.tsx',
      'sdkwork-mcp-pc-admin/src/pages/AdminCategoriesPage.tsx',
    ],
  },
  {
    id: 'plugins',
    packageRoot: join(workspaceRoot, 'sdkwork-plugins', 'apps', 'sdkwork-plugins-pc', 'packages'),
    components: ['sdkwork-plugins-pc-admin/src/components/AdminListPagination.tsx'],
    copyFiles: ['sdkwork-plugins-pc-admin/src/copy/pluginsAdminCopy.ts'],
    pages: ['sdkwork-plugins-pc-admin/src/index.tsx'],
  },
  {
    id: 'agents',
    packageRoot: join(workspaceRoot, 'sdkwork-agents', 'apps', 'sdkwork-agents-pc', 'packages'),
    components: ['sdkwork-agents-pc-admin/src/components/AdminListPagination.tsx'],
    copyFiles: [
      'sdkwork-agents-pc-admin/src/agentAdminCopy.ts',
      'sdkwork-agents-pc-admin/src/agentCategoryCopy.ts',
    ],
    pages: [
      'sdkwork-agents-pc-admin/src/index.tsx',
      'sdkwork-agents-pc-admin/src/agentCategoriesPage.tsx',
    ],
  },
];

function readModuleSource(module_, relativePath) {
  const file = join(module_.packageRoot, relativePath);
  assert.ok(existsSync(file), `缺少文件 ${file}`);
  return readFileSync(file, 'utf8');
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

for (const module_ of MODULES) {
  if (!existsSync(module_.packageRoot)) {
    continue;
  }

  test(`[${module_.id}] 分页插件存在且导出 AdminListPagination`, () => {
    const missing = [];
    for (const component of module_.components) {
      const file = join(module_.packageRoot, component);
      if (!existsSync(file)) {
        missing.push(component);
        continue;
      }
      if (!COMPONENT_EXPORT.test(readFileSync(file, 'utf8'))) {
        missing.push(`${component}（缺少 AdminListPagination 导出）`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test(`[${module_.id}] 列表页/分类页都渲染分页插件`, () => {
    const offenders = [];
    for (const page of module_.pages) {
      const text = readModuleSource(module_, page);
      if (!COMPONENT_IMPORT.test(text) || !COMPONENT_USAGE.test(text)) {
        offenders.push(page);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test(`[${module_.id}] copy 模块带 en/zh 两套分页文案`, () => {
    const offenders = [];
    for (const copyFile of module_.copyFiles) {
      const text = readModuleSource(module_, copyFile);
      // en 与 zh 两个投影各一份 `pagination` 块。
      if (
        countMatches(text, COPY_BLOCK) < 2
        || countMatches(text, COPY_SHOWING) < 2
        || countMatches(text, COPY_PAGE_SIZE) < 2
      ) {
        offenders.push(copyFile);
      }
    }
    assert.deepEqual(offenders, []);
  });
}
