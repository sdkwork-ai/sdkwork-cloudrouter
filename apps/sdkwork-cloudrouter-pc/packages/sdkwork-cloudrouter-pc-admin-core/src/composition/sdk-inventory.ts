export interface SdkworkSdkInventoryEntry {
  workspace: string;
  surface: string;
  credentialMode: string;
}

export function listSdkworkAdminCoreSdkInventory(): readonly SdkworkSdkInventoryEntry[] {
  return [
    { workspace: 'cloudrouter-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-models-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    // Federated intelligence capabilities composed into the home admin module:
    // each is a separately owned backend API mounted same-origin by the host.
    { workspace: 'sdkwork-skills-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-mcp-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-agents-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    { workspace: 'sdkwork-plugins-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
    // AIoT management API: owned by sdkwork-aiot, mounted same-origin by the
    // host, and consumed by the Smart Hardware Center module.
    { workspace: 'sdkwork-aiot-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
  ] as const;
}

