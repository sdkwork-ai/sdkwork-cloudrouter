// The H5 Playground tab replaces API Key in the tab bar.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('H5 Playground tab', () => {
  it('drops API Key from the tab bar and appends Playground', () => {
    const navigation = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/navigation/consoleNavigation.ts',
    );
    assert.ok(
      navigation.includes("tab.routeKey !== 'apiKeys'"),
      'API Key is filtered out of the H5 tab bar',
    );
    assert.ok(
      navigation.includes("tab.routeKey !== 'usage'"),
      'Usage is filtered out of the H5 tab bar',
    );
    assert.ok(navigation.includes("key: 'playground'"));
    assert.ok(navigation.includes("path: '/playground'"));
    assert.ok(navigation.includes('playgroundTab'));
    assert.ok(navigation.includes("icon: 'playground'"));
    const layout = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx',
    );
    assert.ok(layout.includes('grid-cols-5'));
    assert.ok(layout.includes('playground: Sparkles'), 'Playground has a tab glyph');
  });

  it('mounts the Playground screen and keeps API Key reachable as a route', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('path="/playground"'));
    assert.ok(routes.includes('PlaygroundScreen'));
    assert.ok(routes.includes('cloudrouter.console.playground.title'));
    assert.ok(routes.includes('cloudrouter.console.playground.welcome'));
    assert.ok(
      routes.includes('CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path'),
      'API Key remains reachable from the home action',
    );
  });

  it('binds the CloudRouter session to the Agents H5 Playground runtime', () => {
    const bootstrap = read('src/bootstrap/sdkClients.ts');
    assert.ok(bootstrap.includes('configureCloudRouterPlayground'));
    const adapter = read('packages/sdkwork-cloudrouter-h5-playground/src/configure.ts');
    assert.ok(adapter.includes('createClient'));
    assert.ok(adapter.includes('getCloudRouterTokenManager'), 'the playground shares the console session');
    assert.ok(adapter.includes('resolveCloudRouterAgentsApiBaseUrl'));
    assert.match(adapter, /\/app\/v3\/api/u, 'the Agents SDK base carries its canonical suffix');
    assert.ok(adapter.includes('configurePlaygroundRuntime'));
  });

  it('ships the Playground implementation in the owning Agents project', () => {
    const owningRoot = path.resolve(
      ROOT,
      '../../../sdkwork-agents/apps/sdkwork-agents-h5/packages/sdkwork-agents-h5-playground',
    );
    assert.ok(fs.existsSync(path.join(owningRoot, 'package.json')));
    assert.ok(fs.existsSync(path.join(owningRoot, 'specs/component.spec.json')));
    const index = fs.readFileSync(path.join(owningRoot, 'src/index.ts'), 'utf8');
    assert.ok(index.includes('PlaygroundScreen'));
    assert.ok(index.includes('configurePlaygroundRuntime'));
    const screen = fs.readFileSync(path.join(owningRoot, 'src/PlaygroundScreen.tsx'), 'utf8');
    assert.ok(screen.includes('ConversationScreen'));
    const runtime = fs.readFileSync(path.join(owningRoot, 'src/runtime.ts'), 'utf8');
    assert.ok(runtime.includes('createSdkworkAgentService'));
    assert.ok(runtime.includes('createSdkworkAgentChatService'));
    assert.ok(runtime.includes('configureConversationPort'));
  });
});
