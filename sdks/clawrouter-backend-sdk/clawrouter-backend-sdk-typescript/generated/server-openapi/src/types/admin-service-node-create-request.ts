/** AdminServiceNodeCreateRequest contract. */
export interface AdminServiceNodeCreateRequest {
  /** Primary public HTTP(S) API base URL, including the API path prefix. */
  baseUrl?: string;
  /** Deployment topology used to expose this API ingress. */
  deploymentProfile?: 'standalone' | 'cloud';
  /** Legacy primary domain alias retained for backward compatibility. */
  domain?: string;
  /** Public domain aliases served by this deployment node. */
  domains?: string[];
  /** Optional node IP address; cloud gateway deployments may omit it. */
  ip?: string;
  /** name field on AdminServiceNodeCreateRequest. */
  name: string;
  /** remark field on AdminServiceNodeCreateRequest. */
  remark?: string;
  /** status field on AdminServiceNodeCreateRequest. */
  status?: 'enabled' | 'disabled';
}
