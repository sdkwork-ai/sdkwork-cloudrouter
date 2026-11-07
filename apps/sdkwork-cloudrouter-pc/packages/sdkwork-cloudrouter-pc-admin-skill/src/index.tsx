import { useMemo, type ReactNode } from 'react';

import { AdminSkillsPage } from '@sdkwork/skills-pc-admin';
import { SkillCategoriesPage } from '@sdkwork/skills-pc-admin-skill';
import {
  SkillsClientsProvider,
  type SkillsClients,
} from '@sdkwork/skills-pc-core';
import {
  getSdkworkDriveAppSdkClient,
  getSdkworkSkillsAppSdkClient,
  getSkillsBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Builds the Skills client inventory from the host runtime.
 *
 * The Skills admin surfaces read their SDK clients from the
 * `SkillsClientsProvider` owned by sdkwork-skills, so a composing host has to
 * supply one. Every client comes from the host commons getters — same-origin
 * base URLs, the portal session token manager, and the shared session auth
 * boundary — so this block never configures transport itself. The drive client
 * is shared because the Skills artifact upload flow streams package archives
 * through `sdkwork-drive`.
 */
function useHostSkillsClients(): SkillsClients {
  return useMemo(
    () => ({
      app: getSdkworkSkillsAppSdkClient(),
      drive: getSdkworkDriveAppSdkClient(),
      backend: getSkillsBackendSdkClient(),
    }),
    [],
  );
}

function SkillsAdminClientsProvider({ children }: { children: ReactNode }) {
  const clients = useHostSkillsClients();
  return <SkillsClientsProvider clients={clients}>{children}</SkillsClientsProvider>;
}

export interface SkillsAdminPageProps {
  grantedPermissions?: readonly string[];
  roleCodes?: readonly string[];
  initialEditPackageId?: string | null;
}

/**
 * Cloud Router admin-console entry for the Skills management page
 * (技能管理, route `/admin/skill`).
 *
 * This package is a thin, UI-free adapter: it binds the host runtime to the
 * `AdminSkillsPage` block owned by sdkwork-skills. It holds no Skills
 * presentation, no Skills business rules, and no generated-SDK import of its
 * own — the package CRUD surface, category binding and their styles all come
 * from `@sdkwork/skills-pc-admin`.
 */
export function SkillsAdminPage({
  grantedPermissions,
  roleCodes,
  initialEditPackageId,
}: SkillsAdminPageProps) {
  return (
    <SkillsAdminClientsProvider>
      <AdminSkillsPage
        grantedPermissions={grantedPermissions}
        roleCodes={roleCodes}
        initialEditPackageId={initialEditPackageId}
      />
    </SkillsAdminClientsProvider>
  );
}

/**
 * Cloud Router admin-console entry for the skill category management page
 * (技能分类管理, route `/admin/skill/categories`).
 *
 * Same adapter contract as {@link SkillsAdminPage}: the category CRUD surface
 * is owned by sdkwork-skills (`@sdkwork/skills-pc-admin-skill`) and only the
 * runtime binding happens here.
 */
export function SkillCategoriesAdminPage() {
  return (
    <SkillsAdminClientsProvider>
      <SkillCategoriesPage />
    </SkillsAdminClientsProvider>
  );
}
