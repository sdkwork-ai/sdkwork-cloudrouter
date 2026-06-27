import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

import { resources } from "./packages/sdkwork-clawrouter-pc-i18n/src/resources";

const PORTAL_ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const PACKAGES_ROOT = path.join(PORTAL_ROOT, "packages");
const HAN_TEXT = /[\u3400-\u9fff]/u;
const BUTTON_ACTION_TEXT =
  /\b(Add|All|Apply|Archive|Assist|Audio|Back|Cancel|Clear|Close|Confirm|Continue|Copy|Create|Delete|Disable|Dismiss|Download|Edit|Enable|Export|Generate|Get|Image|Import|Install|Invite|Last|Login|Manage|Mark|Motion|Music|Next|Open|Pay|Post|Previous|Prompt|Publish|Ratio|Refresh|Regenerate|Reject|Remove|Reset|Retry|Revoke|Run|Save|Search|Select|Send|Settings|Sign|Start|Stop|Submit|Sync|Test|Time|Type|Update|Upload|Use|Video|View|Voice)\b/i;
const BUTTON_TEXT_ALLOWLIST = new Set([
  "API",
  "CSV",
  "DELETE",
  "DeepSeek",
  "Discord",
  "Gemini",
  "GET",
  "GitHub",
  "Google",
  "HD",
  "ID",
  "JSON",
  "LLM",
  "OpenAI",
  "OpenRouter",
  "PATCH",
  "PDF",
  "POST",
  "PUT",
  "SDK",
  "SFX",
  "UHD",
  "URL",
  "VIP",
]);

type I18nViolation = {
  file: string;
  line: number;
  text: string;
};

type ButtonI18nViolation = I18nViolation & {
  kind: string;
};

test("console and admin page sources keep user-facing Chinese text behind i18n keys", () => {
  const violations = collectConsoleAdminI18nViolations();

  assert.deepEqual(
    violations,
    [],
    `Found ${violations.length} non-i18n Chinese text occurrences:\n${violations
      .slice(0, 80)
      .map((violation) => `${violation.file}:${violation.line} ${violation.text}`)
      .join("\n")}`,
  );
});

test("console and admin i18n resources have English values and matching language keys", () => {
  const en = collectI18nResourceTranslations("en");
  const zh = collectI18nResourceTranslations("zh");
  const scopedEnKeys = [...en.keys()].filter(isConsoleAdminI18nKey).sort();
  const scopedZhKeys = [...zh.keys()].filter(isConsoleAdminI18nKey).sort();
  const englishChineseValues = scopedEnKeys
    .map((key) => ({ key, text: en.get(key) ?? "" }))
    .filter((entry) => HAN_TEXT.test(entry.text));

  assert.deepEqual(
    scopedEnKeys.filter((key) => !zh.has(key)),
    [],
    "Every console/admin English i18n key should also exist in Chinese resources.",
  );
  assert.deepEqual(
    scopedZhKeys.filter((key) => !en.has(key)),
    [],
    "Every console/admin Chinese i18n key should also exist in English resources.",
  );
  assert.deepEqual(
    englishChineseValues,
    [],
    `Found ${englishChineseValues.length} console/admin English translations that still contain Chinese text:\n${englishChineseValues
      .slice(0, 80)
      .map((entry) => `${entry.key}: ${entry.text}`)
      .join("\n")}`,
  );
});

test("console dashboard i18n value units do not degrade to question marks", () => {
  const zh = collectI18nResourceTranslations("zh");

  assert.equal(zh.get("console.dashboard.dashboardview.text.pointsValue"), "{{value}} 点");
  assert.equal(zh.get("console.dashboard.dashboardview.text.timesValue"), "{{value}} 次");
});

test("portal button action text is localized instead of hardcoded English", () => {
  const violations = collectPortalButtonI18nViolations();

  assert.deepEqual(
    violations,
    [],
    `Found ${violations.length} hardcoded English button labels:\n${violations
      .slice(0, 120)
      .map((violation) => `${violation.file}:${violation.line} ${violation.kind}: ${violation.text}`)
      .join("\n")}`,
  );
});

function collectConsoleAdminI18nViolations(): I18nViolation[] {
  return collectSourceFiles()
    .flatMap((file) => inspectSourceFile(file))
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function collectPortalButtonI18nViolations(): ButtonI18nViolation[] {
  return collectPortalSourceFiles()
    .flatMap((file) => inspectButtonI18nFile(file))
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.kind.localeCompare(right.kind));
}

function collectSourceFiles(): string[] {
  const consoleAdminPackageFiles = readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => /^sdkwork-clawrouter-(admin|console)-/.test(entry.name))
    .flatMap((entry) => walk(path.join(PACKAGES_ROOT, entry.name, "src")));
  const sharedConsoleAdminFiles = [
    path.join(PACKAGES_ROOT, "sdkwork-clawroutes-pc-commons", "src", "components", "Navbar.tsx"),
  ];

  return [...consoleAdminPackageFiles, ...sharedConsoleAdminFiles];
}

