import type { IamAppContext } from '@sdkwork/iam-contracts';

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
  standardRoleCodes?: string[];
}

export interface PortalIamBridgeSession {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
  context?: IamAppContext;
}
