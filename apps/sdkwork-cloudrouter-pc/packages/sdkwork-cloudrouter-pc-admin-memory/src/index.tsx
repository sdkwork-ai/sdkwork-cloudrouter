import type { MemoryPcModuleDefinition } from '@sdkwork/memory-pc-commons';
import {
  MemoryAdminSdkProvider,
  createMemoryAdminResourceRegistry,
  type MemoryAdminSdkClient,
} from '@sdkwork/memory-pc-admin-core';
import { MemoryAdminShell } from '@sdkwork/memory-pc-admin-shell';
import { memoryModule as adminOverviewModule } from '@sdkwork/memory-pc-admin-overview';
import { memoryModule as adminMemoryModule } from '@sdkwork/memory-pc-admin-memory';
import { memoryModule as adminLearningModule } from '@sdkwork/memory-pc-admin-learning';
import { memoryModule as adminRetrievalModule } from '@sdkwork/memory-pc-admin-retrieval';
import { memoryModule as adminProvidersModule } from '@sdkwork/memory-pc-admin-providers';
import { memoryModule as adminEvaluationModule } from '@sdkwork/memory-pc-admin-evaluation';
import { memoryModule as adminKnowledgeGraphModule } from '@sdkwork/memory-pc-admin-knowledge-graph';
import { memoryModule as adminControlPlaneModule } from '@sdkwork/memory-pc-admin-control-plane';
import { memoryModule as adminGovernanceModule } from '@sdkwork/memory-pc-admin-governance';
import {
  getMemoryBackendSdkClient,
  readPortalPermissionScope,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { useMemo } from 'react';

/**
 * URL prefix the Cloud Router admin mounts the Memory backend-admin surface
 * under. The owner shell derives module deep links from this base
 * (`/admin/memory/<module.route>`), so the host routes below must stay in
 * sync with it.
 */
const MEMORY_ADMIN_BASE_PATH = '/admin/memory';

/** The full professional Memory backend-admin module catalog (owner-ordered). */
const MEMORY_ADMIN_MODULES: readonly MemoryPcModuleDefinition[] = [
  adminOverviewModule,
  adminMemoryModule,
  adminLearningModule,
  adminRetrievalModule,
  adminProvidersModule,
  adminEvaluationModule,
  adminKnowledgeGraphModule,
  adminControlPlaneModule,
  adminGovernanceModule,
];

/** The focused 记忆分类/记忆管理 module: spaces, memories, and events. */
const MEMORY_CATEGORIES_MODULES: readonly MemoryPcModuleDefinition[] = [adminMemoryModule];

/**
 * Builds the Memory backend-admin SDK client from the host runtime.
 *
 * The client arrives from the host commons getter — same-origin base URL, the
 * portal session token manager, and the shared session auth boundary — so this
 * block never configures transport itself. The owner's admin-core wraps it in
 * `MemoryAdminSdkProvider` and derives the resource registry that every admin
 * module page reads.
 */
function MemoryAdminClientsProvider() {
  const client = useMemo<MemoryAdminSdkClient>(() => getMemoryBackendSdkClient(), []);
  const registry = useMemo(() => createMemoryAdminResourceRegistry(client), [client]);
  return (
    <MemoryAdminSdkProvider client={client}>
      <MemoryAdminShell
        basePath={MEMORY_ADMIN_BASE_PATH}
        modules={MEMORY_ADMIN_MODULES}
        permissionScope={readPortalPermissionScope()}
        registry={registry}
      />
    </MemoryAdminSdkProvider>
  );
}

/**
 * Cloud Router admin-console entry for the full Memory backend-admin surface
 * (记忆管理, route `/admin/memory`).
 *
 * This package is a thin, UI-free adapter: it binds the host runtime to the
 * admin blocks owned by sdkwork-memory. It holds no Memory presentation, no
 * Memory business rules, and no generated-SDK import of its own — the
 * overview, records, learning, retrieval, knowledge-graph, governance,
 * provider, evaluation, and control-plane surfaces all come from the
 * `@sdkwork/memory-pc-admin-*` family.
 */
export function MemoryAdminPage() {
  return <MemoryAdminClientsProvider />;
}

/**
 * Cloud Router admin-console entry for the focused memory category and record
 * management page (记忆分类管理, route `/admin/memory/categories`).
 *
 * Renders the same owner shell scoped to the `admin-memory` module — spaces
 * (the memory classification containers), memories, and events — so category
 * and record governance stays one click from the full professional surface.
 */
export function MemoryCategoriesAdminPage() {
  return <MemoryAdminClientsProvider />;
}
