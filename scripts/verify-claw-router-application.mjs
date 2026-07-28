#!/usr/bin/env node

import { spawn } from 'node:child_process';
import process from 'node:process';

function printHelp() {
  console.log(`Usage: node scripts/verify-claw-router-application.mjs [options]

Run the standard sdkwork-clawrouter verification sequence.

Options:
  --fast                 Run the low-cost local iteration gate for Codex loops.
  --precommit            Run the staged, commit-time verification gate.
  --ci                   Run the pull-request CI verification gate.
  --parallel             Run dependency-safe verification groups concurrently.
  --concurrency <count>  Maximum commands to run at once in a parallel group. Defaults to 4.
  --build-jobs <count>   Override Cargo build parallelism for Rust verify steps.
  --with-edge-dev-smoke  Also run the real pnpm dev:server edge server smoke.
  --skip-edge-dev-smoke
                         Skip the real pnpm dev:server edge server smoke even when CI or env opts in.
  --skip-rust-tests      Skip cargo test --workspace.
  --skip-python-tests    Skip python -B -m unittest discover tests.
  --skip-schema-gate     Skip python -B -m tools.schema_quality_gate.
  --skip-contract-guardians
                         Skip SDK, architecture, OpenAPI, frontend, Flyway, and legacy audits.
  --dry-run              Print commands without executing them.
  -h, --help             Show this help.
`);
}

