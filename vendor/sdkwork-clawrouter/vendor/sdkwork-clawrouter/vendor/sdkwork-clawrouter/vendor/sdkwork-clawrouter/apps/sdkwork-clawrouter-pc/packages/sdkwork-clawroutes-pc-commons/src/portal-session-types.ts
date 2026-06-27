export interface PortalSessionAppContext {
  tenantId: string;
  userId: string;
  organizationId?: string;
  sessionId?: string;
  appId?: string;
  environment?: string;
  deploymentMode?: string;
  authLevel?: string;
  dataScope?: string[];
  permissionScope?: string[];
}

export interface PortalIamBridgeSession {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: PortalSessionAppContext;
}
