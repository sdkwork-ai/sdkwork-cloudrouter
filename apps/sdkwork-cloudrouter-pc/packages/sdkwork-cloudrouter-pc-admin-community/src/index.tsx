import { CommunityCirclesPage } from './pages/CommunityCirclesPage';
import { CommunityEntriesPage } from './pages/CommunityEntriesPage';
import { CommunityGroupsPage } from './pages/CommunityGroupsPage';
import { CommunityMembersPage } from './pages/CommunityMembersPage';
import { CommunityModerationPage } from './pages/CommunityModerationPage';
import { CommunityOverviewPage } from './pages/CommunityOverviewPage';
import { CommunityTiersPage } from './pages/CommunityTiersPage';

export type CommunityAdminSectionId =
  | 'overview'
  | 'circles'
  | 'entries'
  | 'moderation'
  | 'members'
  | 'groups'
  | 'tiers';

type CommunityAdminProps = { sectionId?: string };

function resolveCommunitySectionId(sectionId?: string): CommunityAdminSectionId {
  if (
    sectionId === 'circles'
    || sectionId === 'entries'
    || sectionId === 'moderation'
    || sectionId === 'members'
    || sectionId === 'groups'
    || sectionId === 'tiers'
  ) {
    return sectionId;
  }
  return 'overview';
}

/** 社群中心 (Community Center) admin module. */
export function CommunityAdmin({ sectionId }: CommunityAdminProps = {}) {
  const activeSection = resolveCommunitySectionId(sectionId);
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {activeSection === 'overview' ? (
        <CommunityOverviewPage />
      ) : activeSection === 'circles' ? (
        <CommunityCirclesPage />
      ) : activeSection === 'entries' ? (
        <CommunityEntriesPage />
      ) : activeSection === 'moderation' ? (
        <CommunityModerationPage />
      ) : activeSection === 'members' ? (
        <CommunityMembersPage />
      ) : activeSection === 'groups' ? (
        <CommunityGroupsPage />
      ) : (
        <CommunityTiersPage />
      )}
    </div>
  );
}

export default CommunityAdmin;
