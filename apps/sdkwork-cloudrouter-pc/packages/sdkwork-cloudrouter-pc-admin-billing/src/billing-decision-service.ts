/**
 * Read-only billing decision diagnostics service.
 *
 * The service normalizes the backend snapshot and turns the verdict into an
 * operator-facing explanation. It holds no transport: the caller injects the
 * generated backend client (or a fake with the same shape), which keeps the
 * package testable and the business code free of raw HTTP.
 *
 * Amounts stay strings: frozen points are exact integers and must not round
 * through a JavaScript number.
 */

/** Verdict of a request's funding lifecycle. */
export type SdkworkBillingDecisionVerdict =
  | "not_billed"
  | "held"
  | "overdue"
  | "settled"
  | "released"
  | "expired";

/** Four-stage billing snapshot of one invocation. */
export interface SdkworkBillingDecision {
  invocationId: string;
  /** Frozen points, or null when no reservation exists. */
  holdAmount: string | null;
  holdSettledAmount: string | null;
  /** 1 held, 2 settled, 3 released, 4 expired. */
  holdStatus: number | null;
  holdExpiresAt: string | null;
  chargeLineCount: string;
  chargeAmount: string;
  debitPoints: string;
  measuredQuantity: string;
  verdict: SdkworkBillingDecisionVerdict;
}

/** The generated backend SDK surface this service consumes. */
export interface SdkworkBillingDecisionClient {
  billing: {
    decision: {
      retrieve(params: { invocationId: string }): Promise<SdkworkBillingDecision>;
    };
  };
}

/** How an operator should read a verdict. */
export interface SdkworkBillingDecisionExplanation {
  /** Stable machine key for the copy catalogue. */
  key: SdkworkBillingDecisionVerdict;
  /** Whether the invocation is in a healthy terminal or steady state. */
  healthy: boolean;
  /** Whether funds are currently frozen by this invocation. */
  freezesFunds: boolean;
}

/**
 * Maps a verdict to its meaning.
 *
 * `overdue` is the only unhealthy steady state: the reservation outlived its TTL
 * and the reconciliation sweep has not cleared it yet, so the wallet is holding
 * funds for a request that will never settle.
 */
export function explainBillingDecision(
  verdict: SdkworkBillingDecisionVerdict,
): SdkworkBillingDecisionExplanation {
  switch (verdict) {
    case "settled":
      return { key: verdict, healthy: true, freezesFunds: false };
    case "not_billed":
      return { key: verdict, healthy: true, freezesFunds: false };
    case "released":
      return { key: verdict, healthy: true, freezesFunds: false };
    case "expired":
      return { key: verdict, healthy: true, freezesFunds: false };
    case "held":
      return { key: verdict, healthy: true, freezesFunds: true };
    case "overdue":
      return { key: verdict, healthy: false, freezesFunds: true };
  }
}

/** Builds the diagnostics service over an injected generated client. */
export function createSdkworkBillingDecisionService(client: SdkworkBillingDecisionClient) {
  /**
   * Reads one invocation's snapshot.
   *
   * The invocation id is trimmed and validated locally: an empty id would be
   * answered with a 400 by the backend, and turning that into a client-side error
   * keeps the console from firing a pointless request.
   */
  async function readDecision(invocationId: string): Promise<SdkworkBillingDecision> {
    const trimmed = invocationId.trim();
    if (trimmed === "") {
      throw new Error("invocation id is required");
    }
    return client.billing.decision.retrieve({ invocationId: trimmed });
  }

  return {
    readDecision,

    /** Reads a snapshot and attaches its operator explanation. */
    async describeDecision(invocationId: string): Promise<{
      decision: SdkworkBillingDecision;
      explanation: SdkworkBillingDecisionExplanation;
    }> {
      const decision = await readDecision(invocationId);
      return { decision, explanation: explainBillingDecision(decision.verdict) };
    },
  };
}

export type SdkworkBillingDecisionService = ReturnType<typeof createSdkworkBillingDecisionService>;
