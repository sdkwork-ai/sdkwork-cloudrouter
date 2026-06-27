import { existsSync, readFileSync } from 'node:fs';

function normalizeEnvValue(value) {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function stripOptionalQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseEnvFileContent(content) {
  const values = {};
  for (const [lineIndex, rawLine] of String(content ?? '').split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) {
      if (!normalizedLine.includes('=')) {
        continue;
      }
      throw new Error(`Invalid env file line ${lineIndex + 1}: ${rawLine}`);
    }

    const name = normalizedLine.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
      throw new Error(`Invalid env variable name on line ${lineIndex + 1}: ${name}`);
    }

    values[name] = stripOptionalQuotes(normalizedLine.slice(separatorIndex + 1).trim());
  }
  return values;
}

export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  return parseEnvFileContent(readFileSync(filePath, 'utf8'));
}

export function mergeEnvRecordPreservingExistingNonEmpty(existing, generated, keyOrder = []) {
  const merged = {};
  const orderedKeys = [
    ...keyOrder,
    ...Object.keys(existing),
    ...Object.keys(generated),
  ];
  const seen = new Set();

  for (const key of orderedKeys) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const existingValue = normalizeEnvValue(existing[key]);
    const generatedValue = normalizeEnvValue(generated[key]);
    if (existingValue !== undefined) {
      merged[key] = existingValue;
      continue;
    }
    if (generatedValue !== undefined) {
      merged[key] = generatedValue;
    }
  }

  return merged;
}

function formatEnvValue(value) {
  const normalized = String(value ?? '');
  if (!normalized) {
    return '';
  }
  if (/[\s#"'\\]/u.test(normalized)) {
    return JSON.stringify(normalized);
  }
  return normalized;
}

export function formatEnvFileContent(record, {
  headerLines = [],
  keyOrder = [],
  keyComments = {},
  sectionBreaks = [],
} = {}) {
  const lines = [...headerLines];
  if (lines.length > 0 && lines.at(-1) !== '') {
    lines.push('');
  }

  const sectionByKey = new Map(
    sectionBreaks.map((section) => [section.beforeKey, section.lines ?? []]),
  );

  const orderedKeys = [
    ...keyOrder,
    ...Object.keys(record),
  ];
  const seen = new Set();
  for (const key of orderedKeys) {
    if (seen.has(key) || !Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }
    seen.add(key);
    const sectionLines = sectionByKey.get(key);
    if (sectionLines?.length) {
      if (lines.length > 0 && lines.at(-1) !== '') {
        lines.push('');
      }
      lines.push(...sectionLines);
    }
    const inlineComment = keyComments[key];
    if (inlineComment) {
      lines.push(inlineComment.startsWith('#') ? inlineComment : `# ${inlineComment}`);
    }
    lines.push(`${key}=${formatEnvValue(record[key])}`);
  }

  return `${lines.join('\n')}\n`;
}

export function envFileChanged(before, after) {
  const beforeKeys = Object.keys(before).sort();
  const afterKeys = Object.keys(after).sort();
  if (beforeKeys.length !== afterKeys.length) {
    return true;
  }
  for (let index = 0; index < beforeKeys.length; index += 1) {
    if (beforeKeys[index] !== afterKeys[index]) {
      return true;
    }
    const key = beforeKeys[index];
    if (before[key] !== after[key]) {
      return true;
    }
  }
  return false;
}
