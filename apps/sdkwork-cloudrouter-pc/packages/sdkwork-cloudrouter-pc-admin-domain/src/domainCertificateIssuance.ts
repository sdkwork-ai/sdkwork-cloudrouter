/**
 * Pure model of the certificate issuance flow.
 *
 * Everything an operator sees after pressing "签发证书" is a deterministic
 * projection of the deployments certificate contract plus the panel's own
 * small state machine. Keeping the projection here — instead of inside the
 * React tree — means the parts that can be wrong are testable without a DOM:
 *
 * * which mode/validation pairs are legal (a wildcard always needs DNS-01,
 *   HTTP-01 is never operator-addressable),
 * * how a typed hostname is canonicalized into the `requestedIdentifiers` wire
 *   shape,
 * * how a manual DNS-01 challenge becomes the row an operator pastes into their
 *   DNS provider,
 * * when polling stops, and how the archive state may be claimed.
 *
 * The module never claims a fact the server did not send: an archive is only
 * ever "archived" when `archiveStatus === 'ARCHIVED'`, and the TXT owner is only
 * ever presented as such when the server supplied `recordName`.
 */

import type {
  DomainCertificate,
  DomainCertificateArchiveStatus,
  DomainCertificateChallengePresentation,
  DomainCertificatePresentationMode,
  DomainCertificateScope,
  DomainCertificateValidationMethod,
  DomainHostname,
} from './domainTypes';
import type { DomainTone } from './components/domainUi';

// ---- Wire vocabulary -------------------------------------------------------

/** Who publishes the ACME challenge response. */
export const CERTIFICATE_PRESENTATION_MODES: readonly DomainCertificatePresentationMode[] = [
  'MANAGED',
  'MANUAL',
];

/** The wire enum, defaulted the way the deployments contract defaults it. */
export function normalizePresentationMode(
  mode: DomainCertificatePresentationMode | undefined,
): DomainCertificatePresentationMode {
  return mode === 'MANUAL' ? 'MANUAL' : 'MANAGED';
}

/** Closed set of archive statuses, used to narrow unmodelled wire strings. */
export const CERTIFICATE_ARCHIVE_STATUSES: readonly DomainCertificateArchiveStatus[] = [
  'PENDING',
  'STORING',
  'ARCHIVED',
  'FAILED',
  'SKIPPED',
];

/** Narrows an unmodelled string (older server, vendor value) without a cast. */
export function parseArchiveStatus(value: string | undefined): DomainCertificateArchiveStatus | undefined {
  if (!value) {
    return undefined;
  }
  return CERTIFICATE_ARCHIVE_STATUSES.find((candidate) => candidate === value);
}

/** Statuses after which polling a certificate can never learn anything new. */
const TERMINAL_CERTIFICATE_STATUSES: readonly DomainCertificate['status'][] = [
  'ACTIVE',
  'EXPIRED',
  'FAILED',
  'REVOKED',
];

/** Manual-challenge states that still wait on the operator. */
const OPERATOR_ACTION_CHALLENGE_STATUSES: readonly string[] = ['PENDING', 'PROCESSING'];

// ---- Mode / scope / validation consistency --------------------------------

export interface CertificateModeState {
  presentationMode: DomainCertificatePresentationMode;
  validationMethod: DomainCertificateValidationMethod;
  certificateScope: DomainCertificateScope;
}

/** Single-domain challenges can be served over HTTP-01; a wildcard cannot. */
export function isValidationMethodSelectable(
  scope: DomainCertificateScope,
  method: DomainCertificateValidationMethod,
): boolean {
  return scope !== 'WILDCARD' || method === 'DNS_01';
}

export function isPresentationModeSelectable(
  mode: DomainCertificatePresentationMode,
  intent: { certificateSource: DomainCertificate['certificateSource'] },
): boolean {
  // Both modes are legal for a managed certificate. An imported certificate is
  // read-only here and never reaches this dialog; the guard is expressed so the
  // rule is explicit rather than implied by the caller.
  return intent.certificateSource === 'MANAGED' && CERTIFICATE_PRESENTATION_MODES.includes(mode);
}

