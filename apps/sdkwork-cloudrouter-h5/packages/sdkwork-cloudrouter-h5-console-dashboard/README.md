# @sdkwork/cloudrouter-h5-console-dashboard

Console overview and gateway health for the H5 root.

Aligned with the PC surface paths `/console/dashboard`, `/console/gateway`.
Loads data through `@sdkwork/cloudrouter-service` read models over
`CloudRouterConsolePorts` injected by the app root; it never imports a generated SDK.
