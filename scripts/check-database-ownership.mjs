#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      args.root = path.resolve(argv[index + 1] ?? '');
      index += 1;
    }
  }
  return args;
}

function namespaceForTable(tableName, prefixOwners) {
  for (const { prefix, owner } of prefixOwners) {
    if (tableName.startsWith(prefix)) {
      return { prefix, namespaceOwner: owner };
    }
  }
  return null;
}

function collectCreateTables(sql) {
  const names = [];
  const seen = new Set();
  for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)/gi)) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      names.push(match[1]);
    }
  }
  return names;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const failures = [];

  const prefixRegistry = JSON.parse(
    fs.readFileSync(path.join(args.root, 'database/contract/prefix-registry.json'), 'utf8'),
  );
  const tableRegistry = JSON.parse(
    fs.readFileSync(path.join(args.root, 'database/contract/table-registry.json'), 'utf8'),
  );
  const prefixOwners = prefixRegistry.prefixes
    .slice()
    .sort((left, right) => right.prefix.length - left.prefix.length);

  for (const row of tableRegistry.tables) {
    const namespace = namespaceForTable(row.table_name, prefixOwners);
    if (namespace === null) {
      failures.push(
        `table-registry ${row.table_name}: table prefix is not registered`,
      );
    }
    if (typeof row.owner !== 'string' || row.owner.trim() === '') {
      failures.push(`table-registry ${row.table_name}: write owner is required`);
    }
    if (typeof row.system_of_record !== 'boolean') {
      failures.push(`table-registry ${row.table_name}: system_of_record must be explicit`);
    }
  }

  const baselinePath = path.join(
    args.root,
    'database/ddl/baseline/postgres/0001_clawrouter_baseline.sql',
  );
  const baselineSql = fs.readFileSync(baselinePath, 'utf8');
  for (const tableName of collectCreateTables(baselineSql)) {
    if (namespaceForTable(tableName, prefixOwners) === null) {
      failures.push(
        `claw-router baseline must not define unregistered or imported table ${tableName}`,
      );
    }
  }

  const gatewayRoutingBaselinePath = path.join(
    args.root,
    'database/ddl/baseline/postgres/0003_gateway_routing_dictionary.sql',
  );
  const gatewayRoutingBaselineSql = fs.readFileSync(gatewayRoutingBaselinePath, 'utf8');
  if (collectCreateTables(gatewayRoutingBaselineSql).length > 0) {
    failures.push(
      '0003_gateway_routing_dictionary.sql must remain a retired stub; sdkwork-models composes catalog DDL',
    );
  }

  const messagingBaselinePath = path.join(
    args.root,
    'database/ddl/baseline/postgres/0004_messaging_runtime_projection.sql',
  );
  const messagingBaselineSql = fs.readFileSync(messagingBaselinePath, 'utf8');
  if (collectCreateTables(messagingBaselineSql).length > 0) {
    failures.push(
      '0004_messaging_runtime_projection.sql must remain a retired stub without CREATE TABLE',
    );
  }
  for (const tableName of collectCreateTables(messagingBaselineSql)) {
    if (tableName.startsWith('messaging_')) {
      failures.push(`retired messaging baseline must not define ${tableName}`);
    }
  }

  const installerPath = path.join(
    args.root,
    'services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs',
  );
  const installerSource = fs.readFileSync(installerPath, 'utf8');
  if (/const COMPOSE_SIBLING_DATABASE_MODULES: bool = true/.test(installerSource)) {
    failures.push('installer must not compose all sibling database modules via legacy flag');
  }
  if (/apply_.*messaging_runtime_projection_schema/.test(installerSource)) {
    failures.push('installer must not apply messaging runtime projection schema');
  }
  if (/MESSAGING_RUNTIME_PROJECTION_SQL/.test(installerSource)) {
    failures.push('installer must not include messaging runtime projection SQL');
  }

  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('database ownership alignment check passed\n');
}

main();
