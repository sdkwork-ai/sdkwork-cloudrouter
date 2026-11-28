import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_VISIBILITY_ADMIN_PATH,
  AGENT_VISIBILITY_ROUTE_SEGMENT,
  buildAgentVisibilityAdminPath,
  readAgentVisibilityAgentId,
} from '@sdkwork/cloudrouter-pc-admin-agent/route';
import { CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS } from './src/admin/cloudRouterAdminHostMount';

/**
 * The Agent catalog's governance action navigates to the visibility page while
 * the host registers that page from a different module. Both now read the route
 * grammar from the package's `./route` entry; this test is the guard that the
 * registered contribution still matches the navigated path.
 */
test('the agent visibility route is registered exactly as the governance action builds it', () => {
  assert.equal(AGENT_VISIBILITY_ROUTE_SEGMENT, 'agent/visibility');
  assert.equal(AGENT_VISIBILITY_ADMIN_PATH, '/admin/agent/visibility');

  const contribution = CLOUDROUTER_ADMIN_ROUTE_CONTRIBUTIONS.find(
    (candidate) => candidate.path === AGENT_VISIBILITY_ROUTE_SEGMENT,
  );
  assert.ok(contribution, 'agent visibility route contribution must be registered');
  assert.equal(contribution.owner, 'sdkwork-agents');
  assert.equal(contribution.adminPackage, '@sdkwork/cloudrouter-pc-admin-agent');
  assert.equal(contribution.requiredPermission, 'cloudrouter.admin.access');
});

test('the visibility deep link round-trips an agent id', () => {
  const path = buildAgentVisibilityAdminPath('agent.pc.contract-reviewer.abc123');
  assert.equal(
    path,
    '/admin/agent/visibility?agent=agent.pc.contract-reviewer.abc123',
  );
  assert.equal(readAgentVisibilityAgentId(path.split('?')[1] ?? ''), 'agent.pc.contract-reviewer.abc123');
  assert.equal(buildAgentVisibilityAdminPath(), '/admin/agent/visibility');
  assert.equal(readAgentVisibilityAgentId(''), undefined);
});
