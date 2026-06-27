#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routesYamlPath = path.join(root, 'docs/schema-registry/frontend-field-contracts/routes/routes.yaml');
const classificationPath = path.join(root, 'docs/schema-registry/frontend-route-classification.yaml');
const manifestPath = path.join(root, 'generated/schema/manifest/schema-manifest.json');
const indexPath = path.join(root, 'docs/schema-registry/frontend-field-contracts/index.yaml');

function readYamlRoutes(content) {
  const routes = new Set();
  for (const match of content.matchAll(/^- route: (.+)$/gm)) {
    routes.add(match[1]);
  }
  return routes;
}

function extractPortalRoutes() {
  const result = spawnSync('python', ['-B', '-c', `
import sys
sys.path.insert(0, ${JSON.stringify(root)})
from tools.frontend_contract_guardian import FrontendContractGuardian
guardian = FrontendContractGuardian(${JSON.stringify(root)})
print("\\n".join(guardian.extract_portal_routes()))
`], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'failed to extract portal routes');
  }
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

function resolvePackage(route) {
  if (route.startsWith('/admin/announcement')) return '@sdkwork/clawrouter-pc-admin-announcement';
  if (route.startsWith('/admin/catalog')) return '@sdkwork/clawrouter-pc-admin-catalog';
  if (route.startsWith('/admin/inventory')) return '@sdkwork/clawrouter-pc-admin-inventory';
  if (route.startsWith('/admin/orders')) return '@sdkwork/clawrouter-pc-admin-orders';
  if (route.startsWith('/admin/payments')) return '@sdkwork/clawrouter-pc-admin-payments';
  if (route.startsWith('/admin/memberships')) return '@sdkwork/clawrouter-pc-admin-memberships';
  if (route.startsWith('/admin/wallet')) return '@sdkwork/clawrouter-pc-admin-wallet';
  if (route.startsWith('/admin/finance')) return '@sdkwork/clawrouter-pc-admin-finance';
  if (route.startsWith('/admin/marketing')) return '@sdkwork/clawrouter-pc-admin-marketing';
  if (route.startsWith('/admin/oauth')) return '@sdkwork/clawrouter-pc-admin-oauth';
  return null;
}

function resolveDependencyFamily(route) {
  if (route.startsWith('/admin/oauth')) return 'sdkwork-iam-backend-sdk';
  return 'sdkwork-clawrouter-backend-sdk';
}

function resolveOwner(route) {
  if (route.startsWith('/admin/oauth')) return 'appbase-iam';
  return 'admin-control-plane';
}

function packageFolder(packageName) {
  return `sdkwork-${packageName.replace('@sdkwork/', '')}`;
}

function serviceEvidence(packageName) {
  const folder = packageFolder(packageName);
  if (packageName.includes('announcement')) {
    return `${folder}/src/announcementService.ts`;
  }
  if (packageName.includes('oauth')) {
    return `${folder}/src/oauthAdminService.ts`;
  }
  if (packageName.includes('marketing')) {
    return `${folder}/src/marketingService.ts`;
  }
  if (packageName.includes('catalog')) {
    return `${folder}/src/index.tsx`;
  }
  const serviceFiles = {
    'sdkwork-clawrouter-pc-admin-service-provider': 'serviceProviderService.ts',
    'sdkwork-clawrouter-pc-admin-relay-site': 'siteService.ts',
  };
  if (serviceFiles[folder]) {
    return `${folder}/src/${serviceFiles[folder]}`;
  }
  const serviceName = folder.replace('clawrouter-pc-admin-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return `${folder}/src/${serviceName}Service.ts`;
}

function buildRouteYamlEntry(route, manifestRoutes) {
  const manifestEntry = manifestRoutes[route];
  const tables = manifestEntry?.tables ?? ['ops_audit_log'];
  const dependencyFamily = resolveDependencyFamily(route);
  const lines = [
    `- route: ${route}`,
    '  dependency_owned: true',
    `  dependency_sdk_family: ${dependencyFamily}`,
    '  required_tables:',
    ...tables.map((table) => `  - ${table}`),
  ];
  return lines.join('\n');
}

function buildClassificationEntry(route, packageName) {
  const dependencyFamily = resolveDependencyFamily(route);
  const owner = resolveOwner(route);
  const evidenceService = `apps/sdkwork-clawrouter-pc/packages/${serviceEvidence(packageName)}`;
  return [
    `- route: ${route}`,
    `  package: "${packageName}"`,
    `  owner: ${owner}`,
    '  route_scope: admin',
    '  delivery_kind: sdk_backed_business_runtime',
    '  dependency_owned: true',
    `  dependency_sdk_family: ${dependencyFamily}`,
    '  api_surface: backend',
    '  operation_routes:',
    `  - ${route}`,
    '  evidence:',
    '  - apps/sdkwork-clawrouter-pc/src/App.tsx',
    `  - ${evidenceService}`,
    '  - docs/schema-registry/frontend-field-contracts.yaml',
  ].join('\n');
}

function main() {
  const portalRoutes = extractPortalRoutes();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestRoutes = manifest.routes ?? {};

  let routesYaml = fs.readFileSync(routesYamlPath, 'utf8');
  const existingRoutes = readYamlRoutes(routesYaml);
  const existingClassification = readYamlRoutes(fs.readFileSync(classificationPath, 'utf8'));

  const routeAdditions = [];
  const classificationAdditions = [];

  for (const route of portalRoutes) {
    const packageName = resolvePackage(route);
    if (!packageName) {
      continue;
    }
    if (!existingRoutes.has(route)) {
      routeAdditions.push(buildRouteYamlEntry(route, manifestRoutes));
    }
    if (!existingClassification.has(route)) {
      classificationAdditions.push(buildClassificationEntry(route, packageName));
    }
  }

  if (routeAdditions.length > 0) {
    routesYaml = `${routesYaml.trimEnd()}\n${routeAdditions.join('\n')}\n`;
    fs.writeFileSync(routesYamlPath, routesYaml, 'utf8');
    console.log(`added ${routeAdditions.length} route contract entries`);
  }

  if (classificationAdditions.length > 0) {
    let classification = fs.readFileSync(classificationPath, 'utf8').trimEnd();
    classification = `${classification}\n${classificationAdditions.join('\n')}\n`;
    fs.writeFileSync(classificationPath, classification, 'utf8');
    console.log(`added ${classificationAdditions.length} route classification entries`);
  }

  let index = fs.readFileSync(indexPath, 'utf8');
  if (!index.includes('models/admin-announcement.yaml')) {
    index = index.replace(
      '- models/admin-analytics.yaml',
      '- models/admin-announcement.yaml\n- models/admin-analytics.yaml',
    );
    fs.writeFileSync(indexPath, index, 'utf8');
    console.log('registered models/admin-announcement.yaml fragment');
  }

  if (routeAdditions.length === 0 && classificationAdditions.length === 0) {
    console.log('commerce admin frontend contracts already aligned');
  }
}

main();
