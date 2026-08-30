import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const modelsRoot = 'e:/sdkwork-space/sdkwork-models/models';
const metersPath = join(modelsRoot, 'meters.json');

// Load meters to classify "token" type meters
const meters = JSON.parse(readFileSync(metersPath, 'utf8'));
const metersList = Array.isArray(meters) ? meters : (meters.meters ?? []);
const tokenMeters = new Set(
  metersList
    .filter((m) => m.defaultUnit === 'token')
    .map((m) => m.meterCode),
);

console.log('Token meters:', [...tokenMeters].join(', '));

// Walk vendor/region/pricing/*.json
import { readdirSync } from 'node:fs';
const vendors = readdirSync(modelsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
let fileCount = 0;
let priceCount = 0;
const problems = [];

for (const vendor of vendors) {
  const vendorDir = join(modelsRoot, vendor.name);
  const regions = readdirSync(vendorDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const region of regions) {
    const pricingDir = join(vendorDir, region.name, 'pricing');
    let files;
    try {
      files = readdirSync(pricingDir, { withFileTypes: true }).filter((d) => d.isFile() && d.name.endsWith('.json'));
    } catch {
      continue;
    }
    for (const file of files) {
      fileCount += 1;
      let doc;
      try {
        doc = JSON.parse(readFileSync(join(pricingDir, file.name), 'utf8'));
      } catch (err) {
        problems.push(`[PARSE ERROR] ${vendor.name}/${region.name}/pricing/${file.name}: ${err.message}`);
        continue;
      }
      const prices = Array.isArray(doc) ? doc : (doc.prices ?? []);
      for (const price of prices) {
        priceCount += 1;
        const meter = price.meterCode ?? price.meter_code;
        const unitSize = price.unitSize ?? price.unit_size;
        if (tokenMeters.has(meter) && unitSize !== '1000000') {
          problems.push(
            `${vendor.name}/${region.name}/pricing/${file.name} :: ${price.priceId ?? price.price_id ?? '?'} meter=${meter} unitSize=${unitSize}`,
          );
        }
      }
    }
  }
}

console.log(`\nPricing files: ${fileCount}, price entries: ${priceCount}`);
if (problems.length === 0) {
  console.log('OK: no Token-meter price has a non-1000000 unitSize.');
} else {
  console.log(`FOUND ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
}