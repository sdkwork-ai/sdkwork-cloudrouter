# @sdkwork/cloudrouter-h5-settings

Cloud Router H5 adapter for the shared mobile settings center.

- Uses `@sdkwork/settings-mobile-react` for the list/detail UI, search, controls,
  and i18n.
- Uses `@sdkwork/settings-core` for the settings catalog, runtime, layered
  values, validation, and browser persistence.
- Declares only the Cloud Router appearance catalog (`appearance.theme`:
  system / light / dark) and forwards the selected value to the host theme
  system.

The component stays high-cohesion / low-coupling: the host supplies the catalog,
theme state, account scope, and back action; the shared packages own the rest.