function parseArgs(argv) {
  const settings = {
    buildJobs: null,
    fast: false,
    precommit: false,
    ci: false,
    parallel: false,
    concurrency: 4,
    withEdgeDevSmoke: false,
    skipEdgeDevSmoke: false,
    skipRustTests: false,
    skipPythonTests: false,
    skipSchemaGate: false,
    skipContractGuardians: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--build-jobs':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--build-jobs requires a positive integer');
        }
        settings.buildJobs = argv[index];
        break;
      case '--fast':
        settings.fast = true;
        break;
      case '--precommit':
        settings.precommit = true;
        break;
      case '--ci':
        settings.ci = true;
        break;
      case '--parallel':
        settings.parallel = true;
        break;
      case '--concurrency':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--concurrency requires a positive integer');
        }
        settings.concurrency = Number(argv[index]);
        break;
      case '--with-edge-dev-smoke':
        settings.withEdgeDevSmoke = true;
        settings.skipEdgeDevSmoke = false;
        break;
      case '--skip-edge-dev-smoke':
        settings.withEdgeDevSmoke = false;
        settings.skipEdgeDevSmoke = true;
        break;
      case '--skip-rust-tests':
        settings.skipRustTests = true;
        break;
      case '--skip-python-tests':
        settings.skipPythonTests = true;
        break;
      case '--skip-schema-gate':
        settings.skipSchemaGate = true;
        break;
      case '--skip-contract-guardians':
        settings.skipContractGuardians = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported verify option: ${arg}`);
    }
  }

  const profileCount = Number(settings.fast) + Number(settings.precommit) + Number(settings.ci);
  if (profileCount > 1) {
    throw new Error('Choose only one verification profile: --fast, --precommit, or --ci');
  }

  return settings;
}

function mergeRustFlags(existing, requiredFlag) {
  const flags = (existing ?? '').trim();
  if (!flags) {
    return requiredFlag;
  }
  if (flags.includes(requiredFlag)) {
    return flags;
  }
  return `${flags} ${requiredFlag}`;
}

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function shouldRunEdgeDevSmoke(settings, env = process.env) {
  if (settings.skipEdgeDevSmoke || isEnabled(env.CLAWROUTER_EDGE_DEV_SMOKE_SKIP)) {
    return false;
  }
  return (
    settings.withEdgeDevSmoke === true
    || isEnabled(env.CLAWROUTER_VERIFY_EDGE_DEV_SMOKE)
    || isEnabled(env.CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED)
  );
}

function cargoVerifyEnv(env = process.env) {
  const verifyEnv = {
    ...env,
    CARGO_TARGET_DIR: env.CLAWROUTER_VERIFY_CARGO_TARGET_DIR || env.CARGO_TARGET_DIR || 'target-verify',
    CARGO_INCREMENTAL: '0',
    CARGO_PROFILE_DEV_DEBUG: '0',
    CARGO_PROFILE_DEV_INCREMENTAL: 'false',
    CARGO_PROFILE_TEST_DEBUG: '0',
    CARGO_PROFILE_TEST_INCREMENTAL: 'false',
  };
  delete verifyEnv.CARGO_BUILD_JOBS;
  return verifyEnv;
}

function buildCargoVerificationEnv(env = process.env, settings = {}) {
  const verifyEnv = cargoVerifyEnv(env);
  if (settings.buildJobs) {
    verifyEnv.CARGO_BUILD_JOBS = settings.buildJobs;
  }
  return verifyEnv;
}

const COMMERCIAL_CONTRACT_GUARDIANS = [
  ['sdkwork standard alignment guard', 'tools.sdkwork_standard_alignment_guardian', ['--strict']],
  ['repository delivery guard', 'tools.repository_delivery_guardian'],
  ['clawrouter generated SDK guard', 'tools.clawrouter_sdk_guardian'],
  ['clawrouter project skill guard', 'tools.clawrouter_skill_guardian'],
  ['architecture standard guard', 'tools.architecture_standard_guardian'],
  ['rust backend architecture guard', 'tools.rust_backend_architecture_guardian'],
  ['gateway openapi freshness check', 'tools.clawrouter_gateway_openapi_generator', ['--check']],
  ['openapi precision audit', 'tools.clawrouter_openapi_precision_audit'],
  ['payload SDK audit', 'tools.clawrouter_payload_sdk_audit'],
  ['frontend static source manifest check', 'tools.frontend_static_source_manifest', ['--check']],
  ['frontend contract guard', 'tools.frontend_contract_guardian'],
  ['schema registry guard', 'tools.schema_guardian'],
  ['flyway schema contract audit', 'tools.flyway_schema_contract_audit'],
  ['frontend operation audit', 'tools.frontend_operation_audit'],
  ['frontend field audit', 'tools.frontend_field_audit'],
  ['java legacy contract audit', 'tools.java_legacy_contract_audit'],
];

function buildCommercialContractGuardianPlan(env = process.env) {
  return COMMERCIAL_CONTRACT_GUARDIANS.map(([label, moduleName, extraArgs = []]) => ({
    label,
    command: 'python',
    args: ['-B', '-m', moduleName, ...extraArgs],
    env,
  }));
}

function buildTopologyVerificationPlan(env = process.env) {
  return [
    {
      label: 'topology spec validate',
      command: 'node',
      args: [
        '../sdkwork-app-topology/scripts/sdkwork-topology.mjs',
        'validate',
        '--root',
        '.',
        '--spec',
        'specs/topology.spec.json',
      ],
      env,
    },
    {
      label: 'topology contract tests',
      command: 'node',
      args: [
        '--test',
        '--experimental-test-isolation=none',
        'scripts/verify-claw-router-topology.test.mjs',
      ],
      env,
    },
    {
      label: 'app-topology core tests',
      command: 'node',
      args: [
        '--test',
        '--experimental-test-isolation=none',
        '../sdkwork-app-topology/tests/topology-core.test.mjs',
      ],
      env,
    },
    {
      label: 'IAM embedded bootstrap workspace audit',
      command: 'node',
      args: ['../sdkwork-specs/tools/audit-iam-embedded-bootstrap-workspace.mjs'],
      env,
    },
  ];
}

function buildSdkRuntimeBuildPlan(env = process.env) {
  return [
    {
      label: 'app SDK runtime build',
      command: pnpmCommand(),
      args: ['--dir', 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi', 'build'],
      env,
    },
    {
      label: 'backend SDK runtime build',
      command: pnpmCommand(),
      args: ['--dir', 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi', 'build'],
      env,
    },
    {
      label: 'open SDK runtime build',
      command: pnpmCommand(),
      args: ['--dir', 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi', 'build'],
      env,
    },
  ];
}

function buildApplicationEnvVerificationPlan(env = process.env) {
  return [
    {
      label: 'application env standard check',
      command: pnpmCommand(),
      args: ['check:application-env'],
      env,
    },
  ];
}

function buildDatabaseAndGatewayVerificationPlan(env = process.env) {
  return [
    {
      label: 'gateway request identity check',
      command: pnpmCommand(),
      args: ['check:gateway-request-identity'],
      env,
    },
    {
      label: 'database framework standard check',
      command: pnpmCommand(),
      args: ['db:validate'],
      env,
    },
  ];
}

function buildFastVerificationPlan(env = process.env) {
  return [
    {
      label: 'sdkwork-models catalog check',
      command: pnpmCommand(),
      args: ['models:check'],
      env,
    },
    {
      label: 'claw router download catalog check',
      command: pnpmCommand(),
      args: ['downloads:check'],
      env,
    },
    {
      label: 'app store seed check',
      command: pnpmCommand(),
      args: ['app-store:seed:check'],
      env,
    },
    {
      label: 'skills seed check',
      command: pnpmCommand(),
      args: ['skills:seed:check'],
      env,
    },
    {
      label: 'repository delivery guard',
      command: 'python',
      args: ['-B', '-m', 'tools.repository_delivery_guardian'],
      env,
    },
    {
      label: 'agent workflow standard check',
      command: pnpmCommand(),
      args: ['check:agent-workflow-standard'],
      env,
    },
    {
      label: 'pnpm script standard check',
      command: pnpmCommand(),
      args: ['check:pnpm-script-standard'],
      env,
    },
    {
      label: 'api contract materialization check',
      command: pnpmCommand(),
      args: ['api:materialize:check'],
      env,
    },
    ...buildApplicationEnvVerificationPlan(env),
    ...buildTopologyVerificationPlan(env),
    {
      label: 'tooling contract tests',
      command: 'node',
      args: ['scripts/run-claw-router-application.test.mjs'],
      env,
    },
    ...buildSdkRuntimeBuildPlan(env),
    {
      label: 'portal auth runtime tests',
      command: pnpmCommand(),
      args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'exec', 'tsx', 'auth-runtime.test.ts'],
      env,
    },
    {
      label: 'frontend source hygiene tests',
      command: 'python',
      args: ['-B', '-m', 'unittest', 'tests.test_frontend_source_hygiene_standard'],
      env,
    },
  ];
}

function buildPrecommitVerificationPlan(env = process.env) {
  return [
    {
      label: 'sdkwork-models catalog check',
      command: pnpmCommand(),
      args: ['models:check'],
      env,
    },
    {
      label: 'claw router download catalog check',
      command: pnpmCommand(),
      args: ['downloads:check'],
      env,
    },
    {
      label: 'app store seed check',
      command: pnpmCommand(),
      args: ['app-store:seed:check'],
      env,
    },
    {
      label: 'skills seed check',
      command: pnpmCommand(),
      args: ['skills:seed:check'],
      env,
    },
    {
      label: 'repository delivery guard',
      command: 'python',
      args: ['-B', '-m', 'tools.repository_delivery_guardian'],
      env,
    },
    {
      label: 'agent workflow standard check',
      command: pnpmCommand(),
      args: ['check:agent-workflow-standard'],
      env,
    },
    {
      label: 'pnpm script standard check',
      command: pnpmCommand(),
      args: ['check:pnpm-script-standard'],
      env,
    },
    {
      label: 'api contract materialization check',
      command: pnpmCommand(),
      args: ['api:materialize:check'],
      env,
    },
    ...buildApplicationEnvVerificationPlan(env),
    ...buildDatabaseAndGatewayVerificationPlan(env),
    ...buildTopologyVerificationPlan(env),
    {
      label: 'tooling contract tests',
      command: 'node',
      args: ['scripts/run-claw-router-application.test.mjs'],
      env,
    },
    ...buildSdkRuntimeBuildPlan(env),
    {
      label: 'frontend source hygiene tests',
      command: 'python',
      args: ['-B', '-m', 'unittest', 'tests.test_frontend_source_hygiene_standard'],
      env,
    },
    {
      label: 'relay retired admin surfaces guard',
      command: 'python',
      args: ['-B', '-m', 'unittest', 'tests.test_relay_retired_admin_surfaces_standard'],
      env,
    },
    {
      label: 'admin route registry runtime tests',
      command: 'python',
      args: ['-B', '-m', 'unittest', 'tests.test_admin_route_registry_runtime_standard'],
      env,
    },
    {
      label: 'staged Rust auto tests',
      command: 'node',
      args: ['scripts/run-claw-router-rust-tests.mjs', 'auto', '--staged'],
      env,
    },
  ];
}

function buildCiVerificationPlan(env = process.env, settings = {}) {
  const rustEnv = buildCargoVerificationEnv(env, settings);
  const plan = buildPrecommitVerificationPlan(env);
  plan.push({
    label: 'rust format for frequently touched packages',
    command: 'cargo',
    args: [
      'fmt',
      '-p',
      'sdkwork-claw-config',
      '-p',
      'sdkwork-claw-http',
      '-p',
      'sdkwork-claw-security',
      '-p',
      'sdkwork-claw-test-support',
      '-p',
      'sdkwork-clawrouter-router-service',
      '-p',
      'sdkwork-clawrouter-admin-gateway',
      '-p',
      'sdkwork-clawrouter-edge-runtime',
      '--check',
    ],
    env,
  });
  const runtimeRustArgs = [
    'test',
    '-p',
    'sdkwork-clawrouter-admin-gateway',
    '--test',
    'product_model_route',
    '--test',
    'messaging_route',
  ];
  plan.push({
    label: 'admin api integration tests',
    command: 'cargo',
    args: runtimeRustArgs,
    env: rustEnv,
  });
  plan.push(...buildCommercialContractGuardianPlan(env));
  plan.push({
    label: 'portal frontend typecheck',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'typecheck'],
    env,
  });
  return plan;
}

function buildVerificationPlan(settings, env = process.env) {
  if (settings.fast) {
    return buildFastVerificationPlan(env);
  }
  if (settings.precommit) {
    return buildPrecommitVerificationPlan(env);
  }
  if (settings.ci) {
    return buildCiVerificationPlan(env, settings);
  }

  const rustEnv = buildCargoVerificationEnv(env, settings);
  const plan = [
    {
      label: 'sdkwork-models catalog check',
      command: pnpmCommand(),
      args: ['models:check'],
      env,
    },
    {
      label: 'claw router download catalog check',
      command: pnpmCommand(),
      args: ['downloads:check'],
      env,
    },
    {
      label: 'rust format',
      command: 'node',
      args: ['scripts/cargo-fmt-workspace.mjs', '--check'],
      env,
    },
    {
      label: 'rust compile warnings gate',
      command: 'cargo',
      args: ['check', '--all-targets'],
      env: {
        ...rustEnv,
        RUSTFLAGS: mergeRustFlags(env.RUSTFLAGS, '-D warnings'),
      },
    },
    {
      label: 'agent workflow standard check',
      command: pnpmCommand(),
      args: ['check:agent-workflow-standard'],
      env,
    },
    {
      label: 'pnpm script standard check',
      command: pnpmCommand(),
      args: ['check:pnpm-script-standard'],
      env,
    },
    {
      label: 'api contract materialization check',
      command: pnpmCommand(),
      args: ['api:materialize:check'],
      env,
    },
    ...buildApplicationEnvVerificationPlan(env),
    ...buildDatabaseAndGatewayVerificationPlan(env),
    ...buildTopologyVerificationPlan(env),
    {
      label: 'tooling contract tests',
      command: 'node',
      args: ['scripts/run-claw-router-application.test.mjs'],
      env,
    },
  ];

  if (!settings.skipContractGuardians) {
    plan.push(...buildCommercialContractGuardianPlan(env));
  }
  plan.push(...buildSdkRuntimeBuildPlan(env));
  plan.push({
    label: 'frontend source hygiene tests',
    command: 'python',
    args: ['-B', '-m', 'unittest', 'tests.test_frontend_source_hygiene_standard'],
    env,
  });
  plan.push({
    label: 'portal vite config runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/vite-config-runtime.test.ts'],
    env,
  });
  if (shouldRunEdgeDevSmoke(settings, env)) {
    plan.push({
      label: 'edge dev server smoke',
      command: 'node',
      args: ['scripts/smoke-edge-dev-server.mjs'],
      env: rustEnv,
    });
  }
  plan.push({
    label: 'portal frontend typecheck',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'typecheck'],
    env,
  });
  plan.push({
    label: 'production artifact build',
    command: pnpmCommand(),
    args: ['build'],
    env,
  });
  plan.push({
    label: 'portal bundle budget audit',
    command: 'node',
    args: ['apps/sdkwork-clawrouter-pc/scripts/audit-bundle-budget.mjs'],
    env,
  });
  plan.push({
    label: 'portal production edge smoke',
    command: 'cargo',
    args: ['test', '-p', 'sdkwork-clawrouter-edge-runtime', '--test', 'edge_server', 'edge_server_can_serve_portal_dist_without_node_server'],
    env: rustEnv,
  });
  plan.push({
    label: 'portal production browser DOM smoke',
    command: 'node',
    args: ['apps/sdkwork-clawrouter-pc/scripts/smoke-production-browser.mjs'],
    env: rustEnv,
  });
  plan.push({
    label: 'portal runtime app SDK refresh',
    command: pnpmCommand(),
    args: ['--dir', 'sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi', 'build'],
    env,
  });
  plan.push({
    label: 'portal runtime backend SDK refresh',
    command: pnpmCommand(),
    args: ['--dir', 'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi', 'build'],
    env,
  });
  plan.push({
    label: 'portal runtime open SDK refresh',
    command: pnpmCommand(),
    args: ['--dir', 'sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi', 'build'],
    env,
  });
  plan.push({
    label: 'portal commons runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/commons-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal auth runtime tests',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'exec', 'tsx', 'auth-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal models runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/models-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal rankings runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/rankings-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal home downloads runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/home-downloads-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal api reference playground runtime tests',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'exec', 'tsx', 'api-reference-playground-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal api reference SSR smoke tests',
    command: 'node',
    args: ['apps/sdkwork-clawrouter-pc/api-reference-ssr-smoke.test.cjs'],
    env,
  });
  plan.push({
    label: 'portal playground chat runtime tests',
    command: pnpmCommand(),
    args: [
      '--dir',
      'apps/sdkwork-clawrouter-pc',
      'exec',
      'vitest',
      'run',
      'playground-chat-runtime.test.ts',
      '--config',
      'vite.config.ts',
      '--pool',
      'vmThreads',
    ],
    env,
  });
  plan.push({
    label: 'portal api key runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/api-key-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal commerce business runtime tests',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'exec', 'tsx', 'commerce-business-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal console app runtime tests',
    command: pnpmCommand(),
    args: ['--dir', 'apps/sdkwork-clawrouter-pc', 'exec', 'tsx', 'console-app-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal console routing runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/console-routing-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal console operations runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/console-operations-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin group runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-group-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin channel runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-channel-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin user runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-user-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin model runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-model-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin ratelimit runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-ratelimit-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin marketing runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-marketing-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin operations runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-operations-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal admin announcement runtime tests',
    command: 'node',
    args: ['--experimental-strip-types', 'apps/sdkwork-clawrouter-pc/admin-announcement-runtime.test.ts'],
    env,
  });
  plan.push({
    label: 'portal models SSR smoke tests',
    command: 'node',
    args: ['apps/sdkwork-clawrouter-pc/models-ssr-smoke.test.cjs'],
    env,
  });
  if (!settings.skipRustTests) {
    const rustWorkspaceTestArgs = [
      'scripts/run-claw-router-rust-tests.mjs',
      'full',
      '--target-dir',
      rustEnv.CARGO_TARGET_DIR,
      '--test-threads',
      '1',
    ];
    if (settings.buildJobs) {
      rustWorkspaceTestArgs.push('--build-jobs', settings.buildJobs);
    }
    plan.push({
      label: 'rust workspace tests',
      command: 'node',
      args: rustWorkspaceTestArgs,
      env: rustEnv,
    });
  }
  if (!settings.skipPythonTests) {
    plan.push({
      label: 'python standard tests',
      command: 'python',
      args: ['-B', '-m', 'unittest', 'discover', 'tests'],
      env,
    });
  }
  if (!settings.skipSchemaGate) {
    plan.push({
      label: 'schema quality gate',
      command: 'python',
      args: ['-B', '-m', 'tools.schema_quality_gate'],
      env,
    });
  }

  return plan;
}

const PARALLEL_SAFE_LABELS = new Set([
  ...COMMERCIAL_CONTRACT_GUARDIANS.map(([label]) => label),
  'app SDK runtime build',
  'backend SDK runtime build',
  'open SDK runtime build',
  'portal runtime app SDK refresh',
  'portal runtime backend SDK refresh',
  'portal runtime open SDK refresh',
  'portal commons runtime tests',
  'portal auth runtime tests',
  'portal models runtime tests',
  'portal rankings runtime tests',
  'portal home downloads runtime tests',
  'portal api reference playground runtime tests',
  'portal api reference SSR smoke tests',
  'portal playground chat runtime tests',
  'portal api key runtime tests',
  'portal commerce business runtime tests',
  'portal console app runtime tests',
  'portal console routing runtime tests',
  'portal console operations runtime tests',
  'portal admin group runtime tests',
  'portal admin channel runtime tests',
  'portal admin user runtime tests',
  'portal admin model runtime tests',
  'portal admin ratelimit runtime tests',
  'portal admin marketing runtime tests',
  'portal admin operations runtime tests',
  'portal admin announcement runtime tests',
  'portal models SSR smoke tests',
]);

function canRunInParallel(step) {
  return PARALLEL_SAFE_LABELS.has(step.label);
}

function buildVerificationExecutionPlan(settings, env = process.env) {
  const steps = buildVerificationPlan(settings, env);
  const concurrency = Number(settings.concurrency ?? 4);
  if (!settings.parallel) {
    return {
      parallel: false,
      concurrency,
      groups: steps.map((step) => ({
        parallel: false,
        steps: [step],
      })),
    };
  }

  const groups = [];
  let currentParallelGroup = [];
  const flushParallelGroup = () => {
    if (currentParallelGroup.length === 0) {
      return;
    }
    groups.push({
      parallel: currentParallelGroup.length > 1,
      steps: currentParallelGroup,
    });
    currentParallelGroup = [];
  };

  for (const step of steps) {
    if (canRunInParallel(step)) {
      currentParallelGroup.push(step);
      continue;
    }
    flushParallelGroup();
    groups.push({
      parallel: false,
      steps: [step],
    });
  }
  flushParallelGroup();

  return {
    parallel: true,
    concurrency,
    groups,
  };
}

function runStep(step, { dryRun = false } = {}) {
  const commandLine = `${step.command} ${step.args.join(' ')}`;
  if (dryRun) {
    console.log(commandLine);
    return Promise.resolve();
  }

  console.error(`[verify-claw-router-application] ${step.label}: ${commandLine}`);
  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: step.env,
      stdio: 'inherit',
      shell: step.shell ?? (process.platform === 'win32' && step.command.endsWith('.cmd')),
      windowsHide: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${step.label} exited with signal ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${step.label} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function runStepGroup(group, { dryRun = false, concurrency = 4 } = {}) {
  if (!group.parallel || group.steps.length <= 1) {
    for (const step of group.steps) {
      await runStep(step, { dryRun });
    }
    return;
  }

  if (dryRun) {
    console.log(`# parallel group (${Math.min(concurrency, group.steps.length)} workers)`);
    for (const step of group.steps) {
      await runStep(step, { dryRun });
    }
    return;
  }

  console.error(
    `[verify-claw-router-application] parallel group: ${group.steps.length} steps, concurrency ${concurrency}`,
  );
  let nextIndex = 0;
  let firstError = null;
  const workerCount = Math.min(concurrency, group.steps.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (!firstError) {
      const step = group.steps[nextIndex];
      nextIndex += 1;
      if (!step) {
        return;
      }
      try {
        await runStep(step, { dryRun });
      } catch (error) {
        firstError = error;
        throw error;
      }
    }
  });
  await Promise.allSettled(workers);
  if (firstError) {
    throw firstError;
  }
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const executionPlan = buildVerificationExecutionPlan(settings);
  for (const group of executionPlan.groups) {
    await runStepGroup(group, {
      dryRun: settings.dryRun,
      concurrency: executionPlan.concurrency,
    });
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[verify-claw-router-application] ${error.message}`);
    process.exit(1);
  });
}

export {
  buildCiVerificationPlan,
  buildFastVerificationPlan,
  buildPrecommitVerificationPlan,
  buildVerificationPlan,
  buildVerificationExecutionPlan,
  cargoVerifyEnv,
  buildSdkRuntimeBuildPlan,
  canRunInParallel,
  mergeRustFlags,
  parseArgs,
  pnpmCommand,
  runStepGroup,
  shouldRunEdgeDevSmoke,
};
