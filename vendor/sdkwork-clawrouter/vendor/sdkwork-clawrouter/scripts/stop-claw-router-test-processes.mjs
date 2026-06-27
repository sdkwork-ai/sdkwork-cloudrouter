#!/usr/bin/env node

import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function printHelp() {
  console.log(`Usage: node scripts/stop-claw-router-test-processes.mjs [options]

Stop repository-local Rust test binaries that can keep target/*.exe locked on Windows.

Options:
  --dry-run     Print matching processes without stopping them.
  -h, --help    Show this help.
`);
}

function parseArgs(argv) {
  const settings = {
    dryRun: false,
    help: false,
  };
  for (const arg of argv) {
    switch (arg) {
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      default:
        throw new Error(`Unsupported stop option: ${arg}`);
    }
  }
  return settings;
}

function normalizePathForCompare(value) {
  return path.resolve(String(value || '')).toLowerCase();
}

function pathIsInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function pathIsUnderRustTestOutput(workspaceRoot, executablePath) {
  if (!executablePath) {
    return false;
  }
  const root = normalizePathForCompare(workspaceRoot);
  const resolved = normalizePathForCompare(executablePath);
  if (!pathIsInside(root, resolved)) {
    return false;
  }
  const relative = path.relative(root, resolved);
  const [firstSegment] = relative.split(path.sep);
  return firstSegment === 'target' || firstSegment.startsWith('target-') || firstSegment === '.tmp';
}

function selectStoppableProcesses(processes, {
  workspaceRoot = path.resolve(import.meta.dirname, '..'),
  currentPid = process.pid,
} = {}) {
  return processes
    .filter((processInfo) => Number(processInfo.Id) !== Number(currentPid))
    .filter((processInfo) => pathIsUnderRustTestOutput(workspaceRoot, processInfo.Path))
    .sort((left, right) => Number(left.Id) - Number(right.Id));
}

async function listWindowsProcesses() {
  const script = [
    'Get-Process |',
    'Where-Object { $_.Path } |',
    'Select-Object Id,ProcessName,Path |',
    'ConvertTo-Json -Compress',
  ].join(' ');
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script,
  ], {
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  const text = stdout.trim();
  if (!text) {
    return [];
  }
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function stopWindowsProcesses(processes, { dryRun = false } = {}) {
  for (const processInfo of processes) {
    const line = `${processInfo.Id} ${processInfo.ProcessName} ${processInfo.Path}`;
    if (dryRun) {
      console.log(line);
      continue;
    }
    console.error(`[stop-claw-router-test-processes] stop ${line}`);
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `if (Get-Process -Id ${Number(processInfo.Id)} -ErrorAction SilentlyContinue) { Stop-Process -Id ${Number(processInfo.Id)} -Force -ErrorAction SilentlyContinue }; exit 0`,
    ], {
      windowsHide: true,
    });
  }
}

async function main() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  if (process.platform !== 'win32') {
    console.log('[stop-claw-router-test-processes] no-op on non-Windows platforms');
    return;
  }
  const processes = await listWindowsProcesses();
  const selected = selectStoppableProcesses(processes);
  await stopWindowsProcesses(selected, { dryRun: settings.dryRun });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[stop-claw-router-test-processes] ${error.message}`);
    process.exit(1);
  });
}

export {
  parseArgs,
  pathIsUnderRustTestOutput,
  selectStoppableProcesses,
};
