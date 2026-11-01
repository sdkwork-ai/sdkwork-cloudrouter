/**
 * auth/app copy (en-US): hosted sign-in for a native SDKWork application.
 * Keys are `cloudrouter.auth.app.<field>`.
 */
export const appAuthMessages: Record<string, string> = {
  'cloudrouter.auth.app.title': "Sign in to the app",
  'cloudrouter.auth.app.description': "Continue to approve the sign-in. The app opens again as soon as you are signed in.",
  'cloudrouter.auth.app.signInDescription': "Sign in with your SDKWork account to finish the app sign-in.",
  'cloudrouter.auth.app.invalidTitle': "This sign-in link is not valid",
  'cloudrouter.auth.app.invalidDescription': "The app sent an authorization request this platform cannot start. Start the sign-in again from the app to get a fresh link.",
  'cloudrouter.auth.app.hint': "Keep this page open until the app returns: the authorization code is handed back through the app's registered deep link.",
  'cloudrouter.auth.app.problemLabel': "Reason",
  'cloudrouter.auth.app.backToConsole': "Go to the console home",
  'cloudrouter.auth.app.completing': "Completing sign-in…",
  'cloudrouter.auth.app.failed': "The app sign-in could not be completed. Start it again from the app.",
  'cloudrouter.auth.app.launchTitle': "Returning to the app",
  'cloudrouter.auth.app.launchDescription': "You are signed in. The app opens to finish the sign-in.",
  'cloudrouter.auth.app.launchOpen': "Open the app",
  'cloudrouter.auth.app.launchLink': "Open the sign-in link manually",
  'cloudrouter.auth.app.launchHint': "If the app did not open, use the button above. The authorization code is single-use, so start a new sign-in from the app if this link has expired.",
  'cloudrouter.auth.app.launchFailed': "The app could not be opened automatically. Use the button above.",
  'cloudrouter.auth.app.missingRedirect': "The hand-off link is missing. Start the sign-in again from the app.",
};
