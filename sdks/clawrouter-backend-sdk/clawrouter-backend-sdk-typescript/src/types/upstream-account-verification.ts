/** Upstream account verification schema exposed by Claw Router. */
export interface UpstreamAccountVerification {
  /** Account id field on upstream account verification. */
  accountId: string;
  /** Credential id field on upstream account verification. */
  credentialId: string;
  /** Endpoint id field on upstream account verification. */
  endpointId: string;
  /** Latency ms field on upstream account verification. */
  latencyMs: string;
  /** Message field on upstream account verification. */
  message: string;
  /** Status code field on upstream account verification. */
  statusCode: number | null;
  /** Success field on upstream account verification. */
  success: boolean;
  /** Supplier code field on upstream account verification. */
  supplierCode: string;
  /** Verified at field on upstream account verification. */
  verifiedAt: string;
}
