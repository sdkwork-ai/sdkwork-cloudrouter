import { Route } from 'react-router-dom';

import { CommunityCreatePage } from './pages/CommunityCreatePage.tsx';
import { CommunityDetailPage } from './pages/CommunityDetailPage.tsx';
import { CommunityEntryPage } from './pages/CommunityEntryPage.tsx';
import { CommunityHubPage } from './pages/CommunityHubPage.tsx';
import { CommunityManagePage } from './pages/CommunityManagePage.tsx';

/**
 * Portal route contributions for the community workspace.
 *
 * Rendered inside the portal shell's `<Routes>` block (see
 * `AppShellLayout` `extraRoutes`), so every path is absolute and deep-linkable.
 */
export function CommunityPortalRoutes() {
  return (
    <>
      <Route path="/community" element={<CommunityHubPage />} />
      <Route path="/community/new" element={<CommunityCreatePage />} />
      <Route path="/community/mine" element={<CommunityHubPage />} />
      <Route path="/community/:circleId" element={<CommunityDetailPage />} />
      <Route path="/community/:circleId/manage" element={<CommunityManagePage />} />
      <Route path="/community/:circleId/post/:entryId" element={<CommunityEntryPage />} />
    </>
  );
}

export { CommunityCreatePage } from './pages/CommunityCreatePage.tsx';
export { CommunityDetailPage } from './pages/CommunityDetailPage.tsx';
export { CommunityEntryPage } from './pages/CommunityEntryPage.tsx';
export { CommunityHubPage } from './pages/CommunityHubPage.tsx';
export { CommunityManagePage } from './pages/CommunityManagePage.tsx';
export { communityUiMessages } from './i18n.ts';
export {
  CommunityService,
  activateCircleMembership,
  createCircleMembershipOrder,
  ensureCommunityPcRuntime,
  isCircleOrderPaid,
  type CircleMembershipOrderResult,
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type CreateCircleMembershipOrderInput,
  type MembershipTier,
  type Post,
  type PostComment,
  type Resource,
} from './runtime.ts';
export { CLOUDROUTER_PC_COMMUNITY_POST_UPLOAD } from './uploadDeclaration.ts';
