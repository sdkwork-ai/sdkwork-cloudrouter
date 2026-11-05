import { readRequiredApiItem, ensureSdkworkApiSuccess, readString } from './api-result.ts';
import { loadStoredAppSessionToken } from './app-session-token.ts';
import { readMediaResourceUrl } from './media-resource.ts';
import { hasStoredPortalSession, subscribePortalSessionChange } from './portal-auth.ts';
import { parseJwtPayload } from './session-jwt-claims.ts';
import { getSdkworkAppbaseAppSdkClient } from './sdk-clients.ts';
import { revokeAppSession } from './sessionService.ts';

const ACCOUNT_PROFILE_ERROR = 'The signed-in account profile could not be read.';
const ANONYMOUS_DISPLAY_NAME = 'Account';

/**
 * The signed-in identity the portal header renders.
 *
 * `signedIn` is the session truth, not a profile-fetch result: the chip appears
 * as soon as the stored IAM session is valid, and the display fields fill in
 * from the access-token claims first and the profile endpoint afterwards.
 */
export interface PortalAccountProfile {
  signedIn: boolean;
  displayName: string;
  email: string;
  initials: string;
  userId: string;
  avatarUrl: string;
}

/** The signed-out shape, shared so callers can clear without re-deriving. */
export const ANONYMOUS_PORTAL_ACCOUNT: PortalAccountProfile = {
  signedIn: false,
  displayName: '',
  email: '',
  initials: '',
  userId: '',
  avatarUrl: '',
};

/**
 * Resolve the avatar initials for a display name.
 *
 * Latin names use the first letter of the first and last word; a single word
 * contributes one letter; CJK names (and anything without whitespace) use the
 * first character, because word splitting does not apply to them.
 * @param displayName - the profile's display name.
 * @returns one or two uppercase characters, or an empty string without a name.
 */
export function resolvePortalAccountInitials(displayName: string): string {
  const normalized = displayName.trim().replace(/\s+/gu, ' ');
  if (!normalized) {
    return '';
  }

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > 1) {
    return `${firstCharacter(words[0] ?? '')}${firstCharacter(words[words.length - 1] ?? '')}`.toUpperCase();
  }

  return firstCharacter(normalized).toUpperCase();
}

/**
 * Project access-token claims onto the header identity.
 *
 * The access token is the one identity source every signed-in page already
 * holds, so no network round-trip is needed to draw the header. Claim names
 * follow the IAM token contract (`display_name`/`name` for the identity,
 * `email`, `user_id`/`sub`); an unknown shape still yields a signed-in profile
 * with the generic account label.
 * @param claims - decoded access-token payload, or undefined when unreadable.
 * @param fallbackUserId - IAM context user id, used when the token has none.
 * @returns the header identity derived from those claims.
 */
export function readPortalAccountProfileFromClaims(
  claims: Record<string, unknown> | undefined,
  fallbackUserId = '',
): PortalAccountProfile {
  const claimDisplayName = readClaimText(claims, 'display_name', 'displayName', 'name', 'preferred_username', 'username');
  const email = readClaimText(claims, 'email');
  const userId = readClaimText(claims, 'user_id', 'userId', 'sub') || fallbackUserId;
  const displayName = claimDisplayName || email || ANONYMOUS_DISPLAY_NAME;

  return {
    signedIn: true,
    displayName,
    email,
    initials: resolvePortalAccountInitials(displayName),
    userId,
    avatarUrl: readClaimText(claims, 'picture', 'avatar_url', 'avatarUrl'),
  };
}

/**
 * Read the current header identity from the stored IAM session.
 * @returns the stored session's identity, or the anonymous shape when signed out.
 */
export function loadPortalAccountProfile(): PortalAccountProfile {
  const stored = loadStoredAppSessionToken();
  if (!stored || !hasStoredPortalSession()) {
    return ANONYMOUS_PORTAL_ACCOUNT;
  }

  const claims = parseJwtPayload(stored.accessToken);
  // An unreadable token still leaves a signed-in chip with the generic label:
  // the profile request that follows may recover the real name.
  return readPortalAccountProfileFromClaims(claims, stored.context?.userId ?? '');
}

/**
 * Fetch the authoritative profile for the signed-in account.
 *
 * The chip already renders from token claims, so this is a progressive
 * enhancement: a failed request returns null and the header keeps the claims
 * identity instead of showing an error.
 * @returns the profile, or null while signed out or when the request fails.
 */
export async function fetchPortalAccountProfile(): Promise<PortalAccountProfile | null> {
  if (!hasStoredPortalSession()) {
    return null;
  }

  try {
    const result = await getSdkworkAppbaseAppSdkClient().iam.users.current.retrieve();
    ensureSdkworkApiSuccess(result, ACCOUNT_PROFILE_ERROR);
    const item = readRequiredApiItem(result, ACCOUNT_PROFILE_ERROR);
    const base = loadPortalAccountProfile();
    const apiDisplayName =
      readString(item, 'displayName') || readString(item, 'name') || readString(item, 'username');
    const displayName = apiDisplayName || base.displayName || ANONYMOUS_DISPLAY_NAME;
    const email = readString(item, 'email') || base.email;
    const userId = readString(item, 'userId') || readString(item, 'id') || base.userId;
    const avatarUrl = readMediaResourceUrl(item.avatar) || base.avatarUrl;

    return {
      signedIn: true,
      displayName,
      email,
      initials: resolvePortalAccountInitials(displayName),
      userId,
      avatarUrl,
    };
  } catch {
    return null;
  }
}

/**
 * End the portal session and clear every local copy of it.
 *
 * Server revocation is best effort inside {@link revokeAppSession}; the local
 * session is always cleared, which is what the header observes.
 * @returns a promise resolved once the local session is gone.
 */
export async function signOutPortalAccount(): Promise<void> {
  await revokeAppSession();
}

/**
 * Re-read the header identity whenever the IAM session changes in this tab or
 * another one.
 * @param listener - called after a sign-in, sign-out, refresh, or cross-tab change.
 * @returns the unsubscribe callback.
 */
export function subscribePortalAccountChange(listener: () => void): () => void {
  return subscribePortalSessionChange(listener);
}

function firstCharacter(value: string): string {
  return Array.from(value)[0] ?? '';
}

function readClaimText(
  claims: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  if (!claims) {
    return '';
  }

  for (const key of keys) {
    const raw = claims[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) {
      return value;
    }
  }

  return '';
}
