#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_TARGETS = Object.freeze([
  ['sdkwork-clawrouter-admin-gateway', 'messaging_route'],
  ['sdkwork-clawrouter-standalone-gateway', 'api_query_contract'],
  ['sdkwork-clawrouter-edge-runtime', 'invocation_router'],
  ['sdkwork-clawrouter-edge-runtime', 'provider_adapter_passthrough_streaming'],
  ['sdkwork-clawrouter-edge-runtime', 'edge_server'],
  ['sdkwork-clawrouter-edge-runtime', 'provider_adapter_invocation'],
  ['sdkwork-clawrouter-router-service', 'openai_compatible_http_relay'],
  ['sdkwork-clawrouter-router-service', 'openai_compatible_chat_stream_http_relay'],
  ['sdkwork-clawrouter-router-service', 'openai_compatible_embeddings_http_relay'],
  ['sdkwork-clawrouter-router-service', 'openai_compatible_responses_http_relay'],
  ['sdkwork-clawrouter-router-service', 'openai_chat_adapter_api'],
  ['sdkwork-clawrouter-router-service', 'openai_embeddings_adapter_api'],
  ['sdkwork-clawrouter-router-service', 'openai_responses_adapter_api'],
  ['sdkwork-clawrouter-router-service', 'postgres_pricing_catalog_loader'],
  ['sdkwork-clawrouter-edge-runtime', 'database_installer_startup'],
]);

function printHelp() {
  console.log(`Usage: node scripts/measure-claw-router-test-targets.mjs [options]

Measure curated slow Rust integration test targets and print a duration report.

Options:
  --target <package:test>  Measure only one target. Can be repeated.
  --target-dir <path>      Override Cargo target directory.
  --build-jobs <count>     Override Cargo build parallelism for this run.
  --test-threads <count>   Forward --test-threads to cargo test binaries.
  --json                   Print JSON report.
  --dry-run                Print commands without executing them.
  -h, --help               Show this help.
`);
}

function parseTarget(value) {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`--target must use <package:test> format: ${value}`);
  }
  return [value.slice(0, separator), value.slice(separator + 1)];
}

function parseArgs(argv) {
  const settings = {
    targets: [],
    targetDir: null,
    buildJobs: null,
    testThreads: null,
    json: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--target':
        index += 1;
        if (!argv[index]) {
          throw new Error('--target requires a value');
        }
        settings.targets.push(parseTarget(argv[index]));
        break;
      case '--target-dir':
        index += 1;
        if (!argv[index]) {
          throw new Error('--target-dir requires a value');
        }
        settings.targetDir = argv[index];
        break;
      case '--build-jobs':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--build-jobs requires a positive integer');
        }
        settings.buildJobs = argv[index];
        break;
      case '--test-threads':
        index += 1;
        if (!argv[index] || !/^[1-9][0-9]*$/u.test(argv[index])) {
          throw new Error('--test-threads requires a positive integer');
        }
        settings.testThreads = argv[index];
        break;
      case '--json':
        settings.json = true;
        break;
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported measurement option: ${arg}`);
    }
  }

  return settings;
}

function normalizeTargetDir(targetDir, platform = process.platform) {
  const selected = targetDir || path.join('target-rust-tests', 'measure');
  return platform === 'win32' ? selected.replaceAll('/', '\\') : selected.replaceAll('\\', '/');
}

function buildCargoEnv(env, { targetDir, buildJobs }) {
  const stepEnv = {
    ...env,
    CARGO_TARGET_DIR: targetDir,
  };
  delete stepEnv.CARGO_BUILD_JOBS;
  if (buildJobs) {
    stepEnv.CARGO_BUILD_JOBS = buildJobs;
  }
  if (!stepEnv.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE) {
    stepEnv.SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE = 'copy';
  }
  return stepEnv;
}

function buildMeasurementPlan(settings, { env = process.env, platform = process.platform } = {}) {
  const targetDir = normalizeTargetDir(settings.targetDir, platform);
  const stepEnv = buildCargoEnv(env, {
    targetDir,
    buildJobs: settings.buildJobs,
  });

  const targets = settings.targets.length > 0 ? settings.targets : DEFAULT_TARGETS;
  const steps = targets.map(([packageName, testTarget]) => {
    const args = ['test', '-p', packageName, '--test', testTarget];
    if (settings.testThreads) {
      args.push('--', '--test-threads', settings.testThreads);
    }
    return {
      label: `${packageName} ${testTarget}`,
      packageName,
      testTarget,
      command: 'cargo',
      args,
      env: stepEnv,
    };
  });
  return { targetDir, steps };
}

function commandLine(step) {
  return `${step.command} ${step.args.join(' ')}`;
}

function runStep(step, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(commandLine(step));
    return Promise.resolve({
      packageName: step.packageName,
      testTarget: step.testTarget,
      command: commandLine(step),
      status: 'dry-run',
      durationSeconds: 0,
    });
  }

  const startedAt = Date.now();
  console.error(`[measure-claw-router-test-targets] ${step.label}: ${commandLine(step)}`);
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: process.cwd(),
      env: step.env,
      stdio: 'inherit',
      windowsHide: process.platform === 'win32',
    });
    child.on('error', (error) => {
      resolve({
        packageName: step.packageName,
        testTarget: step.testTarget,
        command: commandLine(step),
        status: 'error',
        error: error.message,
        durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      });
    });
    child.on('exit', (code, signal) => {
      const durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
      const status = signal ? `signal:${signal}` : (code ?? 1) === 0 ? 'passed' : `exit:${code}`;
      console.error(`[measure-claw-router-test-targets] ${step.label}: ${status} in ${durationSeconds}s`);
      resolve({
        packageName: step.packageName,
        testTarget: step.testTarget,
        command: commandLine(step),
        status,
        durationSeconds,
      });
    });
  });
}

function printReport(results, { json = false } = {}) {
  const sorted = [...results].sort((left, right) => right.durationSeconds - left.durationSeconds);
  if (json) {
    console.log(JSON.stringify({ results: sorted }, null, 2));
    return;
  }
  console.log('| seconds | status | package | test target |');
  console.log('| ---: | --- | --- | --- |');
  for (const result of sorted) {
    console.log(
      `| ${result.durationSeconds.toFixed(1)} | ${result.status} | ${result.packageName} | ${result.testTarget} |`,
    );
  }
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  const plan = buildMeasurementPlan(settings);
  const results = [];
  for (const step of plan.steps) {
    results.push(await runStep(step, { dryRun: settings.dryRun }));
  }
  printReport(results, { json: settings.json });
  if (results.some((result) => result.status !== 'passed' && result.status !== 'dry-run')) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[measure-claw-router-test-targets] ${error.message}`);
    process.exit(1);
  });
}

export {
  buildCargoEnv,
  buildMeasurementPlan,
  commandLine,
  normalizeTargetDir,
  parseArgs,
};
