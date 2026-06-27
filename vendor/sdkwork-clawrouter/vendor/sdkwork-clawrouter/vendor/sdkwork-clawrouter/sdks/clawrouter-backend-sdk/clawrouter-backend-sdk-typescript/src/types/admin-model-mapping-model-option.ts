/** Admin model mapping model option schema exposed by Claw Router. */
export interface AdminModelMappingModelOption {
  /** Display name field on admin model mapping model option. */
  displayName: string;
  /** Id field on admin model mapping model option. */
  id: string;
  /** Model field on admin model mapping model option. */
  model: string;
  /** Name field on admin model mapping model option. */
  name: string;
  /** Status field on admin model mapping model option. */
  status: 'active' | 'inactive' | 'deprecated';
  /** Type field on admin model mapping model option. */
  type: 'llm' | 'image' | 'video' | 'audio' | 'music' | 'sfx' | 'multimodal' | 'embedding' | 'rerank';
  /** Vendor code field on admin model mapping model option. */
  vendorCode: string;
  /** Vendor id field on admin model mapping model option. */
  vendorId: string;
}
