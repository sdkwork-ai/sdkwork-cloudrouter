# cloudrouter-billing

Cloud Router application module for customer pricing plans, usage
measurements, rating decisions, and immutable charge lines.

Every gateway call is a request trace. A trace may produce zero or more usage
measurements. Every measurement receives an explicit rating decision. Only a
successfully rated `chargeable` decision can create a charge line. Dashboards,
debits, and settlement count charge lines by distinct `invocation_id`; they do
not infer billing from traces or raw measurement rows.
