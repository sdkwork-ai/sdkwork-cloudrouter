/**
 * Cloud Router H5 Playground adapter.
 *
 * The owning project (`sdkwork-agents`) ships the H5 Playground screen and the
 * conversation port binding. This adapter only binds the host runtime: it
 * creates the generated Agents app SDK client on the Cloud Router API base with
 * the shared Cloud Router dual-token manager, then hands the client to the
 * playground runtime.
 */

export {
  PlaygroundScreen,
  type PlaygroundScreenProps,
} from "@sdkwork/agents-h5-playground";
export { configureCloudRouterPlayground } from "./configure";
