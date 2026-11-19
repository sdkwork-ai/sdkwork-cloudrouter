import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath).replace(/^\uFEFF/u, ''));
}

describe('cloudrouter h5 community integration', () => {
  it('mounts the community workspace outside the console tab shell', () => {
    const app = readText('src/App.tsx');
    assert.match(app, /@sdkwork\/cloudrouter-h5-community/u);
    assert.match(app, /path="\/community\/\*"/u);
    assert.match(app, /<CommunityRoutes locale=\{locale\} \/>/u);
  });

  it('boots the community runtime ports before the first render', () => {
    const runtime = readText('src/bootstrap/runtime.ts');
    assert.match(runtime, /bootstrapCommunityH5\(\)/u);
  });

  it('publishes the complete community route catalog', () => {
    const routes = readText(
      'packages/sdkwork-cloudrouter-h5-community/src/routes.tsx',
    );
    for (const route of [
      '<Route index element={<CommunityList />} />',
      'path="create"',
      'path="mine"',
      'path=":id"',
      'path=":id/profile"',
      'path=":id/profile/groups"',
      'path=":id/profile/groups/edit/:groupId"',
      'path=":id/profile/edit"',
      'path=":id/profile/image"',
      'path=":id/profile/tabs"',
      'path=":id/profile/members"',
      'path=":id/profile/qrcode"',
      'path=":id/post"',
      'path=":id/groups/create"',
      'path=":id/group/:groupId"',
      'path=":id/cashier/:orderId"',
    ]) {
      assert.ok(routes.includes(route), `community route ${route} is mounted`);
    }
  });

  it('binds the generated community SDK, feeds, drive, and order ports', () => {
    const ports = readText(
      'packages/sdkwork-cloudrouter-h5-community/src/ports.ts',
    );
    assert.match(ports, /createGeneratedCommunityAppSdkPort/u);
    assert.match(ports, /configureCommunityFeedsPort/u);
    assert.match(ports, /configureCommunityMediaRuntimePort/u);
    assert.match(ports, /configureCommunityOrderRuntime/u);
    assert.match(ports, /memberships\.orders\.create/u);
    assert.doesNotMatch(ports, /\bfetch\s*\(/u);
  });

  it('declares the community post media upload identity', () => {
    const declaration = readJson('specs/upload.declaration.json');
    const entry = declaration.declarations.find(
      (item) => item.appResourceType === 'community.post_media',
    );
    assert.ok(entry, 'community.post_media is declared');
    assert.equal(entry.scene, 'community-post');
    assert.equal(entry.source, 'sdkwork-cloudrouter-h5');
  });

  it('sources the community and shared mobile UI css from the h5 entry', () => {
    const css = readText('src/index.css');
    assert.match(
      css,
      /@source "\.\.\/packages\/sdkwork-cloudrouter-h5-community\/src";/u,
    );
    assert.match(
      css,
      /sdkwork-community-mobile-react-community\/src";/u,
    );
  });

  it('links the community adapter as a workspace dependency', () => {
    const packageJson = readJson('package.json');
    assert.equal(
      packageJson.dependencies['@sdkwork/cloudrouter-h5-community'],
      'workspace:*',
    );
  });
});
