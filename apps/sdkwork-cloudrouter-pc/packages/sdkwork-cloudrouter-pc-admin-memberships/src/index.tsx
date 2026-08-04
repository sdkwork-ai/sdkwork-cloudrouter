import { MembershipEntitlementsPage as EntitlementsTab } from './pages/MembershipEntitlementsPage';
import { MembershipMembersPage as MembersTab } from './pages/MembershipMembersPage';
import { MembershipPackageGroupsPage } from './pages/MembershipPackageGroupsPage';
import { MembershipPackagesPage } from './pages/MembershipPackagesPage';
import { MembershipPlansPage } from './pages/MembershipPlansPage';
import { MembershipRechargePackagesPage } from './pages/MembershipRechargePackagesPage';
import { MembershipVipPackagesPage } from './pages/MembershipVipPackagesPage';
import { fetchMembershipAdminEntitlements } from './membershipsService';

export type MembershipsAdminSectionId =
  | 'packages'
  | 'vipPackages'
  | 'packageGroups'
  | 'plans'
  | 'members'
  | 'entitlements'
  | 'rechargePackages';

type MembershipsAdminProps = {
  sectionId?: string;
};

function resolveMembershipSectionId(sectionId?: string): MembershipsAdminSectionId {
  if (
    sectionId === 'packages'
    || sectionId === 'vipPackages'
    || sectionId === 'packageGroups'
    || sectionId === 'plans'
    || sectionId === 'members'
    || sectionId === 'entitlements'
    || sectionId === 'rechargePackages'
  ) {
    return sectionId;
  }
  return 'packages';
}

export function MembershipsAdmin({ sectionId }: MembershipsAdminProps = {}) {
  const activeSection = resolveMembershipSectionId(sectionId);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {activeSection === 'packages' ? (
        <MembershipPackagesPage />
      ) : activeSection === 'vipPackages' ? (
        <MembershipVipPackagesPage />
      ) : activeSection === 'packageGroups' ? (
        <MembershipPackageGroupsPage />
      ) : activeSection === 'plans' ? (
        <MembershipPlansPage />
      ) : activeSection === 'members' ? (
        <MembersTab />
      ) : activeSection === 'entitlements' ? (
        <EntitlementsTab loadEntitlements={fetchMembershipAdminEntitlements} />
      ) : (
        <MembershipRechargePackagesPage />
      )}
    </div>
  );
}

export default MembershipsAdmin;
