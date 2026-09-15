import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `sdkwork-models` is a sibling repository resolved through the checkout root,
// never by absolute location (DEPENDENCY_MANAGEMENT_SPEC.md section 1).
const MODELS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "sdkwork-models");

function rateHash(pricing, price) {
  const payload = JSON.stringify({
    vendorCode: pricing.vendorCode,
    regionCode: pricing.regionCode,
    catalogKey: pricing.catalogKey,
    priceId: price.priceId,
    priceSide: price.priceSide,
    billability: price.billability,
    chargeTiming: price.chargeTiming,
    calculationMode: price.calculationMode,
    quantityAggregation: price.quantityAggregation,
    meterCode: price.meterCode,
    unitSize: price.unitSize,
    unitPrice: price.unitPrice,
    minimumQuantity: price.minimumQuantity,
    quantityStep: price.quantityStep ?? null,
    currency: price.currency ?? pricing.currency,
    effectiveFrom: price.effectiveFrom,
    effectiveTo: price.effectiveTo ?? null,
    priority: price.priority,
    rateVariant: price.rateVariant,
    schedule: price.schedule ?? null,
    conditions: price.conditions,
    tiers: price.tiers ?? [],
    formula: price.formula ?? null,
  });
  return createHash("sha256").update(payload).digest("hex");
}

const files = [
  resolve(MODELS_ROOT, "models/alibaba/cn/pricing/text-embedding-v3.json"),
  resolve(MODELS_ROOT, "models/alibaba/cn/pricing/text-embedding-v4.json"),
];

for (const file of files) {
  const pricing = JSON.parse(readFileSync(file, "utf8"));
  for (const price of pricing.prices) {
    if (price.meterCode !== "embedding_input_token") continue;
    if (price.unitSize === "1000000" && price.unitPrice === "0.500000") {
      console.log(`SKIP ${file.split("/").pop()}: already canonical`);
      continue;
    }
    price.unitSize = "1000000";
    price.unitPrice = "0.500000";
    const expected = rateHash(pricing, price);
    price.rateHash = expected;
    writeFileSync(file, JSON.stringify(pricing, null, 2) + "\n", "utf8");
    console.log(`FIXED ${file.split("/").pop()} rateHash=${expected}`);
  }
}