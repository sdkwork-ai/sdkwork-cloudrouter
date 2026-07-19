/** AdminServiceNodeCreateRequest contract. */
export interface AdminServiceNodeCreateRequest {
  /** domain field on AdminServiceNodeCreateRequest. */
  domain: string;
  /** ip field on AdminServiceNodeCreateRequest. */
  ip: string;
  /** name field on AdminServiceNodeCreateRequest. */
  name: string;
  /** remark field on AdminServiceNodeCreateRequest. */
  remark?: string;
  /** status field on AdminServiceNodeCreateRequest. */
  status?: 'enabled' | 'disabled';
}
