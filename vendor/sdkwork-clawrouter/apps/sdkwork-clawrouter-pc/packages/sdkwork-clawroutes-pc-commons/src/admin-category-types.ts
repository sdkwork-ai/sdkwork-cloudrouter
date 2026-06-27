import type { ClawRouterMediaResource } from './media-resource.ts';

export interface AdminCategoryOption {
  id: string;
  name: string;
  code: string;
  description: string;
  icon?: ClawRouterMediaResource;
  parentId: string | null;
  path: string;
  sortWeight: number;
  status: number;
  type: number;
  visible: boolean;
}
