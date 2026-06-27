import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
import { AdminResourceCenter } from '@sdkwork/clawroutes-pc-commons';
import { listAgentSkillBindings } from './skillService';

export function SkillAdmin() {
  const { t } = useTranslation();
  const sections = useMemo(
    () => [
      {
        id: 'skills' as const,
        title: t('admin.skill.sections.bindings', 'Agent Skill Bindings'),
        description: t(
          'admin.skill.sections.bindingsDesc',
          'Inspect skill identifiers bound to managed agents through management profiles.',
        ),
        icon: <Store className="h-4 w-4" />,
        group: t('admin.skill.groups.runtime', 'Skill Runtime'),
        load: () => listAgentSkillBindings(),
        columns: [
          { key: 'skillId', label: t('admin.skill.columns.skillId', 'Skill ID') },
          { key: 'agentId', label: t('admin.skill.columns.agentId', 'Agent ID') },
          { key: 'agentDisplayName', label: t('admin.skill.columns.agentDisplayName', 'Agent') },
          { key: 'bindingScope', label: t('admin.skill.columns.bindingScope', 'Binding Scope') },
        ],
        searchFields: ['skillId', 'agentId', 'agentDisplayName', 'bindingScope'],
      },
    ],
    [t],
  );

  return (
    <div data-admin-skill className="flex h-full min-h-0 flex-col">
      <AdminResourceCenter
        activeSectionId="skills"
        emptyTitle={t('admin.skill.empty', 'No agent skill bindings found.')}
        errorTitle={t('admin.skill.errors.loadFallback', 'Agent skill bindings could not be loaded.')}
        loadingTitle={t('admin.skill.loading', 'Loading agent skill bindings...')}
        sections={sections}
        showSectionNavigation={false}
        tableViewportDataAttribute="admin-skill-table-viewport"
      />
    </div>
  );
}
