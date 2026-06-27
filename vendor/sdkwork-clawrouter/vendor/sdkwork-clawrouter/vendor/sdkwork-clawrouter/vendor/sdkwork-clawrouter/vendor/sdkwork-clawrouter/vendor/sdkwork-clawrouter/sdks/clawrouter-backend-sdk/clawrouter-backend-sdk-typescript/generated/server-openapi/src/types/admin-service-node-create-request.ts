/** Admin service node create request schema exposed by Claw Router. */
export interface AdminServiceNodeCreateRequest {
  /** Domain field on admin service node create request. */
  domain: string;
  /** Ip field on admin service node create request. */
  ip: string;
  /** Name field on admin service node create request. */
  name: string;
  /** Remark field on admin service node create request. */
  remark?: string;
  /** Status field on admin service node create request. */
  status?: 'enabled' | 'disabled';
}