/**
 * Resolves the fields that a mode/scope combination forces, so the dialog and
 * the request builder cannot disagree.
 *
 * * `MANUAL` always proves the name through DNS-01: the only operator-addressable
 *   proof is a TXT record they publish themselves.
 * * `WILDCARD` always validates through DNS-01, in both modes, for the same
 *   reason the contract gives: HTTP-01 cannot prove a wildcard.
 */
export function reconcileCertificateMode(state: CertificateModeState): CertificateModeState {
  const validationMethod: DomainCertificateValidationMethod =
    state.presentationMode === 'MANUAL' || state.certificateScope === 'WILDCARD'
      ? 'DNS_01'
      : state.validationMethod;
  return {
    presentationMode: state.presentationMode,
    validationMethod,
    certificateScope: state.certificateScope,
  };
}

/** The validation-method options a mode/scope allows, in display order. */
export function certificateValidationMethodOptions(
  state: { presentationMode: DomainCertificatePresentationMode; certificateScope: DomainCertificateScope },
): readonly { method: DomainCertificateValidationMethod; enabled: boolean; forced: boolean }[] {
  const options: DomainCertificateValidationMethod[] = ['AUTO', 'HTTP_01', 'DNS_01'];
  return options.map((method) => ({
    method,
    enabled: isValidationMethodSelectable(state.certificateScope, method),
    forced: state.presentationMode === 'MANUAL' || state.certificateScope === 'WILDCARD',
  }));
}

// ---- Typed hostname chips -------------------------------------------------

const CHIP_SEPARATORS = /[\s,;\uFF0C\u3001]+/u;
const LABEL_PATTERN = /^[a-z0-9\u00a1-\uffff](?:[a-z0-9\u00a1-\uffff-]{0,61}[a-z0-9\u00a1-\uffff])?$/u;

/**
 * Canonical certificate identifier: lower-case, no trailing dot, and the
 * wildcard marker normalized to exactly one leading label.
 *
 * A single leading `*.` is preserved because a wildcard SAN is a legal
 * identifier; any other `*` makes the name invalid rather than being "repaired",
 * since a certificate for `a.*.example.com` is never what an operator means.
 */
export function normalizeCertificateIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const withoutDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
  return withoutDot.trim();
}

/**
 * Whether a normalized identifier is a syntactically plausible certificate SAN.
 *
 * * Fully-qualified: at least two labels, the last of them longer than one
 *   character.
 * * Wildcard only as the whole first label (`*.example.com`).
 * * RFC 1035 labels, `xn--` punycode allowed because it is just an ASCII label.
 * * No scheme, path, port, whitespace, or IP literal.
 */
