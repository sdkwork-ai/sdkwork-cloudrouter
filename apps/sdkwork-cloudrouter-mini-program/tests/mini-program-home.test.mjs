import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('mini home mirrors the H5 cloud-platform structure', () => {
  const wxml = read('src/pages/dashboard/index.wxml');
  const page = read('src/pages/dashboard/index.js');
  const source = `${wxml}\n${page}`;
  for (const copy of [
    'AI 云计算平台',
    '算力与模型',
    '一站式上云',
    '全部服务',
    '会员中心',
    '快速充值',
    'API 密钥',
    '用量账单',
    '模型与定价',
    '体验中心',
  ]) {
    assert.ok(source.includes(copy), copy + ' is on the home page');
  }
  for (const action of ['apiKeys', 'usage', 'catalog', 'membership', 'recharge']) {
    assert.ok(page.includes(action), action + ' has a home action');
  }
  assert.ok(page.includes('/pages/h5/index'), 'commerce actions use the H5 bridge');
  const bridge = read('src/pages/h5/index.js');
  for (const route of ['membership', 'recharge', 'orders']) {
    assert.ok(bridge.includes(route), route + ' is an allowed H5 bridge route');
  }
  assert.ok(bridge.includes('webPublicHttpUrl'));
  const json = JSON.parse(read('src/pages/dashboard/index.json'));
  assert.equal(json.navigationBarTitleText, '首页');
  assert.equal(json.navigationBarBackgroundColor, '#ffffff');
});
