# @sdkwork/cloudrouter-pc-admin-billing

Read-only billing decision diagnostics for the Cloud Router admin console.

- Surface: `backend-admin` (`/backend/v3/api`, generated backend SDK)
- Domain: `commerce` / capability `billing`
- Route: `/admin/billing/decision`

## What it owns

One question, answered from the routing side: **for a single invocation, was the
request admitted, what did the account side freeze, was it charged, and is
anything still stuck?**

It reads `GET /backend/v3/api/billing/decision` and renders the four-stage
snapshot with a verdict (`not_billed`, `held`, `overdue`, `settled`, `released`,
`expired`). The operator-facing explanation per verdict lives in this package so a
support engineer reads a sentence, not a status code.

## What it must not own

- funding rules or wallet arithmetic — the account service decides both;
- simulation, which belongs to the account centre (`/wallet/billing_policy/authorize`);
- any mutation: this package has no write path at all.

## Verification

`tests/billing-decision-service.test.ts` runs on the Node test runner with type
stripping (`node --test tests/billing-decision-service.test.ts`) and covers: the
exact query parameter shape, invocation id trimming, empty-input rejection, the
verdict-to-explanation mapping for all six verdicts, and the health flag used to
highlight a stuck reservation.

## Known limitations

- `typecheck` needs a workspace install; this repository's dependency graph is
  installed on the build host.
- The page renders a single invocation lookup; there is no list/search surface
  because the backend contract exposes one invocation per call on purpose.
