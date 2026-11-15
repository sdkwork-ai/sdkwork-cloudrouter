/**
 * 人工智能基础管理 i18n 覆盖门禁。
 *
 * 背景：技能 / MCP / 插件 / Agent 四个管理模块的页面与组件由兄弟仓库
 * （sdkwork-skills、sdkwork-mcp、sdkwork-plugins、sdkwork-agents）提供，
 * 通过 `route(...)` 挂到本控制台的「人工智能基础管理」分组。这些页面曾整体
 * 硬编码英文：中文控制台下菜单是中文、页面正文仍是英文，且没有任何门禁报红
 * （宿主 i18n 资源不参与外部包的 JSX 文案）。回归缺陷是真实发生过的。
 *
 * 本门禁做四件事：
 *  1. 每个模块都存在带 zh 投影的 copy 模块（与本仓库 `syncDocumentLanguage`
 *     对齐的 `const zh: XxxCopy`）；
 *  2. 每个页面/组件文件都消费 copy hook，而不是自己硬编码文案；
 *  3. 页面/组件里不再残留用户可见英文：JSX 文本节点、copy 类属性字面量、
 *     以及对象字面量里的 label/title/description 一类文案；
 *  4. 技术标识（wire 值、编码、术语）按白名单放行，避免把「stdio」「MCP」
 *     这类不该翻译的 token 误判。
 *
 * 兄弟仓库不存在时（只 checkout 了本仓）按模块跳过，不假红。
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, '../../../..');

/** 允许直接出现在界面上的技术标识（不翻译）。 */
const TECHNICAL_TOKENS = new Set([
  'API',
  'CSV',
  'Drive',
  'HTTP',
  'HTTPS',
  'ID',
  'JSON',
  'MCP',
  'SDK',
  'SSE',
  'URL',
  'URI',
  'UTF-8',
  'stdio',
  'streamable_http',
  'sdkwork-drive',
]);

/** 承载用户可见文案的 JSX 属性 / 对象属性名。 */
const COPY_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'caption',
  'description',
  'hint',
  'label',
  'legend',
  'message',
  'placeholder',
  'subtitle',
  'title',
]);

const MODULES = [
  {
    id: 'skills',
    packageRoot: join(workspaceRoot, 'sdkwork-skills', 'apps', 'sdkwork-skills-pc', 'packages'),
    copyFiles: ['sdkwork-skills-pc-admin/src/copy/skillsAdminCopy.ts'],
    pages: [
      'sdkwork-skills-pc-admin/src/index.tsx',
      'sdkwork-skills-pc-admin/src/components/RoleMultiSelect.tsx',
      'sdkwork-skills-pc-admin/src/components/SurfaceOverlay.tsx',
      'sdkwork-skills-pc-admin-skill/src/pages/SkillCategoriesPage.tsx',
      'sdkwork-skills-pc-admin-skill/src/pages/PackageArtifactsPage.tsx',
      'sdkwork-skills-pc-admin-skill/src/pages/SkillCapabilitiesPage.tsx',
      'sdkwork-skills-pc-admin-skill/src/pages/UpdateSkillPackagePage.tsx',
      'sdkwork-skills-pc-admin-skill/src/components/SurfaceOverlay.tsx',
    ],
  },
  {
    id: 'mcp',
    packageRoot: join(workspaceRoot, 'sdkwork-mcp', 'apps', 'sdkwork-mcp-pc', 'packages'),
    copyFiles: [
      'sdkwork-mcp-pc-admin/src/copy/mcpAdminCopy.ts',
      'sdkwork-mcp-pc-commons/src/ui/roleMultiSelectCopy.ts',
    ],
    pages: [
      'sdkwork-mcp-pc-admin/src/pages/AdminServersPage.tsx',
      'sdkwork-mcp-pc-admin/src/pages/AdminServerDetailPage.tsx',
      'sdkwork-mcp-pc-admin/src/pages/AdminCategoriesPage.tsx',
      'sdkwork-mcp-pc-admin/src/pages/AdminInvocationsPage.tsx',
      'sdkwork-mcp-pc-admin/src/components/AdminCapabilityPanel.tsx',
      'sdkwork-mcp-pc-admin/src/components/AdminServerSettingsPanel.tsx',
      'sdkwork-mcp-pc-admin/src/components/SurfaceOverlay.tsx',
      'sdkwork-mcp-pc-commons/src/ui/RoleMultiSelect.tsx',
    ],
  },
  {
    id: 'plugins',
    packageRoot: join(workspaceRoot, 'sdkwork-plugins', 'apps', 'sdkwork-plugins-pc', 'packages'),
    copyFiles: ['sdkwork-plugins-pc-admin/src/copy/pluginsAdminCopy.ts'],
    pages: ['sdkwork-plugins-pc-admin/src/index.tsx'],
  },
  {
    id: 'agents',
    packageRoot: join(workspaceRoot, 'sdkwork-agents', 'apps', 'sdkwork-agents-pc', 'packages'),
    copyFiles: [
      'sdkwork-agents-pc-admin/src/agentAdminCopy.ts',
      'sdkwork-agents-pc-admin/src/agentCategoryCopy.ts',
    ],
    pages: [
      'sdkwork-agents-pc-admin/src/index.tsx',
      'sdkwork-agents-pc-admin/src/agentCategoriesPage.tsx',
      'sdkwork-agents-pc-admin/src/agentCategoryDrawer.tsx',
      'sdkwork-agents-pc-admin/src/agentCategoryUi.tsx',
    ],
  },
];

