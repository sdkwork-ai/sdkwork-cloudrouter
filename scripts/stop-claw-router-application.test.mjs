import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseStopArgs,
  selectWindowsListeningProcesses,
  stopWorkspaceProcesses,
} from './stop-claw-router-application.mjs';

test('stop arguments keep workspace topology options and consume stop options', () => {
  assert.deepEqual(
    parseStopArgs(['--dry-run', '--server-bind', '127.0.0.1:4900']),
    {
      dryRun: true,
      help: false,
      workspaceArgs: ['--server-bind', '127.0.0.1:4900'],
    },
  );
});

test('Windows listener selection only returns configured workspace ports', () => {
  const output = [
    '  TCP    0.0.0.0:3900           0.0.0.0:0              LISTENING       4180',
    '  TCP    127.0.0.1:3901         0.0.0.0:0              LISTENING       5512',
    '  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       7734',
    '  TCP    [::]:3900              [::]:0                 LISTENING       4180',
  ].join('\r\n');

  assert.deepEqual(selectWindowsListeningProcesses(output, ['3900', '3901']), [4180, 5512]);
});

test('stop command terminates every matching listener process tree', async () => {
  const stopped = [];
  const result = await stopWorkspaceProcesses({
    platform: 'win32',
    listListeningProcesses: async (ports) => {
      assert.deepEqual(ports, ['3900', '3901', '3902']);
      return [5512, 4180];
    },
    stopProcess: async (processId) => stopped.push(processId),
  });

  assert.deepEqual(result.processIds, [5512, 4180]);
  assert.deepEqual(stopped, [5512, 4180]);
});

test('stop command does not terminate unrelated processes when no workspace port is listening', async () => {
  let stopped = false;
  const result = await stopWorkspaceProcesses({
    platform: 'win32',
    listListeningProcesses: async () => [],
    stopProcess: async () => {
      stopped = true;
    },
  });

  assert.deepEqual(result.processIds, []);
  assert.equal(stopped, false);
});
