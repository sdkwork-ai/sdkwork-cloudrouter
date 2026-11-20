#!/usr/bin/env node
/**
 * Captures the store media set from the real Flutter screens.
 *
 * Writes raw bytes and a machine-readable report under
 * `.sdkwork/tmp/assets-capture/` and never touches `assets/media/`:
 * `APP_ASSETS_SPEC.md` section 6.2 keeps capture and promotion separate so a
 * reviewed run is the only path into tracked catalog media. Promote with
 * `node scripts/promote-store-media.mjs`.
 *
 * Determinism: the Dart harness fixes the viewport, device pixel ratio, theme,
 * fonts and in-memory repositories. `capturedAt` is recorded in the report and
 * in `etc/store-publishing/capture.json`, which feeds the manifest metadata.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAPTURE_SCREENS, loadCaptureMetadata } from './store-publishing-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const captureDir = path.join(appRoot, '.sdkwork', 'tmp', 'assets-capture');
const screenshotsDir = path.join(captureDir, 'screenshots');
const captureConfig = JSON.parse(
  fs.readFileSync(path.join(appRoot, 'assets', 'capture', 'capture.config.json'), 'utf8'),
);
const captureMetadata = loadCaptureMetadata(appRoot);

fs.mkdirSync(screenshotsDir, { recursive: true });

const flutter = process.platform === 'win32' ? 'flutter.bat' : 'flutter';
const result = spawnSync(flutter, ['test', 'test/store_media_capture_test.dart', '--timeout', '120s'], {
  cwd: appRoot,
  env: { ...process.env, STORE_CAPTURE_DIR: captureDir },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});
if (result.error || result.status !== 0) {
  console.error(`store media capture failed (status ${result.status ?? 'null'})`);
  process.exit(1);
}

const surfaces = captureConfig.surfaces.map((surface) => {
  const captures = CAPTURE_SCREENS.map((screen) => {
    const outputPath = path.join(screenshotsDir, surface.id, `${screen}.png`);
    return {
      locale: captureConfig.capture.locales[0],
      routeId: `console.${screen}`,
      status: fs.existsSync(outputPath) ? 'captured' : 'failed',
      outputPath: path.relative(appRoot, outputPath).replaceAll('\\', '/'),
      format: 'PNG',
      ...(fs.existsSync(outputPath) ? {} : { error: 'capture harness produced no file' }),
    };
  });
  return {
    id: surface.id,
    platform: surface.platform,
    displayType: surface.displayType,
    captures,
  };
});
const complete = surfaces.every((surface) => surface.captures.every((entry) => entry.status === 'captured'));
const report = {
  schemaVersion: 1,
  kind: 'sdkwork.app-assets.capture-report',
  appKey: captureConfig.appKey,
  appVersion: captureConfig.appVersion,
  generatedAt: new Date().toISOString(),
  tool: captureConfig.capture.tool,
  status: complete ? 'complete' : 'partial',
  surfaces,
};
fs.writeFileSync(path.join(captureDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!complete) {
  console.error('store media capture is partial; see capture-report.json');
  process.exit(1);
}
if (captureMetadata?.capturedAt) {
  console.log(`captured ${surfaces.length} surfaces into ${path.relative(appRoot, captureDir)}`);
}
