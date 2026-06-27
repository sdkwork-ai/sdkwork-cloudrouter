import { existsSync } from "node:fs";

export type CacheEntryHealthStatus =
  | "healthy"
  | "missing-workspace"
  | "missing-archive"
  | "degraded-control-plane"
  | "invalid-control-plane";

export interface CacheEntryHealth {
  status: CacheEntryHealthStatus;
  isHealthy: boolean;
}

export interface CacheEntryHealthInput {
  workspacePath: string;
  archivePath: string;
  controlPlaneStatus?: "healthy" | "degraded" | "invalid" | "empty";
}

export function evaluateCacheEntryHealth(
  input: CacheEntryHealthInput,
): CacheEntryHealth {
  if (!existsSync(input.workspacePath)) {
    return {
      status: "missing-workspace",
      isHealthy: false,
    };
  }

  if (!existsSync(input.archivePath)) {
    return {
      status: "missing-archive",
      isHealthy: false,
    };
  }

  if (input.controlPlaneStatus === "degraded") {
    return {
      status: "degraded-control-plane",
      isHealthy: false,
    };
  }

  if (input.controlPlaneStatus === "invalid") {
    return {
      status: "invalid-control-plane",
      isHealthy: false,
    };
  }

  return {
    status: "healthy",
    isHealthy: true,
  };
}
