import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const profileByAlias = new Map([
  ["development", { environment: "development", profile: "dev" }],
  ["dev", { environment: "development", profile: "dev" }],
  ["test", { environment: "test", profile: "test" }],
  ["staging", { environment: "staging", profile: "staging" }],
  ["production", { environment: "production", profile: "prod" }],
  ["prod", { environment: "production", profile: "prod" }],
]);

function fail(message) {
  throw new Error(`[sdkwork-commerce-pc config] ${message}`);
}

function parseArgs(argv) {
  if (argv.includes("--all")) {
    return [
      profileByAlias.get("development"),
      profileByAlias.get("test"),
      profileByAlias.get("staging"),
      profileByAlias.get("production"),
    ];
  }
  const profileIndex = argv.indexOf("--profile");
  if (profileIndex === -1 || !argv[profileIndex + 1]) {
    fail("expected --profile <development|test|staging|production> or --all");
  }
  const resolved = profileByAlias.get(argv[profileIndex + 1]);
  if (!resolved) {
    fail(`unsupported profile ${argv[profileIndex + 1]}`);
  }
  return [resolved];
}

function readRequired(relativePath) {
  const absolutePath = path.join(appRoot, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`${relativePath} must exist`);
  }
  return readFileSync(absolutePath, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} must be ${expected}, got ${String(actual)}`);
  }
}

function assertNoUnsafeReleaseValues(source, relativePath) {
  const forbiddenPatterns = [
    /localhost/iu,
    /127\.0\.0\.1/u,
    /0\.0\.0\.0(?!:)/u,
    /CHANGE_ME|TODO|TOKEN_HERE|SECRET_HERE|PASSWORD_HERE|<[^>]+>/iu,
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      fail(`${relativePath} contains release-unsafe value matching ${pattern}`);
    }
  }
}

function validateBrowserConfig(environment, profile) {
  const relativePath = `config/browser/runtime-env.${environment}.example.json`;
  const source = readRequired(relativePath);
  const config = JSON.parse(source);

  assertEqual(config.environment, environment, `${relativePath}: environment`);
  assertEqual(config.configProfile, profile, `${relativePath}: configProfile`);
  assertEqual(config.buildMode, environment, `${relativePath}: buildMode`);
  assertEqual(config.deploymentMode, "web", `${relativePath}: deploymentMode`);
  assertEqual(config.runtimeTarget, "browser", `${relativePath}: runtimeTarget`);
  assertEqual(config.appKey, "sdkwork-commerce-pc", `${relativePath}: appKey`);
  assertEqual(config.auth?.tokenManagerMode, "appbase-global", `${relativePath}: auth.tokenManagerMode`);
  assertEqual(config.auth?.accessTokenHeader, "Access-Token", `${relativePath}: auth.accessTokenHeader`);

  if (environment === "staging" || environment === "production") {
    assertNoUnsafeReleaseValues(source, relativePath);
  }
}

function validateTomlConfig(environment, profile, target) {
  const relativePath = `config/${target}/sdkwork-commerce-pc.${environment}.toml.example`;
  const source = readRequired(relativePath);
  const runtimeTarget = environment === "test" ? "test-runner" : target;

  for (const [label, expected] of [
    ["environment", environment],
    ["config_profile", profile],
    ["build_mode", environment],
    ["deployment_mode", target],
    ["runtime_target", runtimeTarget],
    ["app_key", "sdkwork-commerce-pc"],
  ]) {
    const pattern = new RegExp(`^${label}\\s*=\\s*"${expected}"$`, "mu");
    if (!pattern.test(source)) {
      fail(`${relativePath}: ${label} must be ${expected}`);
    }
  }

  if (environment === "staging" || environment === "production") {
    assertNoUnsafeReleaseValues(source, relativePath);
  }
}

function validateTauriConfig() {
  const relativePath = "config/tauri/tauri.conf.json";
  const config = JSON.parse(readRequired(relativePath));
  assertEqual(config.productName, "SDKWork Commerce PC", `${relativePath}: productName`);
  assertEqual(config.build?.devUrl, "http://127.0.0.1:5174", `${relativePath}: build.devUrl`);
  assertEqual(config.build?.frontendDist, "../../dist", `${relativePath}: build.frontendDist`);
}

for (const resolvedProfile of parseArgs(process.argv.slice(2))) {
  const { environment, profile } = resolvedProfile;

  validateBrowserConfig(environment, profile);
  validateTomlConfig(environment, profile, "desktop");
  validateTomlConfig(environment, profile, "server");
  validateTomlConfig(environment, profile, "container");
  validateTauriConfig();

  console.log(`[sdkwork-commerce-pc config] ${environment} preflight passed`);
}
