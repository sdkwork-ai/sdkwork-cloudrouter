import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(packageRoot, "../../../../");
const appNodeModules = path.join(workspaceRoot, "apps/sdkwork-clawrouter-pc/node_modules");

export default {
  resolve: {
    alias: {
      "@testing-library/react": path.join(appNodeModules, "@testing-library/react"),
      react: path.join(appNodeModules, "react"),
      "react-dom": path.join(appNodeModules, "react-dom"),
      "react/jsx-dev-runtime": path.join(appNodeModules, "react/jsx-dev-runtime.js"),
      "react/jsx-runtime": path.join(appNodeModules, "react/jsx-runtime.js"),
    },
  },
  test: {
    environment: "jsdom",
  },
};
