// The H5 Messages tab integrates the SDKWork IM conversation list.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('H5 Messages tab', () => {
  it('replaces Usage with the IM conversation list and keeps routes mounted', () => {
    const navigation = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/navigation/consoleNavigation.ts',
    );
    assert.ok(navigation.includes("tab.routeKey !== 'usage'"));
    assert.ok(navigation.includes("tab.routeKey !== 'apiKeys'"));
    assert.ok(navigation.includes("key: 'messages'"));
    assert.ok(navigation.includes("path: '/messages'"));
    assert.ok(navigation.includes('messagesTab'));
    assert.ok(navigation.includes("icon: 'messages'"));
    const layout = read(
      'packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx',
    );
    assert.ok(layout.includes('messages: MessageSquare'));
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('CLOUDROUTER_CONSOLE_ROUTES.usage.path'), 'Usage stays a mounted route');
    assert.ok(routes.includes('CLOUDROUTER_CONSOLE_ROUTES.apiKeys.path'), 'API Key stays a mounted route');
  });

  it('mounts the IM conversation list and chat detail', () => {
    const routes = read('src/routes/consoleRoutes.tsx');
    assert.ok(routes.includes('path="/messages"'));
    assert.ok(routes.includes('MessagesScreen'));
    assert.ok(routes.includes('MessagesDetailRoute'));
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/chat/:conversationId"'));
    assert.ok(app.includes('MessagesDetailRoute'));
    const bootstrap = read('src/bootstrap/sdkClients.ts');
    assert.ok(bootstrap.includes('configureCloudRouterIm'));
  });

  it('uses the SDKWork IM generated SDK with the shared Cloud Router session', () => {
    const configure = read(
      'packages/sdkwork-cloudrouter-h5-messages/src/configure.ts',
    );
    assert.ok(configure.includes('new ImSdkClient'));
    assert.ok(configure.includes('getCloudRouterTokenManager'));
    assert.ok(configure.includes('resolveCloudRouterAppApiBaseUrl'));
    assert.ok(configure.includes('websocketBaseUrl'));
    const screen = read(
      'packages/sdkwork-cloudrouter-h5-messages/src/MessagesScreen.tsx',
    );
    assert.ok(screen.includes('conversations.list'));
    assert.ok(screen.includes("navigate(`/chat/${row.id}`"));
    const detail = read(
      'packages/sdkwork-cloudrouter-h5-messages/src/MessagesDetailScreen.tsx',
    );
    assert.ok(detail.includes('conversations.listMessages'));
    assert.ok(detail.includes('conversations.postText'));
    assert.ok(detail.includes('updateReadCursor'));
    assert.ok(detail.includes('currentUserId'));
    assert.ok(detail.includes('navigate(-1)'), 'the chat detail has a back action');
  });

  it('registers the IM SDK in the workspace', () => {
    const manifest = JSON.parse(read('package.json'));
    assert.equal(
      manifest.dependencies['@sdkwork/cloudrouter-h5-messages'],
      'workspace:*',
    );
    const workspace = read('../../pnpm-workspace.yaml');
    assert.ok(workspace.includes('sdkwork-im-sdk/sdkwork-im-sdk-typescript'));
    const messagesManifest = JSON.parse(
      read('packages/sdkwork-cloudrouter-h5-messages/package.json'),
    );
    assert.equal(messagesManifest.dependencies['@sdkwork/im-sdk'], 'workspace:*');
  });
});
