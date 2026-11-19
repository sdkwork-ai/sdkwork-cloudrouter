# Mini Program Source Configuration

`sdkwork.deployment.config.json` is the checked-in deployment index for the WeChat mini program.
The canonical materializer turns it into `config/mini-program/runtime-env.<profile>.json` and then
into `src/runtime/runtime-env.js`; the runtime bundle is built from the same profile. Public
application origins and API base URLs come from the repository deployment index, and secrets or
local overrides are never committed here.
