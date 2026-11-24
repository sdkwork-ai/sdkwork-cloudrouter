import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import type { TeamErrorReason, TeamMembershipKind } from './teamContract.js';

/**
 * Localized copy for every normalized team failure reason.
 *
 * The reasons are the ones the membership/IAM APIs actually return; the mobile
 * surface never renders a raw backend message for a known reason.
 */
export function teamErrorCopy(reason: TeamErrorReason, t: MembershipTranslate): string {
  switch (reason) {
    case 'seat_capacity_exceeded':
      return t(
        'team.error.seatCapacityExceeded',
        '坐席已全部分配，请先购买更多坐席再分配。',
      );
    case 'seat_already_assigned':
      return t('team.error.seatAlreadyAssigned', '该成员已持有坐席。');
    case 'not_organization_member':
      return t('team.error.notOrganizationMember', '该用户不是组织的有效成员。');
    case 'seat_management_forbidden':
      return t('team.error.seatManagementForbidden', '仅组织所有者或管理员可以管理坐席。');
    case 'team_subscription_inactive':
      return t('team.error.subscriptionInactive', '团队订阅当前未生效。');
    case 'last_seat_owner_required':
      return t(
        'team.error.lastSeatOwnerRequired',
        '组织所有者需保留最后一个生效坐席，请先为其他成员分配坐席后再回收。',
      );
    case 'seat_assignment_not_found':
      return t('team.error.seatAssignmentNotFound', '该成员未持有坐席。');
    case 'organization_scope_required':
      return t('team.error.organizationScopeRequired', '未选择团队组织。');
    case 'team_subscription_unbound':
      return t(
        'team.error.subscriptionUnbound',
        '团队订阅尚未绑定组织，请先完成组织绑定再管理坐席。',
      );
    case 'team_subscription_already_unbound':
      return t(
        'team.error.subscriptionAlreadyUnbound',
        '当前账号已有一笔未绑定组织的团队订阅，请先绑定组织后再购买。',
      );
    case 'team_subscription_not_found':
      return t(
        'team.error.subscriptionNotFound',
        '未找到可绑定的团队订阅，请先完成团队订阅购买。',
      );
    case 'team_organization_already_subscribed':
      return t(
        'team.error.organizationAlreadySubscribed',
        '该组织已拥有生效中的团队订阅，无法重复绑定。',
      );
    case 'organization_sign_in_required':
      return t(
        'team.error.organizationSignInRequired',
        '该平台需要在登录时选择组织，请重新登录并选择团队组织。',
      );
    case 'unauthenticated':
      return t('team.error.unauthenticated', '需要登录后继续。');
    default:
      return t('team.error.unknown', '团队订阅加载失败，请稍后重试。');
  }
}

export function teamRoleLabel(role: TeamMembershipKind | undefined, t: MembershipTranslate): string {
  switch (role) {
    case 'owner':
      return t('team.role.owner', '所有者');
    case 'admin':
      return t('team.role.admin', '管理员');
    default:
      return t('team.role.member', '成员');
  }
}

export function teamSeatPolicyLabel(
  policy: 'strict' | 'flex_overflow',
  t: MembershipTranslate,
): string {
  return policy === 'flex_overflow'
    ? t('team.policy.flexOverflow', '弹性超配')
    : t('team.policy.strict', '严格匹配');
}
