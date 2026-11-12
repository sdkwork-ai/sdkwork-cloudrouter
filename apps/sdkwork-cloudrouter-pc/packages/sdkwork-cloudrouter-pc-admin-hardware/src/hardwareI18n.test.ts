import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { hardwareAdminMessages } from './i18n/index.ts';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HAN_TEXT = /[\u3400-\u9fff]/u;

/** Families resolved through template literals in the pages. */
const DYNAMIC_FAMILIES: Record<string, readonly string[]> = {
  'admin.hardware.bulkStatus.': ['updated', 'skipped', 'invalid', 'not_found', 'conflict', 'failed'],
  'admin.hardware.credentialType.': ['bearer_token', 'hmac', 'mtls_x509', 'hardware_attestation'],
  'admin.hardware.deviceStatus.': ['online', 'offline', 'disabled', 'maintenance'],
  'admin.hardware.error.': [
    'conflict',
    'validation',
    'notFound',
    'forbidden',
    'unauthorized',
    'unavailable',
    'revisionConflict',
  ],
  'admin.hardware.events.direction.': ['uplink', 'downlink'],
  'admin.hardware.health.': ['healthy', 'warning', 'critical', 'offline'],
  'admin.hardware.rolloutStatus.': ['draft', 'scheduled', 'running', 'completed', 'canceled', 'failed'],
  'admin.hardware.settings.action.': ['update', 'reset', 'rollback'],
  'admin.hardware.settings.error.': [
    'notWritable',
    'invalidBoolean',
    'invalidInteger',
    'invalidNumber',
    'tooLong',
    'invalidEnum',
    'invalidJson',
    'belowMinimum',
    'aboveMaximum',
    'required',
    'undefinedSetting',
  ],
};

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')
      ? [full]
      : [];
  });
}

function collectLiteralKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of walk(SOURCE_ROOT)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) {
      if (match[1].startsWith('admin.')) {
        keys.add(match[1]);
      }
    }
    for (const match of source.matchAll(/(?:Key|Key:)\s*'([^']+)'/g)) {
      if (match[1].startsWith('admin.')) {
        keys.add(match[1]);
      }
    }
  }
  return keys;
}

describe('smart hardware center message catalog', () => {
  test('English and Chinese catalogs declare the same keys', () => {
    const en = Object.keys(hardwareAdminMessages.en).sort();
    const zh = Object.keys(hardwareAdminMessages.zh).sort();
    expect(en.filter((key) => !hardwareAdminMessages.zh[key])).toEqual([]);
    expect(zh.filter((key) => !hardwareAdminMessages.en[key])).toEqual([]);
    expect(en).toEqual(zh);
  });

  test('English values never carry Chinese copy', () => {
    const offenders = Object.entries(hardwareAdminMessages.en)
      .filter(([, value]) => HAN_TEXT.test(value))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  test('every literal key used by a page resolves in both locales', () => {
    const missing = [...collectLiteralKeys()].filter(
      (key) => hardwareAdminMessages.en[key] === undefined || hardwareAdminMessages.zh[key] === undefined,
    );
    expect(missing).toEqual([]);
  });

  test('every template-resolved family has a value per variant', () => {
    const missing: string[] = [];
    for (const [prefix, variants] of Object.entries(DYNAMIC_FAMILIES)) {
      for (const variant of variants) {
        const key = `${prefix}${variant}`;
        if (hardwareAdminMessages.en[key] === undefined || hardwareAdminMessages.zh[key] === undefined) {
          missing.push(key);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test('interpolation placeholders match between locales', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const mismatched = Object.keys(hardwareAdminMessages.en).filter((key) => {
      const en = placeholders(hardwareAdminMessages.en[key] ?? '');
      const zh = placeholders(hardwareAdminMessages.zh[key] ?? '');
      return en.join(',') !== zh.join(',');
    });
    expect(mismatched).toEqual([]);
  });
});
