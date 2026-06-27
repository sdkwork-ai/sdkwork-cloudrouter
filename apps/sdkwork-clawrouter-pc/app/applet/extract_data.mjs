import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const appletDir = path.dirname(fileURLToPath(import.meta.url));
const businessRoot = path.resolve(appletDir, '..', '..', '..', '..', '..', '..');

function extractFiles() {
  const catalogPath =
    process.env.SDKWORK_CLAW_ROUTER_MODEL_CATALOG_PATH ??
    path.join(
      businessRoot,
      'spring-ai-plus-server-application',
      'src',
      'main',
      'resources',
      'data',
      'model-catalog',
      'model-catalog-prod.json',
    );
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const models = Array.isArray(catalog.models) ? catalog.models : [];

  let outputEn = "";
  let outputZh = "";

  for (const model of models) {
    const id = model.id ?? model.model;
    const name = model.displayName ?? model.name ?? model.model;
    const provider = model.vendor ?? model.vendorCode ?? '';
    const description = model.description ?? '';
    if (!id || !name) {
      continue;
    }
    outputEn += `      "models.data.${id}.name": ${JSON.stringify(name)},\n`;
    outputEn += `      "models.data.${id}.provider": ${JSON.stringify(provider)},\n`;
    outputEn += `      "models.data.${id}.desc": ${JSON.stringify(description)},\n`;
    outputZh += `      "models.data.${id}.name": ${JSON.stringify(name)},\n`;
    outputZh += `      "models.data.${id}.provider": ${JSON.stringify(provider)},\n`;
    outputZh += `      "models.data.${id}.desc": ${JSON.stringify(description)},\n`;
  }

  console.log("=== EN ===\n" + outputEn);
  console.log("=== ZH ===\n" + outputZh);
}
extractFiles();
