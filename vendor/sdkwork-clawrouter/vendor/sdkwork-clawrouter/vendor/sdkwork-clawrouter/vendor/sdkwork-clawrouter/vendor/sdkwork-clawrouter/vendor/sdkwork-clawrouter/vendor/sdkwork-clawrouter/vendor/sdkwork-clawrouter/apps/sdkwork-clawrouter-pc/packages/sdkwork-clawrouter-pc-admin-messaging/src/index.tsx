import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  MessageSquare,
  Route,
  Send,
  ShieldBan,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  listMessagingProviderAccounts,
  listMessagingRateLimitBuckets,
  listMessagingRouteRules,
  listMessagingSendRequests,
  listMessagingSenderIdentities,
  listMessagingSuppressions,
  listMessagingTemplates,
  listVerificationPolicies,
} from './messagingService';

type MessagingSectionId =
  | 'providers'
  | 'senderIdentities'
  | 'templates'
  | 'routeRules'
  | 'sendRequests'
  | 'diagnostics'
  | 'suppressions'
  | 'rateLimits'
  | 'verificationPolicies';

type MessagingAdminProps = {
  sectionId?: string;
};

const DEFAULT_MESSAGING_SECTION_ID: MessagingSectionId = 'providers';

function resolveMessagingSectionId(sectionId: string | undefined): MessagingSectionId {
  switch (sectionId) {
    case 'providers':
    case 'sender-identities':
      return sectionId === 'sender-identities' ? 'senderIdentities' : 'providers';
    case 'templates':
      return 'templates';
    case 'route-rules':
      return 'routeRules';
    case 'send-requests':
      return 'sendRequests';
    case 'diagnostics':
      return 'diagnostics';
    case 'suppressions':
      return 'suppressions';
    case 'rate-limits':
      return 'rateLimits';
    case 'verification-policies':
      return 'verificationPolicies';
    case 'senderIdentities':
    case 'routeRules':
    case 'sendRequests':
    case 'rateLimits':
    case 'verificationPolicies':
      return sectionId;
    default:
      return DEFAULT_MESSAGING_SECTION_ID;
  }
}

