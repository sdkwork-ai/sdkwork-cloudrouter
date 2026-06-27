import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { AdminResourceCenter } from '@sdkwork/clawroutes-pc-commons';
import { listManagedAgents } from './agentService';

export function AgentsAdmin() {
  const { t } = useTranslation();
  const sections = useMemo(
    () => [
      {
        id: 'agents' as const,
        title: t('admin.agents.sections.agents', 'Managed Agents'),
        description: t(
          'admin.agents.sections.agentsDesc',
          'Review managed agent definitions, visibility, and runtime bindings.',
        ),
        icon: <Bot className="h-4 w-4" />,
        group: t('admin.agents.groups.runtime', 'Agent Runtime'),
        load: () => listManagedAgents(),
        columns: [
          { key: 'agentId', label: t('admin.agents.columns.agentId', 'Agent ID') },
          { key: 'code', label: t('admin.agents.columns.code', 'Code') },
          { key: 'displayName', label: t('admin.agents.columns.displayName', 'Display Name') },
          { key: 'visibility', label: t('admin.agents.columns.visibility', 'Visibility') },
          { key: 'status', label: t('admin.agents.columns.status', 'Status') },
          { key: 'updatedAt', label: t('admin.agents.columns.updatedAt', 'Updated At') },
        ],
        searchFields: ['agentId', 'code', 'displayName', 'visibility', 'status'],
      },
    ],
    [t],
  );

  return (
    <div data-admin-agents className="flex h-full min-h-0 flex-col">
      <AdminResourceCenter
        activeSectionId="agents"
        emptyTitle={t('admin.agents.empty', 'No managed agents found.')}
        errorTitle={t('admin.agents.errors.loadFallback', 'Managed agents could not be loaded.')}
        loadingTitle={t('admin.agents.loading', 'Loading managed agents...')}
        sections={sections}
        showSectionNavigation={false}
        tableViewportDataAttribute="admin-agents-table-viewport"
      />
    </div>
  );
}
