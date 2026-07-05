#!/usr/bin/env node
// One-off: backfill column definitions for commerce_account_ledger_entry and
// commerce_billing_prehold in docs/schema-registry/tables/001-commerce.yaml.
// The file uses CRLF; the Edit tool could not match LF old_strings against it.
// Normalize to LF, apply replacements, restore CRLF. commerce_recharge_package
// already has its columns. Delete this script after running.

import { readFile, writeFile } from "node:fs/promises";

const PATH = "docs/schema-registry/tables/001-commerce.yaml";
let text = await readFile(PATH, "utf8");
const wasCRLF = text.includes("\r\n");
text = text.replace(/\r\n/g, "\n");

const ledgerOld =
  "  columns:\n    id: int64\n- table: commerce_billing_prehold";
const ledgerNew =
  "  columns:\n    id: int64\n" +
  "    tenant_id: int64\n" +
  "    account_id: int64\n" +
  "    entry_type: enum_int32\n" +
  "    amount: decimal\n" +
  "    currency: string(10)\n" +
  "    direction: enum_int32\n" +
  "    reference_type: enum_int32\n" +
  "    reference_id: string(128)\n" +
  "    settled_at: instant\n" +
  "    settlement_status: enum_int32\n" +
  "    metadata: json\n" +
  "    created_at: instant\n" +
  "    updated_at: instant\n" +
  "- table: commerce_billing_prehold";

const preholdOld =
  "  columns:\n    id: int64\n- table: commerce_billing_history";
const preholdNew =
  "  columns:\n    id: int64\n" +
  "    tenant_id: int64\n" +
  "    account_id: int64\n" +
  "    prehold_amount: decimal\n" +
  "    currency: string(10)\n" +
  "    reason: enum_int32\n" +
  "    reference_id: string(128)\n" +
  "    expire_at: instant\n" +
  "    released_at: instant\n" +
  "    status: enum_int32\n" +
  "    metadata: json\n" +
  "    created_at: instant\n" +
  "    updated_at: instant\n" +
  "- table: commerce_billing_history";

let count = 0;
if (text.includes(ledgerOld)) {
  text = text.replace(ledgerOld, ledgerNew);
  count++;
} else {
  console.error("ledger old NOT found");
}
if (text.includes(preholdOld)) {
  text = text.replace(preholdOld, preholdNew);
  count++;
} else {
  console.error("prehold old NOT found");
}

if (wasCRLF) {
  text = text.replace(/\n/g, "\r\n");
}

await writeFile(PATH, text, "utf8");
console.log(JSON.stringify({ replacements: count, wasCRLF }));
