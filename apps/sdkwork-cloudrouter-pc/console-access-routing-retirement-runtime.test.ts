import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("console access and routing keeps only token management as a local integration module", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const menuSource = readPortalFile("./packages/sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as {
    dependencies?: Record<string, string>;
  };
  const i18nIndexSource = readPortalFile("./packages/sdkwork-cloudrouter-pc-i18n/src/resources/index.ts");
  const coreMessagesSource = readPortalFile("./packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts");

  assert.match(menuSource, /groupBlock\('console\.menu\.group\.integration', 'Access & Routing', \[/);
  assert.match(menuSource, /path: '\/console\/api-keys'/);
  assert.doesNotMatch(menuSource, /path: '\/console\/routing'/);
  assert.doesNotMatch(menuSource, /path: '\/console\/providers'/);
  assert.doesNotMatch(menuSource, /console\.menu\.routing/);
  assert.doesNotMatch(menuSource, /console\.menu\.providers/);
  assert.doesNotMatch(menuSource, /Local routing/);
  assert.doesNotMatch(menuSource, /Tool configuration/);

  assert.doesNotMatch(appSource, /sdkwork-cloudrouter-pc-console-routing/);
  assert.doesNotMatch(appSource, /sdkwork-cloudrouter-pc-console-providers/);
  assert.doesNotMatch(appSource, /<Route path="routing"/);
  assert.doesNotMatch(appSource, /<Route path="providers"/);

  assert.equal(packageJson.dependencies?.["sdkwork-cloudrouter-pc-console-routing"], undefined);
  assert.equal(packageJson.dependencies?.["sdkwork-cloudrouter-pc-console-providers"], undefined);

  assert.doesNotMatch(i18nIndexSource, /consoleRoutingMessages/);
  assert.doesNotMatch(i18nIndexSource, /consoleProvidersMessages/);
  assert.doesNotMatch(coreMessagesSource, /console\.menu\.routing/);
  assert.doesNotMatch(coreMessagesSource, /console\.menu\.providers/);
  assert.doesNotMatch(coreMessagesSource, /本地路由|工具配置|Local routing|Tool configuration/);

  assert.equal(existsSync(new URL("./packages/sdkwork-cloudrouter-pc-console-routing/", import.meta.url)), false);
  assert.equal(existsSync(new URL("./packages/sdkwork-cloudrouter-pc-console-providers/", import.meta.url)), false);
});

test("retired console providers and routing modules are absent from schema governance", () => {
  const compiledContract = readPortalFile("../../docs/schema-registry/frontend-field-contracts.yaml");
  const routeClassification = readPortalFile("../../docs/schema-registry/frontend-route-classification.yaml");

  for (const source of [compiledContract, routeClassification]) {
    assert.doesNotMatch(source, /\/console\/providers/);
    assert.doesNotMatch(source, /\/console\/routing/);
    assert.doesNotMatch(source, /sdkwork-cloudrouter-pc-console-providers/);
    assert.doesNotMatch(source, /sdkwork-cloudrouter-pc-console-routing/);
    assert.doesNotMatch(source, /console-providers\.yaml/);
    assert.doesNotMatch(source, /console-routing\.yaml/);
  }
});

test("retired relay-external admin routes are absent from schema governance", () => {
  const routeClassification = readPortalFile("../../docs/schema-registry/frontend-route-classification.yaml");

  // Prefixes that were retired as relay-external routes and have never been
  // re-owned by a host admin route. Prefixes the host has since re-created as
  // first-party admin surfaces (payments, memberships, marketing, storage,
  // skill) are classified deliberately and are asserted below instead.
  for (const retiredPrefix of [
    "/admin/catalog",
    "/admin/orders",
    "/admin/finance",
    "/admin/wallet",
    "/admin/oauth",
    "/admin/service-providers",
    "/admin/agents",
    "/admin/prompts",
    "/admin/mcp",
    "/admin/announcement",
    "/admin/user",
    "/admin/organization",
    "/admin/inventory",
    "/admin/drive",
    "/admin/messaging",
  ]) {
    assert.doesNotMatch(routeClassification, new RegExp(`route:\\s*${retiredPrefix.replaceAll("/", "\\/")}`));
  }

  // Relay-hosted and first-party admin control-plane routes the host serves
  // itself, including the four federated capability groups (skills, MCP
  // connectors, plugins, agents) added to the home module.
  for (const relayRoute of [
    "/admin/dashboard",
    "/admin/model",
    "/admin/upstream",
    "/admin/settings",
    "/admin/monitor",
    "/admin/ratelimit",
    "/admin/skill",
    "/admin/connector",
    "/admin/plugin",
    "/admin/agent",
    "/admin/payments",
    "/admin/memberships",
    "/admin/marketing",
    "/admin/storage",
  ]) {
    assert.match(routeClassification, new RegExp(`route:\\s*${relayRoute.replaceAll("/", "\\/")}`));
  }
});
