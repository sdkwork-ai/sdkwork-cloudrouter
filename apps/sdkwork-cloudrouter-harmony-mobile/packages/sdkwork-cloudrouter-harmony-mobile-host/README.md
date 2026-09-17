# sdkwork-cloudrouter-harmony-mobile-host

Typed HarmonyOS platform adapters for the SDKWork Cloud Router client root,
implemented behind core-owned contracts.

Layer role `frontend-host`: adapters must not depend on a business SDK and must
not own login, token refresh, permission evaluation, or business
authorization.

Every method currently returns the user-safe `unsupported` error because the
HarmonyOS SDK toolchain and ability-context injection are not available in this
workspace. That is deliberate: a stub that pretended to read or persist
platform state would be a false signal.
