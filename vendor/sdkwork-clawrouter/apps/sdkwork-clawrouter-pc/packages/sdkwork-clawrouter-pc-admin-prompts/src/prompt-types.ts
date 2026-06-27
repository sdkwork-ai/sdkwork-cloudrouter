/** Prompt admin view models consumed by clawrouter PC admin UI. */
export interface AdminPromptItem {
  categoryCode?: string | null;
  categoryId?: string | null;
  createdAt: string;
  description?: string | null;
  id: string;
  latestVersionId?: string | null;
  name: string;
  organizationId: string;
  ownerUserId?: string | null;
  promptKey: string;
  promptType: string;
  publishedVersionId?: string | null;
  status: string;
  tags: string[];
  tenantId: string;
  updatedAt: string;
  uuid: string;
  visibility: string;
}

export interface AdminPromptVersionItem {
  checksumHash: string;
  content: string;
  createdAt: string;
  createdBy: string;
  examplesJson: Record<string, unknown>[];
  id: string;
  lifecycleStatus: string;
  modelConstraints: Record<string, unknown>;
  organizationId: string;
  outputSchema: Record<string, unknown>;
  promptId: string;
  publishedAt?: string | null;
  reviewComment?: string | null;
  reviewStatus: string;
  safetyPolicy: Record<string, unknown>;
  tenantId: string;
  title: string;
  updatedAt: string;
  uuid: string;
  variableSchema: Record<string, unknown>;
  versionNo: string;
}

export interface AdminPromptBindingItem {
  bindingRole: string;
  createdAt: string;
  enabled: boolean;
  id: string;
  organizationId: string;
  ownerId: string;
  ownerType: string;
  policyJson: Record<string, unknown>;
  priority: number;
  promptId: string;
  promptVersionId?: string | null;
  snapshotJson: Record<string, unknown>;
  tenantId: string;
  updatedAt: string;
  uuid: string;
}
