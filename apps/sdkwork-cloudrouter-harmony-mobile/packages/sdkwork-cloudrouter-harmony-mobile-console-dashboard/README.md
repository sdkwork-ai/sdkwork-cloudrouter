# sdkwork-cloudrouter-harmony-mobile-console-dashboard

`console-dashboard` console capability for the SDKWork Cloud Router HarmonyOS
root. Contributes route `console.router.dashboard.overview` (physical page `pages/console/ConsoleDashboard`),
aligned with the PC paths `/dashboard`.

Layer role `frontend-feature`. The generated app SDK client is injected
through the core package public exports; this package must not import a
generated transport module or create raw HTTP calls.

Services currently return empty results because no ArkTS app SDK target is
produced yet. Screens render loading, error, empty, and data states, so the
missing transport shows up as an empty state rather than fabricated rows.
