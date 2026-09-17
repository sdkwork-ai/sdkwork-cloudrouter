# @sdkwork/cloudrouter-mp-core

Mini-program composition core: runtime environment resolution, the single generated
app SDK client boundary, and the shared console ports implementation.

Feature packages never import `@sdkwork/cloudrouter-app-sdk` directly; they receive
`CloudRouterConsolePorts` from this package through the app root.
