import { useState } from "react";

import {
  explainBillingDecision,
  type SdkworkBillingDecision,
  type SdkworkBillingDecisionService,
  type SdkworkBillingDecisionVerdict,
} from "../billing-decision-service.ts";

/** Copy the decision page renders; kept as props so the host owns localization. */
export interface SdkworkBillingDecisionPageCopy {
  title: string;
  subtitle: string;
  lookupLabel: string;
  lookupHint: string;
  submit: string;
  submitting: string;
  failure: string;
  empty: string;
  labels: {
    verdict: string;
    holdAmount: string;
    settledAmount: string;
    holdStatus: string;
    chargeAmount: string;
    chargeLines: string;
    debitPoints: string;
    measuredQuantity: string;
    expiresAt: string;
  };
  verdicts: Record<SdkworkBillingDecisionVerdict, string>;
}

export interface SdkworkBillingDecisionPageProps {
  service: SdkworkBillingDecisionService;
  copy: SdkworkBillingDecisionPageCopy;
  /** Renders a points amount in the operator's unit. */
  formatPoints?: (points: string | null) => string;
}

function defaultFormatPoints(points: string | null): string {
  return points ?? "—";
}

/**
 * Billing decision diagnostics.
 *
 * An operator pastes the invocation id from the gateway access log and reads the
 * four-stage snapshot: was it admitted, what was frozen, what was charged, and is
 * anything still stuck. The page is read-only and never creates or mutates a hold,
 * so it is safe to run against a live request.
 */
export function SdkworkBillingDecisionPage({
  service,
  copy,
  formatPoints = defaultFormatPoints,
}: SdkworkBillingDecisionPageProps) {
  const [invocationId, setInvocationId] = useState("");
  const [decision, setDecision] = useState<SdkworkBillingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setDecision(await service.readDecision(invocationId));
    } catch (cause) {
      setDecision(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  const explanation = decision === null ? null : explainBillingDecision(decision.verdict);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <p className="text-sm opacity-70">{copy.subtitle}</p>
      </header>

      <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-70">{copy.lookupLabel}</span>
          <input value={invocationId} onChange={(event) => setInvocationId(event.target.value)} required />
          <span className="text-xs opacity-60">{copy.lookupHint}</span>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? copy.submitting : copy.submit}
        </button>
      </form>

      {error === null ? null : (
        <p role="alert" className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">
          {copy.failure}: {error}
        </p>
      )}

      {decision === null ? null : (
        <div className="flex flex-col gap-3" data-verdict={decision.verdict}>
          <p
            role="status"
            className={
              explanation?.healthy === false
                ? "rounded border border-amber-300 px-3 py-2 text-sm"
                : "rounded border px-3 py-2 text-sm"
            }
          >
            {copy.verdicts[decision.verdict]}
          </p>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Row label={copy.labels.verdict} value={decision.verdict} />
            <Row label={copy.labels.holdAmount} value={formatPoints(decision.holdAmount)} />
            <Row label={copy.labels.settledAmount} value={formatPoints(decision.holdSettledAmount)} />
            <Row
              label={copy.labels.holdStatus}
              value={decision.holdStatus === null ? "—" : String(decision.holdStatus)}
            />
            <Row label={copy.labels.expiresAt} value={decision.holdExpiresAt ?? "—"} />
            <Row label={copy.labels.chargeLines} value={decision.chargeLineCount} />
            <Row label={copy.labels.chargeAmount} value={decision.chargeAmount} />
            <Row label={copy.labels.debitPoints} value={formatPoints(decision.debitPoints)} />
            <Row label={copy.labels.measuredQuantity} value={decision.measuredQuantity} />
          </dl>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs opacity-70">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
