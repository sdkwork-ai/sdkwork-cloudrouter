/** AdminServiceNodeUpdateRequest contract. */
export interface AdminServiceNodeUpdateRequest {
  /** Primary public HTTP(S) API base URL. */
  baseUrl?: string;
  /** Deployment topology used to expose this API ingress. */
  deploymentProfile?: 'standalone' | 'cloud';
  /** Legacy primary domain alias retained for backward compatibility. */
  domain?: string;
  /** Public domain aliases served by this deployment node. */
  domains?: string[];
  /** ip field on AdminServiceNodeUpdateRequest. */
  ip?: string;
  /** name field on AdminServiceNodeUpdateRequest. */
  name?: string;
  /** remark field on AdminServiceNodeUpdateRequest. */
  remark?: string;
}
