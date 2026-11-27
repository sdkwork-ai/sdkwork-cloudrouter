import { describe, expect, test } from 'vitest';

import type { SandboxInstance } from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';

import {
  VM_INSTANCE_LIMITS,
  VM_INSTANCE_PAGE_SIZES,
  VM_INSTANCE_PROFILE_BOUNDS,
  createVmInstanceDraft,
  isVmInstanceDeletable,
  toCreateSandboxInstanceInput,
  toUpdateSandboxInstanceInput,
  toVmInstanceExpiresAtLocal,
  toVmInstanceExpiresAtUtc,
  toggleVmInstanceCapability,
  validateVmInstanceDraft,
  vmInstanceAssurancesForRuntimeKind,
  vmInstanceDraftFromInstance,
  vmInstanceRuntimeKindSatisfies,
  vmInstanceTotalItems,
} from './vmInstancesModel.ts';

function instance(overrides: Partial<SandboxInstance> = {}): SandboxInstance {
  return {
    sandboxInstanceId: 'sbi-1',
    sandboxInstanceOwnerId: 'user-1',
    sandboxInstanceName: 'agent-vm-01',
    sandboxInstanceState: 'suspended',
    sandboxInstanceProfile: 'standard',
    sandboxInstanceBaseImage: 'sdkwork/sandbox-runtime:latest',
    sandboxInstanceVcpuCount: 2,
    sandboxInstanceMemoryMb: 4096,
    sandboxInstanceDiskMb: 20480,
    sandboxInstanceRequiredCapabilities: ['git', 'terminal'],
    sandboxInstanceMinimumAssurance: 'container',
    sandboxInstanceRuntimeKind: 'docker',
    sandboxInstanceAutoStart: false,
    sandboxVersion: '7',
    ...overrides,
  };
}

describe('vm instance profile envelopes', () => {
  test('each profile mirrors the service ceilings', () => {
    expect(VM_INSTANCE_PROFILE_BOUNDS.standard).toEqual({
      maxDiskMb: 102_400,
      maxMemoryMb: 16_384,
      maxVcpuCount: 8,
    });
    expect(VM_INSTANCE_PROFILE_BOUNDS.memory_optimized.maxVcpuCount).toBe(16);
    expect(VM_INSTANCE_PROFILE_BOUNDS.compute_optimized.maxVcpuCount).toBe(64);
  });

  test('the page sizes stay inside the server clamp', () => {
    for (const size of VM_INSTANCE_PAGE_SIZES) {
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(200);
    }
  });
});

describe('vm instance draft validation', () => {
  test('a fresh draft is rejected only for its missing name', () => {
    const errors = validateVmInstanceDraft(createVmInstanceDraft(), { requireBaseImage: true });
    expect(errors).toEqual({ name: 'name.required' });
  });

  test('a complete standard draft is accepted', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ name: 'agent-vm-01' }),
      { requireBaseImage: true },
    );
    expect(errors).toEqual({});
  });

  test('memory above the selected profile ceiling is refused', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ memoryMb: '20000', name: 'agent-vm-01' }),
      { requireBaseImage: true },
    );
    expect(errors.memoryMb).toBe('memory.outOfProfile');
  });

  test('editing does not require the immutable base image', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ baseImage: '', name: 'agent-vm-01' }),
      { requireBaseImage: false },
    );
    expect(errors.baseImage).toBeUndefined();
  });

  test('a non-numeric shape is a shape error, not a clamp', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ name: 'agent-vm-01', vcpuCount: 'two' }),
      { requireBaseImage: true },
    );
    expect(errors.vcpuCount).toBe('vcpu.notANumber');
  });

  test('an unparsable expiry is refused', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ expiresAtLocal: 'not-a-date', name: 'agent-vm-01' }),
      { requireBaseImage: true },
    );
    expect(errors.expiresAtLocal).toBe('expiresAt.invalid');
  });

  test('the name bound is the service maximum', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ name: 'x'.repeat(VM_INSTANCE_LIMITS.nameMaxLength + 1) }),
      { requireBaseImage: true },
    );
    expect(errors.name).toBe('name.tooLong');
  });
});

describe('vm instance draft mapping', () => {
  test('the create body carries the validated shape and omits empty optionals', () => {
    const input = toCreateSandboxInstanceInput(
      createVmInstanceDraft({ name: '  agent-vm-01  ', requiredCapabilities: ['git', 'terminal'] }),
    );
    expect(input).toEqual({
      sandboxInstanceAutoStart: false,
      sandboxInstanceBaseImage: 'sdkwork/sandbox-runtime:latest',
      sandboxInstanceDiskMb: 20480,
      sandboxInstanceMemoryMb: 4096,
      sandboxInstanceMinimumAssurance: 'container',
    sandboxInstanceRuntimeKind: 'docker',
      sandboxInstanceName: 'agent-vm-01',
      sandboxInstanceProfile: 'standard',
      sandboxInstanceRequiredCapabilities: ['git', 'terminal'],
      sandboxInstanceVcpuCount: 2,
    });
  });

  test('a workspace id is sent only when it was entered', () => {
    const input = toCreateSandboxInstanceInput(
      createVmInstanceDraft({ name: 'agent-vm-01', workspaceId: 'ws_42' }),
    );
    expect(input.sandboxWorkspaceId).toBe('ws_42');
  });

  test('the update body clears an emptied expiry', () => {
    const input = toUpdateSandboxInstanceInput(
      createVmInstanceDraft({ name: 'agent-vm-01', expiresAtLocal: '' }),
    );
    expect(input.sandboxInstanceExpiresAt).toBeNull();
    expect(input.sandboxInstanceDiskMb).toBe(20480);
  });

  test('seeding the draft from a row round-trips the stored shape', () => {
    const draft = vmInstanceDraftFromInstance(
      instance({ sandboxInstanceExpiresAt: '2026-09-11T08:30:00.000Z' }),
    );
    expect(draft).toMatchObject({
      diskMb: '20480',
      memoryMb: '4096',
      name: 'agent-vm-01',
      profile: 'standard',
      requiredCapabilities: ['git', 'terminal'],
      vcpuCount: '2',
      workspaceId: '',
    });
    expect(draft.expiresAtLocal).not.toBe('');
  });
});

