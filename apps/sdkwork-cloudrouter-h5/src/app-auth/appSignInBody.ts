/**
 * Credential-entry sign-in body for the H5 hosted login.
 *
 * The IAM app-api session bootstrap resolves the login identity from
 * `username`/`email`/`phone` and defaults an omitted `grantType` to the
 * password grant. The hosted login therefore posts the typed address as
 * `email` (and `account` for parity with the canonical PC payload) plus an
 * explicit `grantType`, so a deployment that predates the server default still
 * authenticates.
 */

export interface AppSignInCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Build the `/auth/sessions` body for a password sign-in.
 * @param credentials - the address the user typed and their password.
 * @returns the JSON body sent to the session bootstrap.
 */
export function buildAppSignInBody(credentials: AppSignInCredentials): Record<string, unknown> {
  const email = credentials.email.trim();
  return {
    account: email,
    email,
    grantType: 'password',
    password: credentials.password,
  };
}
