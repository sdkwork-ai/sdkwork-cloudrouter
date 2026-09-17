# @sdkwork/cloudrouter-h5-core

H5 composition core: runtime environment resolution, the single generated app SDK
client boundary, the shared console ports implementation, and the session store.

Feature packages never import `@sdkwork/cloudrouter-app-sdk` directly; they receive
`CloudRouterConsolePorts` from this package through the app root.
