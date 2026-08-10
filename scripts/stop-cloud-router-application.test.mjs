import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseStopArgs,
  selectWindowsListeningProcesses,
  stopWorkspaceProcesses,
  workspaceStopTargets,
} from './stop-cloud-router-application.mjs';

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

test('stop targets match the standalone development workspace default binds', () => {
  assert.deepEqual(
    workspaceStopTargets([]).map(({ name, bind }) => ({ name, bind })),
    [
      { name: 'server', bind: '0.0.0.0:3905' },
      { name: 'portal', bind: '127.0.0.1:3901' },
    ],
  );
});

test('stop command terminates every matching listener process tree', async () => {
  const expectedPorts = [...new Set(workspaceStopTargets([]).map((target) => target.port))]
    .sort((left, right) => Number(left) - Number(right))
    .map(String);
  const stopped = [];
  let listingCalls = 0;
  const result = await stopWorkspaceProcesses({
    platform: 'win32',
    listListeningProcesses: async (ports) => {
      assert.deepEqual(ports, expectedPorts);
      listingCalls += 1;
      return listingCalls === 1 ? [5512, 4180] : [];
    },
    stopProcess: async (processId) => stopped.push(processId),
  });

  assert.deepEqual(result.processIds, [5512, 4180]);
  assert.deepEqual(stopped, [5512, 4180]);
  assert.ok(listingCalls >= 2, 'post-stop verification should re-list listeners');
});

test('stop command reports listeners that remain occupied after stop', async () => {
  await assert.rejects(
    stopWorkspaceProcesses({
      platform: 'win32',
      listListeningProcesses: async () => [5512],
      stopProcess: async () => {},
      maxVerifyAttempts: 2,
      verifyWaitMs: 1,
    }),
    /workspace ports still occupied by PID\(s\): 5512/u,
  );
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
