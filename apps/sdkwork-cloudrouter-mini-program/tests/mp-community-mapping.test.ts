import assert from 'node:assert/strict';
import { test } from 'node:test';

import { __testing } from '../packages/sdkwork-cloudrouter-mp-community/src/index.ts';

test('unwraps list envelopes and item envelopes', () => {
  assert.deepEqual(__testing.pageItems({ data: { items: [{ id: '1' }] } }), [{ id: '1' }]);
  assert.deepEqual(__testing.itemRecord({ data: { item: { id: '2' } } }), { id: '2' });
  assert.deepEqual(__testing.itemRecord({ data: { id: '3' } }), { id: '3' });
});

test('maps a member from the flat App API wire fields', () => {
  const member = __testing.mapMember({
    id: 'member-1',
    userName: 'Alice',
    role: 'owner',
    status: 'active',
    tierName: 'Pro',
  });
  assert.equal(member.id, 'member-1');
  assert.equal(member.name, 'Alice');
  assert.equal(member.role, 'owner');
  assert.equal(member.tierName, 'Pro');
});

test('maps a post and keeps numeric stats and tags', () => {
  const post = __testing.mapPost({
    id: 'entry-1',
    author: { id: 'user-1', name: 'Bob', avatarUrl: 'https://cdn/u.png' },
    body: 'hello',
    media: ['drive://spaces/s/nodes/n'],
    tags: ['news'],
    reviewState: 'pending-review',
    stats: { commentCount: 2, reactionCount: 7 },
  });
  assert.equal(post.id, 'entry-1');
  assert.equal(post.authorName, 'Bob');
  assert.equal(post.content, 'hello');
  assert.equal(post.likes, 7);
  assert.equal(post.comments, 2);
  assert.equal(post.reviewState, 'pending-review');
  assert.deepEqual(post.images, ['drive://spaces/s/nodes/n']);
  assert.equal(post.firstTag, 'news');
});

test('maps a circle and coerces wire counts to numbers', () => {
  const circle = __testing.mapCircle({
    id: '1001',
    title: 'AI Builders',
    description: 'build',
    memberCount: '12',
    postCount: '3',
    isJoined: true,
    isPaid: true,
    price: '9.9',
    tabs: ['feeds', 'resources'],
  });
  assert.equal(circle.id, '1001');
  assert.equal(circle.memberCount, 12);
  assert.equal(circle.postCount, 3);
  assert.equal(circle.isJoined, true);
  assert.equal(circle.price, 9.9);
  assert.deepEqual(circle.tabs, ['feeds', 'resources']);
});
