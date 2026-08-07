#!/usr/bin/env node
// Legacy wallet balance migration (S5).
//
// Copies legacy `commerce_account` balances into the account domain
// (`acct_account`/`acct_ledger_entry`) so the retired wallet tables can be
// dropped cross-repository later. The migration is idempotent: every migrated
// balance is recorded as a `legacy_wallet_migration` CREDIT ledger entry keyed
// by `legacy-wallet:{legacy_account_id}` (unique per tenant), so a rerun skips
// accounts that were already migrated instead of double-crediting.
//
// Unit conventions: legacy `cash` balances are major-unit decimals ("50.00")
// and become cents (minor units) in the account domain; legacy `points`
// balances are already point integers and stay as-is.
//
// Legacy holds are not replayed as `acct_hold` rows; the frozen balance is
// carried into `acct_account.frozen_amount` unchanged.
//
// Usage:
//   SDKWORK_DATABASE_URL=postgresql://user:pass@host:5432/db \
//     node tools/migrate_legacy_wallet.mjs [--dry-run]
//
// The runner uses the `psql` CLI (standard PostgreSQL client); with --dry-run
// the SQL is printed instead of executed.

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

const DATABASE_URL = process.env.SDKWORK_DATABASE_URL ?? process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');

if (!DATABASE_URL) {
  console.error('SDKWORK_DATABASE_URL (or DATABASE_URL) is required');
  process.exit(2);
}

const MIGRATION_BUSINESS_TYPE = 'legacy_wallet_migration';
const ACCOUNT_PURPOSE_GENERAL = 'GENERAL';
const OWNER_TYPE_USER = 'USER';
const POINTS_CURRENCY_CODE = 'POINT';

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function splitStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function runSql(sql, label) {
  const statements = splitStatements(sql);
  if (DRY_RUN) {
    // Dry run executes read-only probes (SELECT) and prints everything else.
    const executed = [];
    for (const statement of statements) {
      if (/^SELECT\b/i.test(statement)) {
        executed.push(statement);
      } else {
        console.log(`-- ${label} (dry run)`);
        console.log(`${statement};`);
      }
    }
    if (executed.length === 0) {
      return [];
    }
    try {
      const output = execFileSync(
        'psql',
        [DATABASE_URL, '--set', 'ON_ERROR_STOP=1', '--no-psqlrc', '--tuples-only', '--no-align'],
        { input: `${executed.join(';\n')};\n`, encoding: 'utf8', shell: process.platform === 'win32' },
      );
      return output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error(`psql failed for ${label}: ${error.message}`);
      process.exit(1);
    }
  }
  try {
    const output = execFileSync(
      'psql',
      [DATABASE_URL, '--set', 'ON_ERROR_STOP=1', '--no-psqlrc', '--tuples-only', '--no-align'],
      { input: `${statements.join(';\n')};\n`, encoding: 'utf8', shell: process.platform === 'win32' },
    );
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    console.error(`psql failed for ${label}: ${error.message}`);
    process.exit(1);
  }
}

/// "50.00" -> 5000 minor units; "50" -> 5000. Points callers use
/// `integerValue` instead because points are already minor units.
function decimalToMinor(text) {
  const [whole, frac = ''] = String(text).trim().split('.');
  return BigInt(whole || '0') * 100n + BigInt((frac + '00').slice(0, 2));
}

function integerValue(text) {
  return BigInt(String(text).trim().split('.')[0] || '0');
}

function accountScope(tenant, org, owner, asset, currency) {
  return (
    `tenant_id = ${quoteLiteral(tenant)} AND organization_id = ${quoteLiteral(org)}` +
    ` AND owner_type = ${quoteLiteral(OWNER_TYPE_USER)} AND owner_id = ${quoteLiteral(owner)}` +
    ` AND asset_code = ${quoteLiteral(asset)} AND currency_code = ${quoteLiteral(currency)}` +
    ` AND account_purpose = ${quoteLiteral(ACCOUNT_PURPOSE_GENERAL)}`
  );
}

