#!/usr/bin/env node

import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parseWorkspaceArgs, workspaceBindTargets } from './dev/start-workspace.mjs';

const __filename = fileURLToPath(import.meta.url);
const execFileAsync = promisify(execFile);

function printHelp() {
  console.log(`Usage: pnpm stop [--] [workspace options]

Stop SDKWork Claw Router development processes that own the current workspace ports.

The default command stops listeners on the standalone development topology ports.
Pass the same bind and topology options used with pnpm dev when stopping a
workspace that was started with explicit ports.

Options:
  --dry-run                         List matched listeners without stopping them.
  --deployment-profile <profile>    Forwarded to the workspace topology resolver.
  --service-layout <layout>         Forwarded to the workspace topology resolver.
  --server-bind <host:port>         Match a custom edge server listener.
  --portal-bind <host:port>         Match a custom portal listener.
  --gateway-bind <host:port>        Match a custom gateway listener.
  --admin-api-bind <host:port>      Match a custom admin API listener.
  --app-api-bind <host:port>        Match a custom app API listener.
  -h, --help                        Show this help.
`);
}

export function parseStopArgs(argv) {
  const workspaceArgs = [];
  let dryRun = false;
  let help = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    workspaceArgs.push(arg);
  }

  return { dryRun, help, workspaceArgs };
}

export function workspaceStopTargets(workspaceArgs = []) {
  const settings = parseWorkspaceArgs(workspaceArgs);
  return workspaceBindTargets(settings);
}

export function selectWindowsListeningProcesses(netstatOutput, ports) {
  const selectedPorts = new Set(ports.map((port) => String(port)));
  const processIds = new Set();

  for (const line of String(netstatOutput).split(/\r?\n/u)) {
    const match = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/iu);
    if (match && selectedPorts.has(match[1])) {
      processIds.add(Number(match[2]));
    }
  }

  return [...processIds].sort((left, right) => left - right);
}

async function listWindowsListeningProcesses(ports) {
  const { stdout } = await execFileAsync('netstat.exe', ['-ano', '-p', 'TCP'], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return selectWindowsListeningProcesses(stdout, ports);
}

async function listUnixListeningProcesses(ports) {
  const processIds = new Set();
  for (const port of ports) {
    try {
      const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
        maxBuffer: 1024 * 1024,
      });
      for (const value of stdout.trim().split(/\s+/u)) {
        if (/^\d+$/u.test(value)) {
          processIds.add(Number(value));
        }
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 1) {
        continue;
      }
      throw error;
    }
  }
  return [...processIds].sort((left, right) => left - right);
}

async function stopProcessTree(processId, { platform }) {
  if (platform === 'win32') {
    await execFileAsync('taskkill', ['/PID', String(processId), '/T', '/F'], {
      windowsHide: true,
    });
    return;
  }
  process.kill(processId, 'SIGTERM');
}

export async function stopWorkspaceProcesses({
  workspaceArgs = [],
  dryRun = false,
  platform = process.platform,
  listListeningProcesses = platform === 'win32'
    ? listWindowsListeningProcesses
    : listUnixListeningProcesses,
  stopProcess = (processId) => stopProcessTree(processId, { platform }),
} = {}) {
  const targets = workspaceStopTargets(workspaceArgs);
  const ports = [...new Set(targets.map((target) => target.port))]
    .sort((left, right) => Number(left) - Number(right));
  const processIds = await listListeningProcesses(ports);

  if (processIds.length === 0) {
    console.log('[stop-claw-router-application] no current workspace listeners found');
    return { targets, processIds };
  }

  const targetSummary = targets.map((target) => `${target.name} ${target.bind}`).join(', ');
  for (const processId of processIds) {
    if (dryRun) {
      console.log(`[stop-claw-router-application] would stop PID ${processId} for ${targetSummary}`);
      continue;
    }
    console.error(`[stop-claw-router-application] stop PID ${processId} for ${targetSummary}`);
    await stopProcess(processId);
  }

  return { targets, processIds };
}

async function main() {
  const settings = parseStopArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  await stopWorkspaceProcesses(settings);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[stop-claw-router-application] ${error.message}`);
    process.exit(1);
  });
}
