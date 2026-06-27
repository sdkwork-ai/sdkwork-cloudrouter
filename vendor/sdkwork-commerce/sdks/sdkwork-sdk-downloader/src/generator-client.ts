export interface GenerateSdkProjectRequest {
  outputPath: string;
  spec: Record<string, unknown>;
  name: string;
  language: string;
  sdkType: string;
  packageName?: string;
  namespace?: string;
  commonPackage?: string;
  baseUrl?: string;
  apiPrefix?: string;
  sdkVersion?: string;
  fixedSdkVersion?: string;
  npmRegistry?: string;
  npmPackageName?: string;
  sdkRoot?: string;
  sdkName?: string;
  syncPublishedVersion?: boolean;
}

export interface GenerateSdkProjectResponse {
  resolvedVersion?: {
    version: string;
  };
}

export interface GenerateControlPlaneSnapshotLike {
  evaluation?: {
    status?: "healthy" | "degraded" | "invalid" | "empty";
  };
}

export interface SdkGeneratorClient {
  generateSdkProject(
    request: GenerateSdkProjectRequest,
  ): Promise<GenerateSdkProjectResponse>;
  readControlPlaneSnapshot(
    outputPath: string,
  ): Promise<GenerateControlPlaneSnapshotLike | null>;
}

const GENERATE_MODULE_SPECIFIER = "@sdkwork/sdk-generator/node/generate";
const CONTROL_PLANE_MODULE_SPECIFIER = "@sdkwork/sdk-generator/node/control-plane";
const GENERATE_MODULE_FALLBACK_URL = new URL(
  "../../../../sdkwork-sdk-generator/tmp-js/node/generate.js",
  import.meta.url,
);
const CONTROL_PLANE_MODULE_FALLBACK_URL = new URL(
  "../../../../sdkwork-sdk-generator/tmp-js/node/control-plane.js",
  import.meta.url,
);

export function createSdkGeneratorClient(): SdkGeneratorClient {
  return {
    async generateSdkProject(request) {
      const { generateSdkProject } = await importGeneratorRuntimeModule<{
        generateSdkProject: (input: Record<string, unknown>) => Promise<GenerateSdkProjectResponse>;
      }>(GENERATE_MODULE_SPECIFIER, GENERATE_MODULE_FALLBACK_URL);

      return generateSdkProject({
        spec: request.spec,
        apiSpecPath: "<in-memory-schema>",
        output: request.outputPath,
        name: request.name,
        language: request.language,
        type: request.sdkType,
        packageName: request.packageName,
        namespace: request.namespace,
        commonPackage: request.commonPackage,
        baseUrl: request.baseUrl,
        apiPrefix: request.apiPrefix,
        sdkVersion: request.sdkVersion,
        fixedSdkVersion: request.fixedSdkVersion,
        npmRegistry: request.npmRegistry,
        npmPackageName: request.npmPackageName,
        sdkRoot: request.sdkRoot,
        sdkName: request.sdkName,
        syncPublishedVersion: request.syncPublishedVersion,
      });
    },

    async readControlPlaneSnapshot(outputPath) {
      const { readGenerateControlPlaneSnapshot } = await importGeneratorRuntimeModule<{
        readGenerateControlPlaneSnapshot: (
          targetPath: string,
        ) => GenerateControlPlaneSnapshotLike | null;
      }>(CONTROL_PLANE_MODULE_SPECIFIER, CONTROL_PLANE_MODULE_FALLBACK_URL);

      return readGenerateControlPlaneSnapshot(outputPath);
    },
  };
}

async function importGeneratorRuntimeModule<TModule>(
  specifier: string,
  fallbackUrl: URL,
): Promise<TModule> {
  try {
    return await import(specifier) as TModule;
  } catch (error) {
    if (!isMissingModuleError(error, specifier) && !isMissingGeneratorRuntimeDependency(error)) {
      throw error;
    }

    return await import(fallbackUrl.href) as TModule;
  }
}

function isMissingModuleError(error: unknown, specifier: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Cannot find package '${specifier}'`)
    || message.includes(`Failed to resolve module specifier "${specifier}"`)
    || message.includes(`Cannot find module '${specifier}'`);
}

function isMissingGeneratorRuntimeDependency(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.replaceAll("\\", "/");

  return normalizedMessage.includes("Cannot find module")
    && normalizedMessage.includes("@sdkwork/sdk-generator")
    && normalizedMessage.includes("/tmp-js/");
}
