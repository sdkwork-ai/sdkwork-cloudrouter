import { FolderOpen, KeyRound, Layers, Link2, ShieldCheck } from 'lucide-react';
import type { AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import { listDriveAuditEvents, listDriveNodes, listDrivePermissions, listDriveShareLinks, listDriveSpaces } from './driveService';

export type DriveSectionId = 'spaces' | 'nodes' | 'permissions' | 'share-links' | 'audit';

type Translate = (key: string, defaultValue: string) => string;

export function resolveDriveSectionId(sectionId: string | undefined): DriveSectionId {
  switch (sectionId) {
    case 'spaces':
    case 'nodes':
    case 'permissions':
    case 'share-links':
    case 'audit':
      return sectionId;
    default:
      return 'spaces';
  }
}

export function buildDriveTableSections(
  t: Translate,
): AdminResourceSection<DriveSectionId, string>[] {
  return [
    {
      id: 'spaces',
      title: t('admin.drive.sections.spaces', 'Drive Spaces'),
      description: t('admin.drive.sections.spacesDesc', 'List drive spaces available to the current tenant.'),
      icon: <FolderOpen className="h-4 w-4" />,
      group: t('admin.drive.groups.library', 'Library'),
      load: () => listDriveSpaces(),
      columns: [
        { key: 'spaceId', label: t('admin.drive.columns.spaceId', 'Space ID') },
        { key: 'name', label: t('admin.drive.columns.name', 'Name') },
        { key: 'visibility', label: t('admin.drive.columns.visibility', 'Visibility') },
        { key: 'status', label: t('admin.drive.columns.status', 'Status') },
      ],
      searchFields: ['spaceId', 'name', 'visibility', 'status'],
    },
    {
      id: 'nodes',
      title: t('admin.drive.sections.nodes', 'Drive Nodes'),
      description: t('admin.drive.sections.nodesDesc', 'Browse nodes within the first available drive space.'),
      icon: <Layers className="h-4 w-4" />,
      group: t('admin.drive.groups.library', 'Library'),
      load: async () => {
        const spaces = await listDriveSpaces();
        const firstSpace = spaces.items[0] as { spaceId?: string; id?: string } | undefined;
        const firstSpaceId = String(firstSpace?.spaceId ?? firstSpace?.id ?? '').trim();
        if (!firstSpaceId) {
          return { items: [] };
        }
        return listDriveNodes(firstSpaceId);
      },
      columns: [
        { key: 'nodeId', label: t('admin.drive.columns.nodeId', 'Node ID') },
        { key: 'name', label: t('admin.drive.columns.name', 'Name') },
        { key: 'nodeType', label: t('admin.drive.columns.nodeType', 'Type') },
        { key: 'status', label: t('admin.drive.columns.status', 'Status') },
      ],
      searchFields: ['nodeId', 'name', 'nodeType', 'status'],
    },
    {
      id: 'permissions',
      title: t('admin.drive.sections.permissions', 'Drive Permissions'),
      description: t(
        'admin.drive.sections.permissionsDesc',
        'List node permissions for the first available drive space.',
      ),
      icon: <KeyRound className="h-4 w-4" />,
      group: t('admin.drive.groups.governance', 'Governance'),
      load: () => listDrivePermissions(),
      columns: [
        { key: 'permissionId', label: t('admin.drive.columns.permissionId', 'Permission ID') },
        { key: 'subjectId', label: t('admin.drive.columns.subjectId', 'Subject') },
        { key: 'role', label: t('admin.drive.columns.role', 'Role') },
      ],
      searchFields: ['permissionId', 'subjectId', 'role'],
    },
    {
      id: 'share-links',
      title: t('admin.drive.sections.shareLinks', 'Share Links'),
      description: t(
        'admin.drive.sections.shareLinksDesc',
        'List share links for the first available drive node.',
      ),
      icon: <Link2 className="h-4 w-4" />,
      group: t('admin.drive.groups.governance', 'Governance'),
      load: () => listDriveShareLinks(),
      columns: [
        { key: 'shareLinkId', label: t('admin.drive.columns.shareLinkId', 'Share Link ID') },
        { key: 'targetNodeId', label: t('admin.drive.columns.targetNodeId', 'Target Node') },
        { key: 'status', label: t('admin.drive.columns.status', 'Status') },
      ],
      searchFields: ['shareLinkId', 'targetNodeId', 'status'],
    },
    {
      id: 'audit',
      title: t('admin.drive.sections.audit', 'Drive Audit'),
      description: t(
        'admin.drive.sections.auditDesc',
        'Drive audit events require the Drive backend SDK surface and will be enabled in a follow-up integration.',
      ),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.drive.groups.governance', 'Governance'),
      load: () => listDriveAuditEvents(),
      columns: [
        { key: 'eventId', label: t('admin.drive.columns.eventId', 'Event ID') },
        { key: 'action', label: t('admin.drive.columns.action', 'Action') },
        { key: 'createdAt', label: t('admin.drive.columns.createdAt', 'Created At') },
      ],
      searchFields: ['eventId', 'action', 'createdAt'],
    },
  ];
}
