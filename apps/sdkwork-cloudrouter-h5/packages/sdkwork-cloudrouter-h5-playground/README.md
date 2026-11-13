# @sdkwork/cloudrouter-h5-playground

Cloud Router H5 adapter for the shared Agents Playground capability.

- The owning project (`sdkwork-agents`) ships `@sdkwork/agents-h5-playground`:
  the mobile Playground screen plus the Agents conversation-port binding.
- This adapter creates the generated Agents app SDK client on the Cloud Router
  API base (`<origin>/app/v3/api`) with the shared Cloud Router dual-token
  manager, then configures the Playground runtime.
- The H5 tab bar mounts `PlaygroundScreen` on `/playground`; API Key remains a
  mounted route (reachable from the home service grid) but is no longer a tab.