export function isValidCertificateIdentifier(value: string): boolean {
  const candidate = normalizeCertificateIdentifier(value);
  if (candidate.length === 0 || candidate.length > 253) {
    return false;
  }
  if (candidate.includes('://') || /[/\\?#@:\s]/.test(candidate)) {
    return false;
  }
  const labels = candidate.split('.');
  if (labels.length < 2) {
    return false;
  }
  // A dotted-quad IPv4 literal has the shape of a four-label hostname, but a
  // numeric TLD is never a certificate SAN: `192.0.2.10` would otherwise pass
  // every other check and be refused only by the server.
  if (labels.every((label) => /^[0-9]+$/u.test(label))) {
    return false;
  }
  const [first, ...rest] = labels;
  const head = first === '*' ? rest[0] : first;
  const tail = first === '*' ? rest.slice(1) : rest;
  if (head === undefined || rest.length === 0) {
    return false;
  }
  if (!tail.every((label) => LABEL_PATTERN.test(label))) {
    return false;
  }
  // Only the whole first label may be a wildcard: a partially wildcarded label
  // (`*.` inside `*.*.example.com`'s remainder) is not a legal SAN (RFC 6125 §6.4.3).
  if (first !== '*' && !LABEL_PATTERN.test(head)) {
    return false;
  }
  const tld = labels[labels.length - 1] ?? '';
  return tld.length >= 2 && !tld.includes('*') && !head.includes('*');
}

/** Whether an identifier asks for a wildcard SAN. */
export function isWildcardCertificateIdentifier(value: string): boolean {
  return normalizeCertificateIdentifier(value).startsWith('*.');
}

export type CertificateIdentifierRejection = 'empty' | 'invalid' | 'duplicate';

export interface CertificateIdentifierAddResult {
  identifiers: string[];
  added?: string;
  rejection?: CertificateIdentifierRejection;
}

/**
 * Adds zero or more pasted identifiers to the chip list.
 *
 * Paste is the normal path here (a DNS provider console or an email gives a
 * comma- or newline-separated list), so one call accepts everything a single
 * input event produced: it dedupes case-insensitively, keeps the first spelling,
 * and reports the first rejection so the operator learns why nothing appeared.
 */
export function addCertificateIdentifiers(
  current: readonly string[],
  raw: string,
): CertificateIdentifierAddResult {
  const identifiers = [...current];
  const seen = new Set(identifiers.map((entry) => entry.toLowerCase()));
  const tokens = raw.split(CHIP_SEPARATORS).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { identifiers, rejection: 'empty' };
  }
  let added: string | undefined;
  let rejection: CertificateIdentifierRejection | undefined;
  for (const token of tokens) {
    const normalized = normalizeCertificateIdentifier(token);
    if (!isValidCertificateIdentifier(normalized)) {
      rejection = 'invalid';
      continue;
    }
    if (seen.has(normalized)) {
      rejection = rejection ?? 'duplicate';
      continue;
    }
    seen.add(normalized);
    identifiers.push(normalized);
    added = added ?? normalized;
  }
  return {
    identifiers,
    ...(added === undefined ? {} : { added }),
    ...(rejection === undefined ? {} : { rejection }),
  };
}

export function removeCertificateIdentifier(current: readonly string[], value: string): string[] {
  const target = normalizeCertificateIdentifier(value);
  return current.filter((entry) => normalizeCertificateIdentifier(entry) !== target);
}

/**
 * Verified hostnames of the loaded zones that match a keyword, as picker
 * suggestions. Unverified names are returned with `verified: false` so the
 * picker can show them disabled with a reason instead of hiding them.
 */
export interface CertificateHostnameSuggestion {
  hostname: string;
  zoneId: string;
  verified: boolean;
  hostnameType: DomainHostname['hostnameType'];
}

export function certificateHostnameSuggestions(
  groups: readonly { zoneId: string; hostnames: readonly DomainHostname[] }[],
  options: { keyword?: string; selected?: readonly string[] } = {},
): CertificateHostnameSuggestion[] {
  const keyword = (options.keyword ?? '').trim().toLowerCase();
  const selected = new Set((options.selected ?? []).map((entry) => entry.toLowerCase()));
  const suggestions: CertificateHostnameSuggestion[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const hostname of group.hostnames) {
      const key = hostname.hostname.toLowerCase();
      if (seen.has(key) || selected.has(key)) {
        continue;
      }
      if (keyword.length > 0 && !key.includes(keyword)) {
        continue;
      }
      seen.add(key);
      suggestions.push({
        hostname: hostname.hostname,
        zoneId: group.zoneId,
        verified: hostname.verificationStatus === 'VERIFIED',
        hostnameType: hostname.hostnameType,
      });
    }
  }
  return suggestions.sort((left, right) => {
    if (left.verified !== right.verified) {
      return left.verified ? -1 : 1;
    }
    return left.hostname.localeCompare(right.hostname);
  });
}

