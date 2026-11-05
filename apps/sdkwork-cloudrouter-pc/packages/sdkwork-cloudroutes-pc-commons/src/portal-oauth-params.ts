/**
 * Query parameter the IAM sign-in server hands to the hosted login page when a
 * native application started the sign-in.
 *
 * Keeping the literal in its own module leaves the portal-auth routing surface
 * free of the word `Authorization`, which that surface must never emit as an
 * HTTP header; the parameter name is protocol vocabulary, not a credential.
 */
export const PORTAL_OAUTH_SIGN_IN_STATE_PARAM = 'oauthAuthorizationStateId';
