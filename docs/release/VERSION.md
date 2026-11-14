# Current Version

- Current Version: `0.4.13`
- Release Date: 2026-11-14
- Status: `In release — tag v0.4.13`
- Previous Version: `0.4.12`
- Previous Status: `Superseded by 0.4.13 (see CHANGELOG.md)`
- Release Asset Prefix: `cloudrouter-*`

`0.4.13` makes the admin payment center usable for finance operations. Payment
records and refund records were configuration-adjacent pages with no
server-side filters, page-local search only, no creation-time window, integer
amounts rendered without currency scaling, and no export. The payment backend
read contract now accepts `created_after`/`created_before` (validated and
normalized to UTC before SQL), `provider_code`, `currency_code`, and
`reason_code`, and the intents list implements the `q` parameter it already
declared; refund reads return the documented integer minor-unit amounts. The
admin resource center gains opt-in text/date filters, a server search mode,
section toolbar actions bound to the current query, clear-filters, and a total
count, and the payment center adds currency-aware money rendering,
related-record detail drawers, filtered CSV export, and filters for attempts,
webhook events, and reconciliation runs. This release also stages the Adaptive
Web H5 tree (`portal/h5`) into the container install package, which the package
validator requires next to `portal/dist` for device-class surface selection.
