import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const RELEASE_VERSION_FILE = path.join(workspaceRoot, 'docs', 'release', 'VERSION.md');

function normalizeReleaseVersion(version) {
  const normalized = String(version ?? '').trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]*$/u.test(normalized)) {
    throw new Error('release version must be a non-empty package-safe value');
  }
  return normalized;
}

function readCurrentReleaseVersion(versionFile = RELEASE_VERSION_FILE) {
  const text = readFileSync(versionFile, 'utf8');
  const match = text.match(/^- Current Version:\s*`([^`]+)`\s*$/mu);
  if (!match) {
    throw new Error(`Current release version not found in ${versionFile}`);
  }
  return normalizeReleaseVersion(match[1]);
}

const DEFAULT_RELEASE_VERSION = readCurrentReleaseVersion();

export {
  DEFAULT_RELEASE_VERSION,
  RELEASE_VERSION_FILE,
  normalizeReleaseVersion,
  readCurrentReleaseVersion,
};