function collectPortalSourceFiles(): string[] {
  return [
    ...walk(PACKAGES_ROOT),
    ...walk(path.join(PORTAL_ROOT, "src")),
  ];
}

function walk(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === "dist" ? [] : walk(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function inspectButtonI18nFile(file: string): ButtonI18nViolation[] {
  const sourceText = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: ButtonI18nViolation[] = [];
  const localStringArrays = collectLocalStringArrays(sourceFile);

  const record = (node: ts.Node, kind: string, value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (
      !normalized
      || BUTTON_TEXT_ALLOWLIST.has(normalized)
      || !/[A-Za-z]/.test(normalized)
      || !BUTTON_ACTION_TEXT.test(normalized)
    ) {
      return;
    }
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      file: path.relative(PORTAL_ROOT, file).replace(/\\/g, "/"),
      line: position.line + 1,
      kind,
      text: normalized,
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === "button") {
      for (const item of collectJsxButtonLiteralText(node.children)) {
        record(item.node, "button text", item.text);
      }
      for (const item of collectJsxButtonLocalOptionText(node.children, localStringArrays)) {
        record(item.node, "button local option text", item.text);
      }
      for (const attribute of ["aria-label", "title"]) {
        for (const item of collectLiteralJsxAttributeValues(node.openingElement.attributes, attribute)) {
          record(item.node, attribute, item.text);
        }
      }
    } else if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === "button") {
      for (const attribute of ["aria-label", "title"]) {
        for (const item of collectLiteralJsxAttributeValues(node.attributes, attribute)) {
          record(item.node, attribute, item.text);
        }
      }
    } else if (ts.isJsxElement(node) && isCustomButtonTag(node.openingElement.tagName.getText(sourceFile))) {
      for (const item of collectJsxButtonLiteralText(node.children)) {
        record(item.node, `${node.openingElement.tagName.getText(sourceFile)} text`, item.text);
      }
      for (const item of collectJsxButtonLocalOptionText(node.children, localStringArrays)) {
        record(item.node, `${node.openingElement.tagName.getText(sourceFile)} local option text`, item.text);
      }
      for (const attribute of ["aria-label", "title", "label", "copiedLabel", "errorLabel", "confirmLabel", "retryLabel"]) {
        for (const item of collectLiteralJsxAttributeValues(node.openingElement.attributes, attribute)) {
          record(item.node, `${node.openingElement.tagName.getText(sourceFile)} ${attribute}`, item.text);
        }
      }
    } else if (ts.isJsxSelfClosingElement(node) && isCustomButtonTag(node.tagName.getText(sourceFile))) {
      for (const attribute of ["aria-label", "title", "label", "copiedLabel", "errorLabel", "confirmLabel", "retryLabel"]) {
        for (const item of collectLiteralJsxAttributeValues(node.attributes, attribute)) {
          record(item.node, `${node.tagName.getText(sourceFile)} ${attribute}`, item.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function isCustomButtonTag(tagName: string): boolean {
  return /^IconButton$|^CopyButton$|Button$/.test(tagName);
}

function collectLocalStringArrays(sourceFile: ts.SourceFile): Map<string, Map<string, string>> {
  const arrays = new Map<string, Map<string, string>>();

  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && ts.isArrayLiteralExpression(skipAsConst(node.initializer))
    ) {
      const values = new Map<string, string>();
      for (const item of skipAsConst(node.initializer).elements) {
        if (!ts.isObjectLiteralExpression(item)) {
          continue;
        }
        const id = readStringProperty(item, "id");
        const label = readStringProperty(item, "label");
        if (id && label) {
          values.set(id, label);
        }
      }
      if (values.size > 0) {
        arrays.set(node.name.text, values);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return arrays;
}

function skipAsConst(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression)) {
    return skipAsConst(expression.expression);
  }
  return expression;
}

function readStringProperty(object: ts.ObjectLiteralExpression, name: string): string | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameFromPropertyName(property.name) !== name) {
      continue;
    }
    const value = property.initializer;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      return value.text;
    }
  }
  return undefined;
}

function collectJsxButtonLocalOptionText(
  children: ts.NodeArray<ts.JsxChild>,
  localStringArrays: Map<string, Map<string, string>>,
): Array<{ node: ts.Node; text: string }> {
  const result: Array<{ node: ts.Node; text: string }> = [];
  for (const child of children) {
    if (ts.isJsxExpression(child) && child.expression) {
      result.push(...collectLocalOptionExpressionValues(child.expression, localStringArrays).map((text) => ({
        node: child.expression!,
        text,
      })));
    } else if (ts.isJsxElement(child)) {
      result.push(...collectJsxButtonLocalOptionText(child.children, localStringArrays));
    }
  }
  return result;
}

function collectLocalOptionExpressionValues(
  expression: ts.Expression,
  localStringArrays: Map<string, Map<string, string>>,
): string[] {
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== "label") {
    return [];
  }

  const owner = expression.expression;
  if (!ts.isIdentifier(owner)) {
    return [];
  }

  const labels: string[] = [];
  let cursor: ts.Node | undefined = expression;
  while (cursor) {
    const parent = cursor.parent;
    if (!parent) {
      return labels;
    }
    if (ts.isArrowFunction(parent) && parent.parameters.some((parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === owner.text)) {
      const call = parent.parent;
      if (
        ts.isCallExpression(call)
        && ts.isPropertyAccessExpression(call.expression)
        && call.expression.name.text === "map"
        && ts.isIdentifier(call.expression.expression)
      ) {
        for (const label of localStringArrays.get(call.expression.expression.text)?.values() ?? []) {
          labels.push(label);
        }
      }
      return labels;
    }
    cursor = cursor.parent;
  }

  return labels;
}

function collectJsxButtonLiteralText(children: ts.NodeArray<ts.JsxChild>): Array<{ node: ts.Node; text: string }> {
  const result: Array<{ node: ts.Node; text: string }> = [];
  for (const child of children) {
    if (ts.isJsxText(child)) {
      const text = child.getText().replace(/\s+/g, " ").trim();
      if (text) {
        result.push({ node: child, text });
      }
    } else if (ts.isJsxExpression(child) && child.expression) {
      result.push(...collectLiteralExpressionValues(child.expression).map((text) => ({ node: child.expression!, text })));
    } else if (ts.isJsxElement(child)) {
      result.push(...collectJsxButtonLiteralText(child.children));
    }
  }
  return result;
}

function collectLiteralJsxAttributeValues(
  attributes: ts.JsxAttributes,
  attributeName: string,
): Array<{ node: ts.Node; text: string }> {
  const result: Array<{ node: ts.Node; text: string }> = [];
  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property) || property.name.text !== attributeName || !property.initializer) {
      continue;
    }
    if (ts.isStringLiteral(property.initializer)) {
      result.push({ node: property.initializer, text: property.initializer.text });
    } else if (ts.isJsxExpression(property.initializer) && property.initializer.expression) {
      if (!isI18nCallExpression(property.initializer.expression)) {
        result.push(
          ...collectLiteralExpressionValues(property.initializer.expression).map((text) => ({
            node: property.initializer!.expression!,
            text,
          })),
        );
      }
    }
  }
  return result;
}

