import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

for (const file of [
  resolve(MODELS_ROOT, "models/alibaba/cn/pricing/text-embedding-v3.json"),
  resolve(MODELS_ROOT, "models/alibaba/cn/pricing/text-embedding-v4.json"),
]) {
  const pricing = JSON.parse(readFileSync(file, "utf8"));
  const price = pricing.prices[0];
  console.log("=== " + file.split("/").pop());
  console.log("OLD hash:", price.rateHash);
  console.log("OLD unitSize=" + price.unitSize + " unitPrice=" + price.unitPrice);
  // apply canonical token-meter values
  price.unitSize = "1000000";
  price.unitPrice = "0.500000";
  console.log("NEW unitSize=" + price.unitSize + " unitPrice=" + price.unitPrice);
  console.log("NEW hash :", rateHash(pricing, price));
}