function buildMessagingSections(
  t: ReturnType<typeof useTranslation>['t'],
): AdminResourceSection<MessagingSectionId, string>[] {
  return [
    {
      id: 'providers',
      title: t('admin.messaging.sections.providers', 'Provider Accounts'),
      description: t('admin.messaging.sections.providersDesc', 'Configure upstream email and SMS provider credentials.'),
      icon: <Mail className="h-4 w-4" />,
      group: t('admin.messaging.groups.delivery', 'Delivery'),
      load: () => listMessagingProviderAccounts(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'providerCode', label: t('admin.messaging.columns.provider', 'Provider') },
        { key: 'displayName', label: t('admin.messaging.columns.displayName', 'Display Name') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'providerCode', 'displayName', 'channel', 'status'],
    },
    {
      id: 'senderIdentities',
      title: t('admin.messaging.sections.senderIdentities', 'Sender Identities'),
      description: t('admin.messaging.sections.senderIdentitiesDesc', 'Manage verified sender identities for outbound delivery.'),
      icon: <Send className="h-4 w-4" />,
      group: t('admin.messaging.groups.delivery', 'Delivery'),
      load: () => listMessagingSenderIdentities(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'identityCode', label: t('admin.messaging.columns.identityCode', 'Identity Code') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'fromEmail', label: t('admin.messaging.columns.fromEmail', 'From Email') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'identityCode', 'channel', 'fromEmail', 'status'],
    },
    {
      id: 'templates',
      title: t('admin.messaging.sections.templates', 'Templates'),
      description: t('admin.messaging.sections.templatesDesc', 'Versioned message templates for transactional and marketing delivery.'),
      icon: <MessageSquare className="h-4 w-4" />,
      group: t('admin.messaging.groups.content', 'Content'),
      load: () => listMessagingTemplates(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'templateCode', label: t('admin.messaging.columns.templateCode', 'Template Code') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'contentFormat', label: t('admin.messaging.columns.contentFormat', 'Format') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'templateCode', 'channel', 'contentFormat', 'status'],
    },
    {
      id: 'routeRules',
      title: t('admin.messaging.sections.routeRules', 'Route Rules'),
      description: t('admin.messaging.sections.routeRulesDesc', 'Route outbound messages by channel, purpose, and provider policy.'),
      icon: <Route className="h-4 w-4" />,
      group: t('admin.messaging.groups.routing', 'Routing'),
      load: () => listMessagingRouteRules(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'ruleCode', label: t('admin.messaging.columns.ruleCode', 'Rule Code') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'deliveryPurpose', label: t('admin.messaging.columns.deliveryPurpose', 'Purpose') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'ruleCode', 'channel', 'deliveryPurpose', 'status'],
    },
    {
      id: 'sendRequests',
      title: t('admin.messaging.sections.sendRequests', 'Send Requests'),
      description: t('admin.messaging.sections.sendRequestsDesc', 'Inspect outbound send requests and delivery outcomes.'),
      icon: <Send className="h-4 w-4" />,
      group: t('admin.messaging.groups.operations', 'Operations'),
      load: () => listMessagingSendRequests(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'deliveryPurpose', label: t('admin.messaging.columns.deliveryPurpose', 'Purpose') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
        { key: 'createdAt', label: t('admin.messaging.columns.createdAt', 'Created At') },
      ],
      searchFields: ['id', 'channel', 'deliveryPurpose', 'status', 'createdAt'],
    },
    {
      id: 'diagnostics',
      title: t('admin.messaging.sections.diagnostics', 'Diagnostics'),
      description: t('admin.messaging.sections.diagnosticsDesc', 'Review recent delivery attempts for troubleshooting.'),
      icon: <SlidersHorizontal className="h-4 w-4" />,
      group: t('admin.messaging.groups.operations', 'Operations'),
      load: () => listMessagingSendRequests(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
        { key: 'failureReason', label: t('admin.messaging.columns.failureReason', 'Failure Reason') },
        { key: 'updatedAt', label: t('admin.messaging.columns.updatedAt', 'Updated At') },
      ],
      searchFields: ['id', 'channel', 'status', 'failureReason', 'updatedAt'],
    },
    {
      id: 'suppressions',
      title: t('admin.messaging.sections.suppressions', 'Suppressions'),
      description: t('admin.messaging.sections.suppressionsDesc', 'Block recipients or domains from future delivery.'),
      icon: <ShieldBan className="h-4 w-4" />,
      group: t('admin.messaging.groups.compliance', 'Compliance'),
      load: () => listMessagingSuppressions(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'recipient', label: t('admin.messaging.columns.recipient', 'Recipient') },
        { key: 'reason', label: t('admin.messaging.columns.reason', 'Reason') },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'channel', 'recipient', 'reason', 'status'],
    },
    {
      id: 'rateLimits',
      title: t('admin.messaging.sections.rateLimits', 'Rate Limits'),
      description: t('admin.messaging.sections.rateLimitsDesc', 'Inspect messaging rate-limit buckets and throttling state.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.messaging.groups.compliance', 'Compliance'),
      load: () => listMessagingRateLimitBuckets(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'bucketKey', label: t('admin.messaging.columns.bucketKey', 'Bucket Key') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'remaining', label: t('admin.messaging.columns.remaining', 'Remaining'), align: 'right' },
        { key: 'resetAt', label: t('admin.messaging.columns.resetAt', 'Reset At') },
      ],
      searchFields: ['id', 'bucketKey', 'channel', 'remaining', 'resetAt'],
    },
    {
      id: 'verificationPolicies',
      title: t('admin.messaging.sections.verificationPolicies', 'Verification Policies'),
      description: t('admin.messaging.sections.verificationPoliciesDesc', 'Configure verification-code delivery policies and TTL rules.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.messaging.groups.compliance', 'Compliance'),
      load: () => listVerificationPolicies(),
      columns: [
        { key: 'id', label: t('admin.messaging.columns.id', 'ID') },
        { key: 'policyCode', label: t('admin.messaging.columns.policyCode', 'Policy Code') },
        { key: 'channel', label: t('admin.messaging.columns.channel', 'Channel') },
        { key: 'ttlSeconds', label: t('admin.messaging.columns.ttlSeconds', 'TTL Seconds'), align: 'right' },
        { key: 'status', label: t('admin.messaging.columns.status', 'Status') },
      ],
      searchFields: ['id', 'policyCode', 'channel', 'ttlSeconds', 'status'],
    },
  ];
}

export function MessagingAdmin({ sectionId }: MessagingAdminProps = {}) {
  const { t } = useTranslation();
  const sections = useMemo(() => buildMessagingSections(t), [t]);
  const activeSectionId = resolveMessagingSectionId(sectionId);

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.messaging.empty', 'No messaging records found for this section.')}
      errorTitle={t('admin.messaging.errors.loadFallback', 'Messaging data could not be loaded.')}
      loadingTitle={t('admin.messaging.loading', 'Loading messaging records...')}
      sections={sections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-messaging-table-viewport"
    />
  );
}

export {
  createMessagingProviderAccount,
  createMessagingRouteRule,
  createMessagingSenderIdentity,
  createMessagingSuppression,
  createMessagingTemplate,
  publishMessagingTemplateVersion,
  sendMessagingTemplate,
  simulateMessagingRoute,
  testMessagingSend,
  updateVerificationPolicy,
} from './messagingService';