function collectLiteralExpressionValues(expression: ts.Expression): string[] {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text];
  }
  if (isI18nCallExpression(expression)) {
    return [];
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...collectLiteralExpressionValues(expression.whenTrue),
      ...collectLiteralExpressionValues(expression.whenFalse),
    ];
  }
  if (ts.isParenthesizedExpression(expression)) {
    return collectLiteralExpressionValues(expression.expression);
  }
  return [];
}

function isI18nCallExpression(expression: ts.Expression): boolean {
  if (!ts.isCallExpression(expression)) {
    return false;
  }
  const callExpression = expression.expression;
  return (ts.isIdentifier(callExpression) && callExpression.text === "t")
    || (ts.isPropertyAccessExpression(callExpression) && callExpression.name.text === "t");
}

function inspectSourceFile(file: string): I18nViolation[] {
  const sourceText = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: I18nViolation[] = [];

  const record = (node: ts.Node, value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || !HAN_TEXT.test(normalized)) {
      return;
    }
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({
      file: path.relative(PORTAL_ROOT, file).replace(/\\/g, "/"),
      line: position.line + 1,
      text: normalized,
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isI18nFallbackLiteral(node)) {
        record(node, node.text);
      }
    } else if (ts.isJsxText(node)) {
      record(node, node.getText(sourceFile));
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      record(node, node.text);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function isI18nFallbackLiteral(node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral): boolean {
  const call = node.parent;
  if (!ts.isCallExpression(call)) {
    return false;
  }
  const [, fallback] = call.arguments;
  if (fallback !== node) {
    return false;
  }
  const expression = call.expression;
  if (ts.isIdentifier(expression) && expression.text === "t") {
    return true;
  }
  return ts.isPropertyAccessExpression(expression)
    && expression.name.text === "t"
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === "i18n";
}

function collectI18nResourceTranslations(language: "en" | "zh"): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(resources[language]?.translation ?? {})) {
    if (typeof value === "string") {
      result.set(key, value);
    }
  }
  return result;
}

function findObjectProperty(object: ts.ObjectLiteralExpression, propertyName: string): ts.ObjectLiteralExpression | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameFromPropertyName(property.name) !== propertyName) {
      continue;
    }
    if (ts.isObjectLiteralExpression(property.initializer)) {
      return property.initializer;
    }
  }
  return undefined;
}

function collectStringObjectProperties(object: ts.ObjectLiteralExpression): Map<string, string> {
  const result = new Map<string, string>();
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const key = propertyNameFromPropertyName(property.name);
    const value = property.initializer;
    if (key && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) {
      result.set(key, value.text);
    }
  }
  return result;
}

function propertyNameFromPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return undefined;
}

function isConsoleAdminI18nKey(key: string): boolean {
  return key.startsWith("admin.") || key.startsWith("console.") || key.startsWith("commons.navbar.");
}
