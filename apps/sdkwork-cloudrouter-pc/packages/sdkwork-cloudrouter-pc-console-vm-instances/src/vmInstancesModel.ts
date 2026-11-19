import type {
  CreateSandboxInstanceInput,
  SandboxInstance,
  SandboxInstancePageInfo,
  SandboxInstanceProfile,
  SandboxInstanceState,
  SandboxIsolationAssurance,
  SandboxRuntimeCapability,
  UpdateSandboxInstanceInput,
} from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';
import { SANDBOX_INSTANCE_PROFILES } from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';

/**
 * Pure VM instance console logic.
 *
 * Everything the page decides without rendering lives here: the profile
 * envelopes it validates against, the draft/command mapping, and the two
 * timestamp conversions. Keeping it free of React is what makes the rules
 * testable in isolation — and it matters here because these are *echoes* of the
 * sandbox service rules, not rules of their own.
 *
 * The echo is deliberate and one-directional: the page validates so it can fail
 * before a round trip, but the server is the authority and its verdict is what
 * the page reports. Wherever a bound appears twice (here and in
 * `sdkwork-sandbox`'s instance model) the service constant is the source and
 * this file restates it, so a divergence is a bug in this file rather than a
 * rule the server silently disagrees with.
 */

/** Per-profile ceiling, mirroring `SandboxInstanceProfile::bounds`. */
export interface VmInstanceResourceBounds {
  maxDiskMb: number;
  maxMemoryMb: number;
  maxVcpuCount: number;
}

/**
 * The three envelopes, verbatim from the service:
 *
 *   standard          8 vCPU /  16 384 MiB / 102 400 MiB
 *   memory_optimized 16 vCPU / 262 144 MiB / 204 800 MiB
 *   compute_optimized 64 vCPU / 65 536 MiB / 1 048 576 MiB
 */
export const VM_INSTANCE_PROFILE_BOUNDS: Readonly<Record<SandboxInstanceProfile, VmInstanceResourceBounds>> = {
  standard: { maxDiskMb: 102_400, maxMemoryMb: 16_384, maxVcpuCount: 8 },
  memory_optimized: { maxDiskMb: 204_800, maxMemoryMb: 262_144, maxVcpuCount: 16 },
  compute_optimized: { maxDiskMb: 1_048_576, maxMemoryMb: 65_536, maxVcpuCount: 64 },
};

/** Absolute column bounds, mirroring the `MIN_*` / `MAX_*` service constants. */
export const VM_INSTANCE_LIMITS = {
  baseImageMaxLength: 256,
  capabilitiesMax: 32,
  diskMaxMb: 1_048_576,
  diskMinMb: 1_024,
  memoryMaxMb: 262_144,
  memoryMinMb: 256,
  nameMaxLength: 128,
  vcpuMaxCount: 64,
  vcpuMinCount: 1,
} as const;

/** Defaults a fresh provisioning draft starts from: the smallest standard shape. */
export const VM_INSTANCE_DEFAULT_PROFILE: SandboxInstanceProfile = 'standard';
export const VM_INSTANCE_DEFAULT_ASSURANCE: SandboxIsolationAssurance = 'container';
export const VM_INSTANCE_DEFAULT_BASE_IMAGE = 'sdkwork/sandbox-runtime:latest';

/** Page sizes offered by the listing. The server clamps `page_size` to 1..200. */
export const VM_INSTANCE_PAGE_SIZES = [20, 50, 100] as const;

/** Canonical order the capability pickers render in. */
export const VM_INSTANCE_CAPABILITY_ORDER: readonly SandboxRuntimeCapability[] = [
  'terminal',
  'filesystem',
  'git',
  'build',
  'browser',
  'port_forward',
  'mcp_transport',
  'environment',
];

/** Canonical order of the profile picker. */
export const VM_INSTANCE_PROFILE_ORDER: readonly SandboxInstanceProfile[] = SANDBOX_INSTANCE_PROFILES;

export function vmInstanceProfileBounds(profile: SandboxInstanceProfile): VmInstanceResourceBounds {
  return VM_INSTANCE_PROFILE_BOUNDS[profile];
}

/**
 * True when the instance may be deleted (`is_deletable`).
 *
 * A live (`active`) instance is deliberately not deletable: it must be suspended
 * or terminated first, so one DELETE cannot drop a running runtime out from under
 * its owner. The page therefore disables the action instead of letting the server
 * answer 409.
 */
export function isVmInstanceDeletable(state: SandboxInstanceState): boolean {
  return state !== 'active';
}

/**
 * `totalItems` is an `int64` wire string. The pager's `rowCount` is a `number`,
 * so an out-of-range total is clamped to `Number.MAX_SAFE_INTEGER` instead of
 * being silently rounded (which would display a wrong count).
 */
export function vmInstanceTotalItems(pageInfo: SandboxInstancePageInfo | undefined): number {
  const raw = pageInfo?.totalItems;
  if (typeof raw !== 'string' || !/^(0|[1-9]\d*)$/u.test(raw)) return 0;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return Number.MAX_SAFE_INTEGER;
  return parsed;
}

