import assert from 'node:assert/strict';
import test from 'node:test';
import {
  omitAuthProjectionBody,
  omitAuthProjectionQuery,
} from './auth-projection.ts';

test('omitAuthProjectionQuery removes tenant and subject selectors', () => {
  assert.deepEqual(
    omitAuthProjectionQuery({
      tenantId: 'tenant-1',
      page: '1',
      userId: 'user-1',
    }),
    { page: '1' },
  );
});

test('omitAuthProjectionBody removes tenant selector fields', () => {
  assert.deepEqual(
    omitAuthProjectionBody({
      tenantId: 'tenant-1',
      prompt: 'hello',
    }),
    { prompt: 'hello' },
  );
});