// ---- Automatic / manual progress -----------------------------------------

export interface CertificatePollStopInput {
  attempt: number;
  maxAttempts: number;
  status: DomainCertificate['status'] | undefined;
  /** `true` while a manual order waits for the operator to publish its TXT. */
  awaitingOperator: boolean;
  documentHidden: boolean;
  aborted: boolean;
}

export interface CertificatePollStopDecision {
  stop: boolean;
  reason?: 'terminal' | 'awaitingOperator' | 'exhausted' | 'hidden' | 'aborted';
}

/**
 * Whether the issuance poll should stop instead of scheduling another attempt.
 *
 * Bounded by `maxAttempts`, paused while the tab is hidden (a background tab
 * polling a CA-backed endpoint spends the tenant's rate budget for nobody), and
 * stopped the moment the certificate reaches a status that cannot improve.
 */
export function certificatePollStop(input: CertificatePollStopInput): CertificatePollStopDecision {
  if (input.aborted) {
    return { stop: true, reason: 'aborted' };
  }
  if (input.documentHidden) {
    return { stop: true, reason: 'hidden' };
  }
  if (input.status !== undefined && TERMINAL_CERTIFICATE_STATUSES.includes(input.status)) {
    return { stop: true, reason: 'terminal' };
  }
  if (input.awaitingOperator) {
    return { stop: true, reason: 'awaitingOperator' };
  }
  if (input.attempt >= input.maxAttempts) {
    return { stop: true, reason: 'exhausted' };
  }
  return { stop: false };
}

/** A certificate is only "done" for this dialog once it serves a leaf. */
export function isCertificateServing(status: DomainCertificate['status'] | undefined): boolean {
  return status === 'ACTIVE';
}

export function isCertificateIssuanceFailure(
  status: DomainCertificate['status'] | undefined,
): boolean {
  return status === 'FAILED' || status === 'REVOKED';
}

export function shouldAwaitManualChallenge(
  presentation: DomainCertificateChallengePresentation | undefined,
  status: DomainCertificate['status'] | undefined,
): boolean {
  if (!presentation) {
    return false;
  }
  if (normalizePresentationMode(parsePresentationMode(presentation.presentationMode)) !== 'MANUAL') {
    return false;
  }
  if (presentation.presentationReleased === true) {
    return false;
  }
  if (status !== undefined && TERMINAL_CERTIFICATE_STATUSES.includes(status)) {
    return false;
  }
  return presentation.items.length > 0;
}

/** Narrows the wire string to the closed presentation set without a cast. */
export function parsePresentationMode(
  value: string | undefined,
): DomainCertificatePresentationMode | undefined {
  if (!value) {
    return undefined;
  }
  return CERTIFICATE_PRESENTATION_MODES.find((candidate) => candidate === value);
}

/** Per-identifier status from the challenge list, keyed by lower-case identifier. */
export function challengeStatusByIdentifier(
  presentation: DomainCertificateChallengePresentation | undefined,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (const item of presentation?.items ?? []) {
    result.set(item.identifier.toLowerCase(), item.status);
  }
  return result;
}

export function challengeNeedsOperatorAction(status: string | undefined): boolean {
  if (status === undefined) {
    return true;
  }
  return OPERATOR_ACTION_CHALLENGE_STATUSES.includes(status);
}

export type ManualChallengeActionState = 'pending' | 'invalid' | 'valid';

/** A wildcard and its apex release together, so one pending or invalid row wins. */
export function manualChallengeActionState(rows: readonly ManualTxtRecordRow[]): ManualChallengeActionState {
  if (rows.length === 0) {
    return 'pending';
  }
  if (rows.some((row) => row.status === 'INVALID' || row.status === 'EXPIRED' || row.status === 'FAILED')) {
    return 'invalid';
  }
  return rows.some((row) => challengeNeedsOperatorAction(row.status)) ? 'pending' : 'valid';
}