const COPY_HOOK = /\buse[A-Za-z]*Copy\(/;
const COPY_MODULE_SHAPE = /\bconst\s+zh\s*:\s*[A-Za-z]+Copy\s*=/;

/** 只保留英文单词（双字母起，避开 `v{version}` 这类单字符前缀），剔除技术标识。 */
function untranslatedWords(text) {
  const words = text.match(/[A-Za-z][A-Za-z0-9_.\-/]+/g) ?? [];
  return words.filter((word) => !TECHNICAL_TOKENS.has(word));
}

/**
 * 是否为用户可见英文文案。
 *
 * `requireHumanShape` 用于属性/对象字面量：`label: 'activate'`、`title: 'active'`
 * 这类小写单词是 wire token / 状态标识，不是待翻译文案；而 `'Standard capability'`、
 * `'Create package'` 这类首字母大写或带空格的值才是真正的英文 copy。
 */
function isUserFacingEnglish(text, { requireHumanShape = false } = {}) {
  if (untranslatedWords(text).length === 0) {
    return false;
  }
  if (!requireHumanShape) {
    return true;
  }
  const trimmed = text.trim();
  return /^[A-Z]/.test(trimmed) || /\s/.test(trimmed) || /[:：!?…—]/.test(trimmed);
}

function collectStringLiterals(node, source) {
  const strings = [];
  const visit = (current) => {
    if (
      ts.isStringLiteral(current)
      || ts.isNoSubstitutionTemplateLiteral(current)
    ) {
      strings.push(current.text);
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return strings;
}

function analyzeFile(relativePath, text) {
  const findings = [];
  const source = ts.createSourceFile(
    relativePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const lineOf = (node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.text.replace(/\s+/g, ' ').trim();
      if (isUserFacingEnglish(raw)) {
        findings.push(`${relativePath}:${lineOf(node)}: JSX 文本残留「${raw}」`);
      }
    }

    if (ts.isJsxAttribute(node) && COPY_ATTRIBUTES.has(node.name.getText(source))) {
      const initializer = node.initializer;
      if (initializer && ts.isStringLiteral(initializer)) {
        if (isUserFacingEnglish(initializer.text, { requireHumanShape: true })) {
          findings.push(
            `${relativePath}:${lineOf(node)}: ${node.name.getText(source)} 残留「${initializer.text}」`,
          );
        }
      } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
        for (const literal of collectStringLiterals(initializer.expression, source)) {
          if (isUserFacingEnglish(literal, { requireHumanShape: true })) {
            findings.push(
              `${relativePath}:${lineOf(node)}: ${node.name.getText(source)} 残留「${literal}」`,
            );
          }
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(source).replace(/^['"]|['"]$/g, '');
      if (
        COPY_ATTRIBUTES.has(name)
        && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
        && isUserFacingEnglish(node.initializer.text, { requireHumanShape: true })
      ) {
        findings.push(
          `${relativePath}:${lineOf(node)}: ${name} 残留「${node.initializer.text}」`,
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return findings;
}

function readModuleSource(module_, relativePath) {
  const file = join(module_.packageRoot, relativePath);
  assert.ok(existsSync(file), `缺少文件 ${file}`);
  return readFileSync(file, 'utf8');
}

for (const module_ of MODULES) {
  if (!existsSync(module_.packageRoot)) {
    continue;
  }

  test(`[${module_.id}] copy 模块存在且带 zh 投影`, () => {
    const missing = [];
    for (const copyFile of module_.copyFiles) {
      const file = join(module_.packageRoot, copyFile);
      if (!existsSync(file)) {
        missing.push(copyFile);
        continue;
      }
      const text = readFileSync(file, 'utf8');
      if (!COPY_MODULE_SHAPE.test(text)) {
        missing.push(`${copyFile}（缺少 const zh: XxxCopy 投影）`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test(`[${module_.id}] 页面/组件都消费 copy hook`, () => {
    const offenders = [];
    for (const page of module_.pages) {
      const text = readModuleSource(module_, page);
      if (!COPY_HOOK.test(text)) {
        offenders.push(page);
      }
    }
    assert.deepEqual(offenders, []);
  });

  test(`[${module_.id}] 页面/组件无硬编码英文用户文案`, () => {
    const findings = [];
    for (const page of module_.pages) {
      findings.push(...analyzeFile(page, readModuleSource(module_, page)));
    }
    assert.deepEqual(findings, []);
  });
}
