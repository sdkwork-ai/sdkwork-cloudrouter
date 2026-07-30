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

function readJson(filePath, label, failures) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${label} is missing or invalid JSON: ${error.message}`);
    return null;
  }
}

function sameStringSet(left, right) {
  if (left.size !== right.size) {
    return false;
  }
  return [...left].every((value) => right.has(value));
}

function loadModuleOwnership(root, relativeRoot, expectedModuleId, failures) {
  const moduleRoot = path.join(root, relativeRoot);
  const manifest = readJson(
    path.join(moduleRoot, 'database.manifest.json'),
    `${relativeRoot}/database.manifest.json`,
    failures,
  );
  const prefixRegistry = readJson(
    path.join(moduleRoot, 'contract/prefix-registry.json'),
    `${relativeRoot}/contract/prefix-registry.json`,
    failures,
  );
  const tableRegistry = readJson(
    path.join(moduleRoot, 'contract/table-registry.json'),
    `${relativeRoot}/contract/table-registry.json`,
    failures,
  );

  if (manifest === null || prefixRegistry === null || tableRegistry === null) {
    return null;
  }
  if (manifest.moduleId !== expectedModuleId) {
    failures.push(
      `${relativeRoot}/database.manifest.json: moduleId must be ${expectedModuleId}`,
    );
  }
  if (!Array.isArray(prefixRegistry.prefixes) || prefixRegistry.prefixes.length === 0) {
    failures.push(`${relativeRoot}: prefix registry must declare at least one prefix`);
    return null;
  }
  if (!Array.isArray(tableRegistry.tables)) {
    failures.push(`${relativeRoot}: table registry must declare tables[]`);
    return null;
  }

  const prefixOwners = prefixRegistry.prefixes
    .filter((row) => typeof row?.prefix === 'string' && row.prefix.length > 0)
    .slice()
    .sort((left, right) => right.prefix.length - left.prefix.length);
  if (!prefixOwners.some(({ prefix }) => prefix === manifest.tablePrefix)) {
    failures.push(
      `${relativeRoot}: manifest tablePrefix ${manifest.tablePrefix ?? '<missing>'} is not registered`,
    );
  }

  const tableNames = new Set();
  for (const row of tableRegistry.tables) {
    if (typeof row?.table_name !== 'string' || row.table_name.trim() === '') {
      failures.push(`${relativeRoot}: table-registry table_name is required`);
      continue;
    }
    if (tableNames.has(row.table_name)) {
      failures.push(`${relativeRoot}: duplicate table-registry entry ${row.table_name}`);
      continue;
    }
    tableNames.add(row.table_name);
    if (namespaceForTable(row.table_name, prefixOwners) === null) {
      failures.push(
        `${relativeRoot} table-registry ${row.table_name}: table prefix is not registered by this module`,
      );
    }
    if (typeof row.owner !== 'string' || row.owner.trim() === '') {
      failures.push(`${relativeRoot} table-registry ${row.table_name}: write owner is required`);
    }
    if (typeof row.system_of_record !== 'boolean') {
      failures.push(
        `${relativeRoot} table-registry ${row.table_name}: system_of_record must be explicit`,
      );
    }
  }

  const materializedTables = new Set(
    Array.isArray(manifest.materializedTables) ? manifest.materializedTables : [],
  );
  if (!sameStringSet(tableNames, materializedTables)) {
    failures.push(
      `${relativeRoot}: manifest materializedTables must exactly match its table registry`,
    );
  }

  return { manifest, prefixOwners, tableNames };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const failures = [];

  const rootOwnership = loadModuleOwnership(args.root, 'database', 'clawrouter', failures);
  const allOwnedTables = new Map();
  if (rootOwnership !== null) {
    for (const tableName of rootOwnership.tableNames) {
      allOwnedTables.set(tableName, 'clawrouter');
    }
  }

  const declaredModules = rootOwnership?.manifest.modules;
  if (!Array.isArray(declaredModules)) {
    failures.push('database/database.manifest.json: modules must be an array');
  } else {
    const seenModules = new Set();
    for (const moduleId of declaredModules) {
      if (typeof moduleId !== 'string' || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u.test(moduleId)) {
        failures.push(`database/database.manifest.json: invalid module id ${String(moduleId)}`);
        continue;
      }
      if (seenModules.has(moduleId)) {
        failures.push(`database/database.manifest.json: duplicate module ${moduleId}`);
        continue;
      }
      seenModules.add(moduleId);
      const relativeRoot = path.posix.join('database/modules', moduleId);
      const moduleOwnership = loadModuleOwnership(
        args.root,
        relativeRoot,
        moduleId,
        failures,
      );
      if (moduleOwnership === null) {
        continue;
      }
      for (const tableName of moduleOwnership.tableNames) {
        const existingOwner = allOwnedTables.get(tableName);
        if (existingOwner !== undefined) {
          failures.push(
            `table ${tableName} is registered by both ${existingOwner} and ${moduleId}`,
          );
          continue;
        }
        allOwnedTables.set(tableName, moduleId);
      }
    }
  }

  const baselinePath = path.join(
    args.root,
    'database/ddl/baseline/postgres/0001_clawrouter_baseline.sql',
  );
  const baselineSql = fs.readFileSync(baselinePath, 'utf8');
  const baselineTables = new Set(collectCreateTables(baselineSql));
  for (const tableName of baselineTables) {
    if (!allOwnedTables.has(tableName)) {
      failures.push(
        `claw-router baseline must not define table ${tableName} without a root or declared-module registry owner`,
      );
    }
  }
  for (const [tableName, owner] of allOwnedTables) {
    if (!baselineTables.has(tableName)) {
      failures.push(
        `claw-router baseline is missing registered table ${tableName} owned by ${owner}`,
      );
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