// ---- Manual DNS-01 TXT rows ----------------------------------------------

export interface ManualTxtRecordRow {
  /** The certificate identifier this record proves. */
  identifier: string;
  /** The TXT owner exactly as the server sent it. */
  recordName: string;
  recordType: 'TXT';
  /** The ACME proof exactly as the server sent it — never trimmed or cased. */
  recordValue: string;
  /**
   * The owner relative to the zone apex, for providers whose "host" field is
   * apex-relative (`_acme-challenge` instead of `_acme-challenge.example.com`).
   */
  relativeRecordName?: string;
  expiresAt?: string;
  status: string;
  /** Lower-case `identifier|recordName|recordValue`, stable across polls. */
  key: string;
  /** The line an operator can paste into a provider's bulk-import box. */
  copyPayload: string;
}

function apexCandidates(apexHostname: string | undefined): string[] {
  if (!apexHostname) {
    return [];
  }
  const apex = normalizeCertificateIdentifier(apexHostname);
  const wildcardStripped = apex.startsWith('*.') ? apex.slice(2) : apex;
  return [wildcardStripped, apex];
}

/** The TXT owner relative to `apex`, or `undefined` when it is outside the zone. */
export function relativeRecordName(
  recordName: string | undefined,
  apexHostname: string | undefined,
): string | undefined {
  if (!recordName) {
    return undefined;
  }
  const owner = normalizeCertificateIdentifier(recordName);
  for (const apex of apexCandidates(apexHostname)) {
    if (owner === apex) {
      return '@';
    }
    if (owner.endsWith(`.${apex}`)) {
      return owner.slice(0, -(apex.length + 1));
    }
  }
  return undefined;
}

/**
 * Builds one row per challenge that still needs an operator.
 *
 * A challenge without a `recordValue` is not a paste-able record and is dropped
 * rather than rendered as an empty monospace box — the operator would copy
 * nothing and believe the record was published.
 */
export function buildManualTxtRows(
  presentation: DomainCertificateChallengePresentation | undefined,
  options: { apexHostname?: string } = {},
): ManualTxtRecordRow[] {
  const rows: ManualTxtRecordRow[] = [];
  for (const item of presentation?.items ?? []) {
    const recordValue = item.recordValue ?? '';
    const recordName = item.recordName ?? '';
    if (recordValue.trim().length === 0 || recordName.trim().length === 0) {
      continue;
    }
    const relative = relativeRecordName(recordName, options.apexHostname);
    const copyPayload =
      relative === undefined
        ? `TXT ${recordName} "${recordValue}"`
        : `TXT ${relative} "${recordValue}"`;
    rows.push({
      identifier: item.identifier,
      recordName,
      recordType: 'TXT',
      recordValue,
      ...(relative === undefined ? {} : { relativeRecordName: relative }),
      ...(item.expiresAt === undefined ? {} : { expiresAt: item.expiresAt }),
      status: item.status,
      key: `${item.identifier.toLowerCase()}|${recordName.toLowerCase()}|${recordValue}`,
      copyPayload,
    });
  }
  return rows;
}

/** Everything on one clipboard payload, one record per line. */
export function manualTxtCopyAllPayload(rows: readonly ManualTxtRecordRow[]): string {
  return rows.map((row) => row.copyPayload).join('\n');
}

/** A single record's value as it must appear in a TXT record: verbatim. */
export function manualTxtValuePayload(row: ManualTxtRecordRow): string {
  return row.recordValue;
}

/**
 * Seconds until a presentation expires, floored at zero, or `undefined` when the
 * server sent no deadline or sent an unparseable one.
 */
export function presentationSecondsRemaining(
  expiresAt: string | undefined,
  now: number,
): number | undefined {
  if (!expiresAt) {
    return undefined;
  }
  const timestamp = Date.parse(expiresAt);
  if (!Number.isFinite(timestamp)) {
    return undefined;
  }
  return Math.max(0, Math.floor((timestamp - now) / 1000));
}

