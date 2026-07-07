import fs from 'node:fs';

import { resolvePortalPackageModule } from './portal-workspace-package-resolver.mjs';

const GENERATION_ASSET_CONFIG_STUB_RE =
  /^export\s+\*\s+from\s+['"]@sdkwork\/generations-pc-asset-config['"];?\s*$/u;

export function isGenerationAssetConfigStubPath(filePath) {
  return filePath.replace(/\\/g, '/').endsWith('/generation-asset-config.ts');
}

export function isGenerationAssetConfigStubContents(contents) {
  return GENERATION_ASSET_CONFIG_STUB_RE.test(contents.trim());
}

export function readGenerationAssetConfigStubReplacement(configDir, filePath, importer = filePath) {
  if (!isGenerationAssetConfigStubPath(filePath)) {
    return null;
  }

  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  if (!isGenerationAssetConfigStubContents(contents)) {
    return null;
  }

  const canonical = resolvePortalPackageModule('@sdkwork/generations-pc-asset-config', configDir, importer);
  if (!canonical) {
    return null;
  }

  try {
    return fs.readFileSync(canonical, 'utf8');
  } catch {
    return null;
  }
}
