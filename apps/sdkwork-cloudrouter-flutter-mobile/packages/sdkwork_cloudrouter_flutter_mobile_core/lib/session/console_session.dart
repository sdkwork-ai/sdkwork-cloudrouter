/// Host-owned console session snapshot.
///
/// The Flutter root keeps the token pair in the generated SDK `HttpClient`
/// (matching the browser roots, which keep it in the platform storage adapter);
/// this snapshot is the typed view the root and shell read.
class CloudRouterSession {
  const CloudRouterSession({
    required this.authenticated,
    required this.accessToken,
    required this.authToken,
    required this.tenantId,
    required this.organizationId,
    required this.subject,
  });

  final bool authenticated;
  final String? accessToken;
  final String? authToken;
  final String tenantId;
  final String organizationId;
  final String? subject;
}

/// Tenant and organization follow the app manifest defaults
/// (`backend.tenantId` / `backend.organizationId`), matching the PC, H5, and
/// mini-program roots so every client reports the same identity shape.
CloudRouterSession readCloudRouterSession({
  String? accessToken,
  String? authToken,
  String? subject,
}) {
  final hasAccessToken = accessToken != null && accessToken.isNotEmpty;
  final hasAuthToken = authToken != null && authToken.isNotEmpty;
  return CloudRouterSession(
    authenticated: hasAccessToken || hasAuthToken,
    accessToken: accessToken,
    authToken: authToken,
    tenantId: '100001',
    organizationId: '0',
    subject: subject,
  );
}