describe('vm instance expiry conversion', () => {
  test('local wall clock becomes the RFC 3339 UTC form the service accepts', () => {
    const utc = toVmInstanceExpiresAtUtc('2026-09-11T16:30');
    expect(utc).toBe(new Date('2026-09-11T16:30').toISOString());
    expect(utc).toMatch(/Z$/u);
  });

  test('an empty or unparsable value yields undefined', () => {
    expect(toVmInstanceExpiresAtUtc('   ')).toBeUndefined();
    expect(toVmInstanceExpiresAtUtc('nope')).toBeUndefined();
  });

  test('a UTC timestamp renders back as local datetime-local text', () => {
    const local = toVmInstanceExpiresAtLocal('2026-09-11T08:30:00.000Z');
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u);
    expect(toVmInstanceExpiresAtLocal(undefined)).toBe('');
    expect(toVmInstanceExpiresAtLocal('nope')).toBe('');
  });
});

describe('vm instance listing helpers', () => {
  test('int64 totals parse and clamp instead of rounding', () => {
    expect(vmInstanceTotalItems({ totalItems: '42' })).toBe(42);
    expect(vmInstanceTotalItems({ totalItems: '99999999999999999999' })).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(vmInstanceTotalItems({ totalItems: 'not-a-number' })).toBe(0);
    expect(vmInstanceTotalItems(undefined)).toBe(0);
  });

  test('a live instance is not deletable', () => {
    expect(isVmInstanceDeletable('active')).toBe(false);
    expect(isVmInstanceDeletable('suspended')).toBe(true);
    expect(isVmInstanceDeletable('terminated')).toBe(true);
    expect(isVmInstanceDeletable('failed')).toBe(true);
    expect(isVmInstanceDeletable('requested')).toBe(true);
  });

  test('toggling a capability keeps the canonical vocabulary order', () => {
    expect(toggleVmInstanceCapability(['git'], 'terminal')).toEqual(['terminal', 'git']);
    expect(toggleVmInstanceCapability(['terminal', 'git'], 'git')).toEqual(['terminal']);
  });

  // The engine/assurance matrix is a billing and security decision, so the page
  // must agree with the server on every pair rather than on a sample.
  test('an engine satisfies exactly the assurance tiers it can provide', () => {
    const ladder = ['host_user', 'container', 'user_space_kernel', 'micro_vm', 'dedicated_vm'] as const;
    const engineFloor: Record<string, string> = {
      sandbox: 'host_user',
      docker: 'container',
      gvisor: 'user_space_kernel',
      kata: 'micro_vm',
      firecracker: 'micro_vm',
      qemu: 'dedicated_vm',
    };
    for (const [engine, floor] of Object.entries(engineFloor)) {
      for (const assurance of ladder) {
        expect(
          `${engine}:${assurance}=${vmInstanceRuntimeKindSatisfies(engine as never, assurance)}`,
        ).toBe(`${engine}:${assurance}=${ladder.indexOf(assurance) <= ladder.indexOf(floor as never)}`);
      }
    }
  });

  test('docker cannot be sold as a microVM or dedicated VM', () => {
    expect(vmInstanceRuntimeKindSatisfies('docker', 'micro_vm')).toBe(false);
    expect(vmInstanceRuntimeKindSatisfies('docker', 'dedicated_vm')).toBe(false);
    expect(vmInstanceRuntimeKindSatisfies('docker', 'container')).toBe(true);
    expect(vmInstanceRuntimeKindSatisfies('qemu', 'dedicated_vm')).toBe(true);
    // A stronger engine may still serve a weaker request.
    expect(vmInstanceRuntimeKindSatisfies('qemu', 'container')).toBe(true);
  });

  test('the assurance picker narrows to the tiers the selected engine can serve', () => {
    expect(vmInstanceAssurancesForRuntimeKind('sandbox')).toEqual(['host_user']);
    expect(vmInstanceAssurancesForRuntimeKind('docker')).toEqual(['host_user', 'container']);
    expect(vmInstanceAssurancesForRuntimeKind('qemu')).toEqual([
      'host_user',
      'container',
      'user_space_kernel',
      'micro_vm',
      'dedicated_vm',
    ]);
  });

  test('an engine that cannot meet the draft assurance is rejected before submit', () => {
    const errors = validateVmInstanceDraft(
      createVmInstanceDraft({ assurance: 'dedicated_vm', name: 'agent-vm-01', runtimeKind: 'docker' }),
      { requireBaseImage: true },
    );
    expect(errors.runtimeKind).toBe('runtimeKind.insufficientAssurance');
  });

  test('the default draft is internally consistent and submits its engine', () => {
    const draft = createVmInstanceDraft({ name: 'agent-vm-01' });
    expect(validateVmInstanceDraft(draft, { requireBaseImage: true })).toEqual({});
    expect(toCreateSandboxInstanceInput(draft).sandboxInstanceRuntimeKind).toBe('docker');
  });
});