async function main() {
  console.log(`legacy wallet migration${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const tableExists = runSql(
    `SELECT to_regclass('commerce_account') IS NOT NULL AS exists`,
    'legacy table probe',
  );
  const exists = tableExists.length > 0 && ['t', 'true', 'True', '1'].includes(tableExists[0]);
  if (!exists) {
    console.log('legacy commerce_account table not found; nothing to migrate');
    return;
  }

  const accounts = runSql(
    `SELECT id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
            COALESCE(available_amount, '0') AS available_amount,
            COALESCE(frozen_amount, '0') AS frozen_amount
     FROM commerce_account
     WHERE status = 'active'
     ORDER BY tenant_id, organization_id, owner_user_id, asset_type, currency_code`,
    'read legacy accounts',
  ).map((line) => line.split('|'));

  if (accounts.length === 0) {
    console.log('no active legacy accounts found; nothing to migrate');
    return;
  }

  let migrated = 0;
  let alreadyMigrated = 0;
  let skipped = 0;
  const totals = new Map(); // `${tenant}|${asset_code}` -> { legacy, migrated }
  const problems = [];

  for (const [legacyId, tenantId, orgId, ownerId, assetType, currencyCode, available, frozen] of accounts) {
    const assetCode = assetType === 'points' ? 'points' : 'cash';
    const currency = assetType === 'points' ? POINTS_CURRENCY_CODE : currencyCode || 'CNY';
    const amount = assetCode === 'points' ? integerValue(available) : decimalToMinor(available);
    const frozenAmount = assetCode === 'points' ? integerValue(frozen) : decimalToMinor(frozen);
    const key = `legacy-wallet:${legacyId}`;
    const tenant = tenantId || '0';
    const org = orgId || '0';
    const owner = ownerId || '0';

    if (amount < 0n || frozenAmount < 0n) {
      problems.push(
        `negative balance on legacy account ${legacyId} (available=${available}, frozen=${frozen}); skipped`,
      );
      skipped += 1;
      continue;
    }

    const accountUuid = randomUUID();
    const ledgerUuid = randomUUID();
    const journalUuid = randomUUID();
    const traceId = randomUUID();
    const scope = accountScope(tenant, org, owner, assetCode, currency);

    const alreadyMigratedRows = runSql(
      `SELECT 1 FROM acct_ledger_entry WHERE tenant_id = ${quoteLiteral(tenant)} AND idempotency_key = ${quoteLiteral(key)} LIMIT 1`,
      `probe migrated ledger key ${legacyId}`,
    );
    if (alreadyMigratedRows.length > 0) {
      alreadyMigrated += 1;
      continue;
    }

    const sql = `
BEGIN;
INSERT INTO acct_account
    (id, uuid, tenant_id, organization_id, owner_type, owner_id, asset_code, currency_code,
     account_purpose, available_amount, frozen_amount, pending_amount, status, version,
     created_at, updated_at)
SELECT
    (SELECT COALESCE(MAX(id), 0) + 1 FROM acct_account),
    ${quoteLiteral(accountUuid)}, ${quoteLiteral(tenant)}, ${quoteLiteral(org)},
    ${quoteLiteral(OWNER_TYPE_USER)}, ${quoteLiteral(owner)}, ${quoteLiteral(assetCode)}, ${quoteLiteral(currency)},
    ${quoteLiteral(ACCOUNT_PURPOSE_GENERAL)}, 0, 0, 0, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM acct_account WHERE ${scope});

INSERT INTO acct_journal
    (id, uuid, tenant_id, business_type, business_no, request_no, idempotency_key,
     status, trace_id, created_at)
VALUES
    ((SELECT COALESCE(MAX(id), 0) + 1 FROM acct_journal), ${quoteLiteral(journalUuid)}, ${quoteLiteral(tenant)},
     ${quoteLiteral(MIGRATION_BUSINESS_TYPE)}, ${quoteLiteral(key)}, ${quoteLiteral(key)}, ${quoteLiteral(key)},
     1, ${quoteLiteral(traceId)}, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

WITH resolved AS (
    SELECT id, available_amount, frozen_amount
    FROM acct_account
    WHERE ${scope}
    LIMIT 1
),
ledger_ins AS (
    INSERT INTO acct_ledger_entry
        (id, uuid, tenant_id, organization_id, account_id, journal_id, owner_type, owner_id,
         asset_code, currency_code, ledger_type, entry_type, direction, amount,
         balance_before, balance_after, business_type, business_no, request_no,
         idempotency_key, trace_id, created_at)
    SELECT
        (SELECT COALESCE(MAX(id), 0) + 1 FROM acct_ledger_entry),
        ${quoteLiteral(ledgerUuid)}, ${quoteLiteral(tenant)}, ${quoteLiteral(org)},
        resolved.id,
        (SELECT id FROM acct_journal WHERE tenant_id = ${quoteLiteral(tenant)} AND idempotency_key = ${quoteLiteral(key)}),
        ${quoteLiteral(OWNER_TYPE_USER)}, ${quoteLiteral(owner)},
        ${quoteLiteral(assetCode)}, ${quoteLiteral(currency)}, 'AVAILABLE', 'CREDIT', 'CREDIT',
        ${amount.toString()},
        resolved.available_amount, resolved.available_amount + ${amount.toString()},
        ${quoteLiteral(MIGRATION_BUSINESS_TYPE)}, ${quoteLiteral(key)}, ${quoteLiteral(key)},
        ${quoteLiteral(key)}, ${quoteLiteral(traceId)}, CURRENT_TIMESTAMP
    FROM resolved
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING account_id
)
UPDATE acct_account
SET available_amount = available_amount + ${amount.toString()},
    frozen_amount = frozen_amount + ${frozenAmount.toString()},
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT account_id FROM ledger_ins);
COMMIT;`;

    runSql(sql, `migrate legacy account ${legacyId}`);

    const bucket = `${tenant}|${assetCode}`;
    const total = totals.get(bucket) ?? { legacy: 0n, migrated: 0n };
    total.legacy += amount + frozenAmount;
    total.migrated += amount + frozenAmount;
    totals.set(bucket, total);
    migrated += 1;
  }

  console.log(`\nmigrated: ${migrated}`);
  console.log(`already migrated (idempotent skip): ${alreadyMigrated}`);
  console.log(`skipped (problems): ${skipped}`);
  for (const [bucket, total] of totals) {
    console.log(`${bucket}: legacy ${total.legacy} -> acct ${total.migrated}`);
  }
  if (problems.length > 0) {
    console.log('\nproblems:');
    for (const problem of problems) {
      console.log(`- ${problem}`);
    }
  }
  if (DRY_RUN) {
    console.log('\ndry run complete; nothing was written');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
