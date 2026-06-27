import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('h5 routes expose marketplace and server detail surfaces', () => {
  const appSource = fs.readFileSync(path.join(appRoot, 'src/App.tsx'), 'utf8');
  assert.match(appSource, /MarketplacePage/);
  assert.match(appSource, /ServerDetailPage/);
  assert.match(appSource, /MCP_SERVER_ROUTE_PREFIX/);
  assert.doesNotMatch(appSource, /AgentView|CreateAgentView|agentService/i);
});

test('h5 marketplace uses generated MCP app SDK services', () => {
  const marketplace = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-h5-mcp/src/pages/MarketplacePage.tsx'),
    'utf8',
  );
  assert.match(marketplace, /fetchMarketplaceCatalog/);
  assert.match(marketplace, /@sdkwork\/mcp-h5-core\/services/);
  assert.doesNotMatch(marketplace, /fetch\(|axios|XMLHttpRequest/i);
});

test('h5 server detail loads capability tabs via core services', () => {
  const detail = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-h5-mcp/src/pages/ServerDetailPage.tsx'),
    'utf8',
  );
  assert.match(detail, /fetchServerDetail/);
  assert.match(detail, /tools|resources|prompts/);
});

test('h5 core marketplace service uses mcp app sdk client', () => {
  const service = fs.readFileSync(
    path.join(appRoot, 'packages/sdkwork-mcp-h5-core/src/services/marketplaceService.ts'),
    'utf8',
  );
  assert.match(service, /getMCPAppSdkClientWithSession/);
  assert.match(service, /client\.mcp\.listCategories/);
  assert.match(service, /client\.mcp\.listServers/);
  assert.match(service, /client\.mcp\.getServer/);
  assert.doesNotMatch(service, /agentsAppSdkClient/i);
});
