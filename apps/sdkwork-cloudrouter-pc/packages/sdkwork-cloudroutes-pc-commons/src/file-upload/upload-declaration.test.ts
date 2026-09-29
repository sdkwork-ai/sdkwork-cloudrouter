// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CLOUDROUTER_UPLOAD_CATEGORIES,
  listCloudRouterUploadSlots,
  resolveCloudRouterUploadRetention,
} from './upload-catalog.ts';

/**
 * `DRIVE_SPEC.md` §18 声明镜像防漂移测试。
 *
 * `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json` 是上传身份的唯一权威，
 * 统一上传目录（upload-catalog）是它在代码中的载体。两者一旦漂移，Drive 统计记录的
 * 声明值与实际发送值就会分叉；本测试让漂移在这里失败，而不是静默进入统计。
 */

interface UploadDeclarationEntry {
  appResourceIdKind: string;
  appResourceType: string;
  purpose: string;
  retention: 'long_term' | 'temporary';
  retentionTtlSeconds?: number;
  scene: string;
  source: string;
  uploadProfileCode: string;
}

interface UploadDeclarationFile {
  appId: string;
  declarations: UploadDeclarationEntry[];
  schemaVersion: number;
}

const DECLARATION_PATH = fileURLToPath(
  new URL('../../../../specs/upload.declaration.json', import.meta.url),
);

function loadDeclaration(): UploadDeclarationFile {
  return JSON.parse(readFileSync(DECLARATION_PATH, 'utf8')) as UploadDeclarationFile;
}

/** §8.1 标准 profile 集合；目录与声明都不得出现集合之外的值。 */
const STANDARD_UPLOAD_PROFILES = new Set([
  'generic',
  'video',
  'image',
  'audio',
  'document',
  'archive',
  'text',
  'dataset',
  'attachment',
  'avatar',
  'thumbnail',
]);

describe('upload declaration mirror', () => {
  it('every upload slot is declared with an identical identity entry', () => {
    const declaration = loadDeclaration();
    const declaredKeys = new Set(
      declaration.declarations.map(
        (entry) => `${entry.appResourceType}|${entry.scene}|${entry.uploadProfileCode}|${entry.source}`,
      ),
    );
    for (const slot of listCloudRouterUploadSlots()) {
      const retention = resolveCloudRouterUploadRetention(slot);
      const key = `${slot.appResourceType}|${slot.scene}|${slot.uploadProfileCode}|${slot.source}`;
      expect(declaredKeys.has(key), `slot ${slot.code} (${key}) 未在 upload.declaration.json 中声明`).toBe(true);
      const entry = declaration.declarations.find(
        (candidate) => `${candidate.appResourceType}|${candidate.scene}|${candidate.uploadProfileCode}|${candidate.source}` === key,
      );
      expect(entry, `slot ${slot.code} 缺少声明条目`).toBeTruthy();
      expect(retention.mode).toBe(entry?.retention);
    }
  });

  it('every declaration entry is reachable from the upload catalog', () => {
    const slotKeys = new Set(
      listCloudRouterUploadSlots().map(
        (slot) => `${slot.appResourceType}|${slot.scene}|${slot.uploadProfileCode}|${slot.source}`,
      ),
    );
    for (const entry of loadDeclaration().declarations) {
      const key = `${entry.appResourceType}|${entry.scene}|${entry.uploadProfileCode}|${entry.source}`;
      expect(slotKeys.has(key), `声明条目 ${key} 没有对应的上传 slot`).toBe(true);
    }
  });

  it('temporary retention TTL agrees with the declared retentionTtlSeconds', () => {
    const declaration = loadDeclaration();
    const temporaryCategory = CLOUDROUTER_UPLOAD_CATEGORIES.find((category) => category.retention.mode === 'temporary');
    expect(temporaryCategory).toBeTruthy();
    const declaredTemporary = declaration.declarations.filter((entry) => entry.retention === 'temporary');
    expect(declaredTemporary.length).toBeGreaterThan(0);
    for (const entry of declaredTemporary) {
      expect(entry.retentionTtlSeconds, 'temporary 声明缺少 retentionTtlSeconds').toBeGreaterThan(0);
      expect(
        Number(temporaryCategory?.retention.ttlSeconds),
        `目录 TTL 与声明 TTL 不一致（${String(temporaryCategory?.retention.ttlSeconds)} vs ${String(entry.retentionTtlSeconds)}）`,
      ).toBe(entry.retentionTtlSeconds);
    }
  });

  it('declares standard profiles, distinct identities, and sentence purposes', () => {
    const declaration = loadDeclaration();
    const identities = new Set<string>();
    for (const entry of declaration.declarations) {
      expect(STANDARD_UPLOAD_PROFILES.has(entry.uploadProfileCode)).toBe(true);
      expect(entry.purpose.trim().length).toBeGreaterThan(0);
      const identity = `${entry.appResourceType}|${entry.scene}|${entry.uploadProfileCode}`;
      expect(identities.has(identity), `重复声明的上传身份：${identity}`).toBe(false);
      identities.add(identity);
    }
  });
});
