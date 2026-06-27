import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("console access and routing keeps only token management as a local integration module", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const menuSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-core/src/ConsoleLayout.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as {
    dependencies?: Record<string, string>;
  };
  const i18nIndexSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");
  const coreMessagesSource = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/core.ts");

  assert.match(menuSource, /groupBlock\('console\.menu\.group\.integration', 'Access & Routing', \[/);
  assert.match(menuSource, /path: '\/console\/api-keys'/);
  assert.doesNotMatch(menuSource, /path: '\/console\/routing'/);
  assert.doesNotMatch(menuSource, /path: '\/console\/providers'/);
  assert.doesNotMatch(menuSource, /console\.menu\.routing/);
  assert.doesNotMatch(menuSource, /console\.menu\.providers/);
  assert.doesNotMatch(menuSource, /Local routing/);
  assert.doesNotMatch(menuSource, /Tool configuration/);

  assert.doesNotMatch(appSource, /sdkwork-clawrouter-pc-console-routing/);
  assert.doesNotMatch(appSource, /sdkwork-clawrouter-pc-console-providers/);
  assert.doesNotMatch(appSource, /<Route path="routing"/);
  assert.doesNotMatch(appSource, /<Route path="providers"/);

  assert.equal(packageJson.dependencies?.["sdkwork-clawrouter-pc-console-routing"], undefined);
  assert.equal(packageJson.dependencies?.["sdkwork-clawrouter-pc-console-providers"], undefined);

  assert.doesNotMatch(i18nIndexSource, /consoleRoutingMessages/);
  assert.doesNotMatch(i18nIndexSource, /consoleProvidersMessages/);
  assert.doesNotMatch(coreMessagesSource, /console\.menu\.routing/);
  assert.doesNotMatch(coreMessagesSource, /console\.menu\.providers/);
  assert.doesNotMatch(coreMessagesSource, /本地路由|工具配置|Local routing|Tool configuration/);

  assert.equal(existsSync(new URL("./packages/sdkwork-clawrouter-pc-console-routing/", import.meta.url)), false);
  assert.equal(existsSync(new URL("./packages/sdkwork-clawrouter-pc-console-providers/", import.meta.url)), false);
});

test("retired console providers and routing modules are absent from schema governance", () => {
  const contractIndex = readPortalFile("../../docs/schema-registry/frontend-field-contracts/index.yaml");
  const contractRoutes = readPortalFile("../../docs/schema-registry/frontend-field-contracts/routes/routes.yaml");
  const compiledContract = readPortalFile("../../docs/schema-registry/frontend-field-contracts.yaml");
  const routeClassification = readPortalFile("../../docs/schema-registry/frontend-route-classification.yaml");

  for (const source of [contractIndex, contractRoutes, compiledContract, routeClassification]) {
    assert.doesNotMatch(source, /\/console\/providers/);
    assert.doesNotMatch(source, /\/console\/routing/);
    assert.doesNotMatch(source, /sdkwork-clawrouter-pc-console-providers/);
    assert.doesNotMatch(source, /sdkwork-clawrouter-pc-console-routing/);
    assert.doesNotMatch(source, /console-providers\.yaml/);
    assert.doesNotMatch(source, /console-routing\.yaml/);
  }
});