/**
 * `datetime-local` value (local wall clock, `YYYY-MM-DDTHH:mm`) to the exact
 * RFC 3339 UTC shape the server accepts.
 *
 * The service accepts only `YYYY-MM-DDTHH:MM:SSZ` or `YYYY-MM-DDTHH:MM:SS.fffZ`,
 * and `Date.prototype.toISOString` always emits the millisecond form, so this is
 * the one conversion that satisfies it. An unparsable value returns `undefined`
 * rather than an invalid string: the caller then omits the field entirely.
 */
export function toVmInstanceExpiresAtUtc(localValue: string): string | undefined {
  const trimmed = localValue.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/**
 * RFC 3339 UTC timestamp back to a `datetime-local` value, rendered in the
 * browser's zone so the operator edits the wall clock they actually booked.
 */
export function toVmInstanceExpiresAtLocal(utcValue: string | undefined): string {
  if (!utcValue) return '';
  const parsed = new Date(utcValue);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
    + `T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/**
 * Editable provisioning draft.
 *
 * Numbers are held as strings because that is what a text field carries: parsing
 * them at the edge is what lets an empty box mean "not filled in" instead of
 * silently becoming `0`.
 */
export interface VmInstanceDraft {
  baseImage: string;
  diskMb: string;
  expiresAtLocal: string;
  memoryMb: string;
  name: string;
  profile: SandboxInstanceProfile;
  requiredCapabilities: readonly SandboxRuntimeCapability[];
  assurance: SandboxIsolationAssurance;
  autoStart: boolean;
  vcpuCount: string;
  workspaceId: string;
}

export function createVmInstanceDraft(overrides: Partial<VmInstanceDraft> = {}): VmInstanceDraft {
  return {
    baseImage: VM_INSTANCE_DEFAULT_BASE_IMAGE,
    diskMb: '20480',
    expiresAtLocal: '',
    memoryMb: '4096',
    name: '',
    profile: VM_INSTANCE_DEFAULT_PROFILE,
    requiredCapabilities: [],
    assurance: VM_INSTANCE_DEFAULT_ASSURANCE,
    autoStart: false,
    vcpuCount: '2',
    workspaceId: '',
    ...overrides,
  };
}

/** Draft seeded from an existing row, for the edit dialog. */
export function vmInstanceDraftFromInstance(instance: SandboxInstance): VmInstanceDraft {
  return {
    baseImage: instance.sandboxInstanceBaseImage,
    diskMb: String(instance.sandboxInstanceDiskMb),
    expiresAtLocal: toVmInstanceExpiresAtLocal(instance.sandboxInstanceExpiresAt),
    memoryMb: String(instance.sandboxInstanceMemoryMb),
    name: instance.sandboxInstanceName,
    profile: instance.sandboxInstanceProfile,
    requiredCapabilities: [...instance.sandboxInstanceRequiredCapabilities],
    assurance: instance.sandboxInstanceMinimumAssurance,
    autoStart: instance.sandboxInstanceAutoStart,
    vcpuCount: String(instance.sandboxInstanceVcpuCount),
    workspaceId: instance.sandboxWorkspaceId ?? '',
  };
}

/** Fields a draft can be rejected on. Keys double as the DOM field ids. */
export type VmInstanceDraftField =
  | 'baseImage'
  | 'diskMb'
  | 'expiresAtLocal'
  | 'memoryMb'
  | 'name'
  | 'vcpuCount';

/** Bare validation codes; the view maps each to a localized message. */
export type VmInstanceValidationCode =
  | 'baseImage.required'
  | 'baseImage.tooLong'
  | 'disk.notANumber'
  | 'disk.outOfProfile'
  | 'expiresAt.invalid'
  | 'memory.notANumber'
  | 'memory.outOfProfile'
  | 'name.required'
  | 'name.tooLong'
  | 'vcpu.notANumber'
  | 'vcpu.outOfProfile';

export type VmInstanceDraftErrors = Partial<Record<VmInstanceDraftField, VmInstanceValidationCode>>;

function parseCount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

/**
 * Validates a draft against the same rules the service enforces.
 *
 * `requireBaseImage` is false on update: `PATCH` cannot change the base image, so
 * a draft carried over from a row that somehow lost it must not block an edit of
 * the fields that *are* mutable.
 */
export function validateVmInstanceDraft(
  draft: VmInstanceDraft,
  { requireBaseImage }: { requireBaseImage: boolean },
): VmInstanceDraftErrors {
  const errors: VmInstanceDraftErrors = {};
  if (!draft.name.trim()) {
    errors.name = 'name.required';
  } else if (draft.name.length > VM_INSTANCE_LIMITS.nameMaxLength) {
    errors.name = 'name.tooLong';
  }

  if (requireBaseImage) {
    const baseImage = draft.baseImage.trim();
    if (!baseImage) {
      errors.baseImage = 'baseImage.required';
    } else if (draft.baseImage.length > VM_INSTANCE_LIMITS.baseImageMaxLength) {
      errors.baseImage = 'baseImage.tooLong';
    }
  }

  const bounds = vmInstanceProfileBounds(draft.profile);
  const vcpu = parseCount(draft.vcpuCount);
  if (vcpu === undefined) {
    errors.vcpuCount = 'vcpu.notANumber';
  } else if (vcpu < VM_INSTANCE_LIMITS.vcpuMinCount || vcpu > bounds.maxVcpuCount) {
    errors.vcpuCount = 'vcpu.outOfProfile';
  }

  const memory = parseCount(draft.memoryMb);
  if (memory === undefined) {
    errors.memoryMb = 'memory.notANumber';
  } else if (memory < VM_INSTANCE_LIMITS.memoryMinMb || memory > bounds.maxMemoryMb) {
    errors.memoryMb = 'memory.outOfProfile';
  }

  const disk = parseCount(draft.diskMb);
  if (disk === undefined) {
    errors.diskMb = 'disk.notANumber';
  } else if (disk < VM_INSTANCE_LIMITS.diskMinMb || disk > bounds.maxDiskMb) {
    errors.diskMb = 'disk.outOfProfile';
  }

  if (draft.expiresAtLocal.trim() && toVmInstanceExpiresAtUtc(draft.expiresAtLocal) === undefined) {
    errors.expiresAtLocal = 'expiresAt.invalid';
  }

  return errors;
}

/** The three numeric fields, or a throw if the draft was submitted unvalidated. */
function requireShape(draft: VmInstanceDraft): {
  diskMb: number;
  memoryMb: number;
  vcpuCount: number;
} {
  const vcpuCount = parseCount(draft.vcpuCount);
  const memoryMb = parseCount(draft.memoryMb);
  const diskMb = parseCount(draft.diskMb);
  if (vcpuCount === undefined || memoryMb === undefined || diskMb === undefined) {
    throw new Error('vm instance draft is not valid: numeric fields are required');
  }
  return { diskMb, memoryMb, vcpuCount };
}

/**
 * Draft to `POST` body.
 *
 * The profile's ceilings are re-checked by `validateVmInstanceDraft` before this
 * is called, not here: switching profile after typing a large memory value is
 * exactly the sequence that would otherwise send `memory_optimized`'s
 * 262 144 MiB with `standard`. Clamping is wrong (it would provision a shape
 * nobody asked for), so an unvalidated draft throws instead.
 */
export function toCreateSandboxInstanceInput(draft: VmInstanceDraft): CreateSandboxInstanceInput {
  const { diskMb, memoryMb, vcpuCount } = requireShape(draft);
  const expiresAt = toVmInstanceExpiresAtUtc(draft.expiresAtLocal);
  const workspaceId = draft.workspaceId.trim();
  return {
    sandboxInstanceAutoStart: draft.autoStart,
    sandboxInstanceBaseImage: draft.baseImage.trim(),
    sandboxInstanceDiskMb: diskMb,
    ...(expiresAt !== undefined ? { sandboxInstanceExpiresAt: expiresAt } : {}),
    sandboxInstanceMemoryMb: memoryMb,
    sandboxInstanceMinimumAssurance: draft.assurance,
    sandboxInstanceName: draft.name.trim(),
    sandboxInstanceProfile: draft.profile,
    sandboxInstanceRequiredCapabilities: [...draft.requiredCapabilities],
    sandboxInstanceVcpuCount: vcpuCount,
    ...(workspaceId ? { sandboxWorkspaceId: workspaceId } : {}),
  };
}

/**
 * Draft to `PATCH` body.
 *
 * Disk is restated rather than omitted because the edit dialog always shows the
 * row's stored value and lets it be changed — `sandboxInstanceDiskMb` is optional
 * on the wire, but silently dropping an edited field would make the control a lie.
 *
 * `expiresAtLocal` is three-way, like the wire: an empty box clears the expiry
 * (`null`), a timestamp sets it.
 */
export function toUpdateSandboxInstanceInput(draft: VmInstanceDraft): UpdateSandboxInstanceInput {
  const { diskMb, memoryMb, vcpuCount } = requireShape(draft);
  const expiresAt = toVmInstanceExpiresAtUtc(draft.expiresAtLocal);
  const workspaceId = draft.workspaceId.trim();
  return {
    sandboxInstanceAutoStart: draft.autoStart,
    sandboxInstanceDiskMb: diskMb,
    sandboxInstanceExpiresAt: expiresAt ?? null,
    sandboxInstanceMemoryMb: memoryMb,
    sandboxInstanceName: draft.name.trim(),
    sandboxInstanceProfile: draft.profile,
    sandboxInstanceVcpuCount: vcpuCount,
    ...(workspaceId ? { sandboxWorkspaceId: workspaceId } : {}),
  };
}

/** Toggles one capability, preserving the canonical vocabulary order. */
export function toggleVmInstanceCapability(
  current: readonly SandboxRuntimeCapability[],
  capability: SandboxRuntimeCapability,
): readonly SandboxRuntimeCapability[] {
  const next = new Set(current);
  if (next.has(capability)) {
    next.delete(capability);
  } else {
    next.add(capability);
  }
  return VM_INSTANCE_CAPABILITY_ORDER.filter((candidate) => next.has(candidate));
}