/** `mm:ss` under an hour, `h:mm:ss` above it: the shape of a countdown chip. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

// ---- Archive state -------------------------------------------------------

export type CertificateArchiveState =
  | { kind: 'archived'; spaceId?: string; folderNodeId?: string }
  | { kind: 'storing' }
  | { kind: 'pending' }
  | { kind: 'failed'; retryable: true }
  | { kind: 'skipped'; reason: string | undefined }
  | { kind: 'unknown' };

/**
 * The archive state the UI may show.
 *
 * The single most important rule in this module: `archived` is produced only by
 * `archiveStatus === 'ARCHIVED'`. A `PENDING` row with ids present is still
 * pending, because the server has not finished storing the leaf.
 */
/** Fields the archive projection reads; `Partial` because the SDK may omit them. */
export type ArchiveField =
  | 'archiveStatus'
  | 'archiveSpaceId'
  | 'archiveFolderNodeId';

/**
 * Anything the archive projection may be pointed at.
 *
 * `Partial<...>` alone cannot describe a real `CertificateResponse`: every
 * other generated member is present, and TypeScript refuses to pass a generated
 * row where only the three archive members are acceptable. Accepting the whole
 * generated row as well keeps the projection usable on live rows while still
 * allowing a synthetic `{ archiveStatus: 'FAILED' }` in a test.
 */
type CertificateResponseLike = Partial<Record<ArchiveField, string | undefined>>;
type CertificateResponseRow = Pick<DomainCertificate, ArchiveField>;

/** The subset of a certificate row the archive projection reads. */
export type CertificateArchiveSource = CertificateResponseLike | CertificateResponseRow;

/** Admin route of the tenant drive space, deep-linked by id. */
export function driveSpaceHref(spaceId: string): string {
  return `/admin/drive/spaces/${encodeURIComponent(spaceId)}`;
}

export function certificateArchiveState(certificate: CertificateArchiveSource): CertificateArchiveState {
  const status = parseArchiveStatus(certificate.archiveStatus);
  const spaceId = certificate.archiveSpaceId;
  const folderNodeId = certificate.archiveFolderNodeId;
  switch (status) {
    case 'ARCHIVED':
      return {
        kind: 'archived',
        ...(spaceId ? { spaceId } : {}),
        ...(folderNodeId ? { folderNodeId } : {}),
      };
    case 'STORING':
      return { kind: 'storing' };
    case 'PENDING':
      return { kind: 'pending' };
    case 'FAILED':
      return { kind: 'failed', retryable: true };
    case 'SKIPPED':
      return { kind: 'skipped', reason: undefined };
    default:
      // An older server that does not send the field at all, or a value this
      // client does not model: say nothing rather than guess "archived".
      return { kind: 'unknown' };
  }
}

export function certificateArchiveTone(state: CertificateArchiveState): DomainTone {
  switch (state.kind) {
    case 'archived':
      return 'success';
    case 'failed':
      return 'danger';
    case 'storing':
    case 'pending':
      return 'info';
    case 'skipped':
      return 'neutral';
    default:
      return 'neutral';
  }
}

// ---- Certificate summary -------------------------------------------------

/** Issuer, validity window, and SAN list of the issued certificate, as text. */
export interface CertificateSummaryModel {
  issuer: string | undefined;
  notBefore: string | undefined;
  notAfter: string | undefined;
  identifiers: readonly string[];
  serialNumber: string | undefined;
}

export function certificateSummaryModel(
  certificate: DomainCertificate,
): CertificateSummaryModel {
  return {
    issuer: certificate.issuer,
    notBefore: certificate.notBefore,
    notAfter: certificate.notAfter,
    identifiers: certificate.identifiers,
    serialNumber: undefined,
  };
}
