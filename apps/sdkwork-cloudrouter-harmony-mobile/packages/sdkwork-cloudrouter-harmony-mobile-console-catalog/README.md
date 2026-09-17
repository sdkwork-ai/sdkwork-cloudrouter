# sdkwork-cloudrouter-harmony-mobile-console-catalog

`console-catalog` console capability for the SDKWork Cloud Router HarmonyOS
root. Contributes route `console.router.catalog.pricing` (physical page `pages/console/ConsoleCatalog`),
aligned with the PC paths `/models, /pricing, /rankings`.

Layer role `frontend-feature`. The generated app SDK client is injected
through the core package public exports; this package must not import a
generated transport module or create raw HTTP calls.

Services currently return empty results because no ArkTS app SDK target is
produced yet. Screens render loading, error, empty, and data states, so the
missing transport shows up as an empty state rather than fabricated rows.
