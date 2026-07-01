#!/usr/bin/env node
/**
 * @deprecated Commerce admin UI removed from Claw Router portal (relay-only admin).
 * Retained only for historical reference; use bootstrap_frontend_contract_from_route_manifest.py instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const classificationPath = path.join(root, 'docs/schema-registry/frontend-route-classification.yaml');

function readYamlRoutes(content) {
  const routes = new Set();
  for (const match of content.matchAll(/^- route: (.+)$/gm)) {
    routes.add(match[1]);
  }
  return routes;
}

function main() {
  const classification = fs.readFileSync(classificationPath, 'utf8');
  const routes = readYamlRoutes(classification);
  const retiredPrefixes = [
    '/admin/catalog',
    '/admin/orders',
    '/admin/payments',
    '/admin/memberships',
    '/admin/marketing',
    '/admin/wallet',
    '/admin/oauth',
  ];
  for (const prefix of retiredPrefixes) {
    for (const route of routes) {
      if (route === prefix || route.startsWith(`${prefix}/`)) {
        console.error(`retired commerce admin route still classified in portal: ${route}`);
        process.exit(1);
      }
    }
  }
  console.log('sync-commerce-admin-frontend-contracts: retired surfaces absent from route classification');
}

main();
