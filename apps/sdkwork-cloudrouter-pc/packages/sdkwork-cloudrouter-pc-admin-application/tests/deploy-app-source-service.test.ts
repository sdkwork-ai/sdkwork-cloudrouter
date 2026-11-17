import { describe, expect, it } from "vitest";

import {
  createDeployAppSourceService,
  DeployAppSourceServiceError,
  deployAppSourceErrorReason,
  isDeployAppSourceConflict,
  isDeployAppSourceForbidden,
  isDeployAppSourceNetworkFailure,
  isDeployAppSourceNotFound,
  isDeployAppSourceUnauthorized,
  isDeployAppSourceUnavailable,
  mapArtifact,
  mapRemixState,
  mapSourceState,
  type DeployAppSourceTransport,
} from "../src/services/deploy-app-source";
import {
  DeployAppSourceFormError,
  createSourceDraft,
  toSourceUpdatePayload,
} from "../src/services/deploy-app-source-form";
import type {
  DeployAppSourceDraft,
  DeployAppSourceUpdatePayload,
} from "../src/types/deploy-app-source";

/**
 * Deploy source/remix service regression.
 *
 * The service is the only place the App Center turns generated-SDK responses into
 * console state, so these tests pin the two things that would silently break the
 * surface: the exact `PUT /source` body for each kind, and the normalization of
 * the failures the drawer explains (409 readiness refusal, 404, 403, network).
 */
interface RecordedCall {
  operation: string;
  args: readonly unknown[];
}

function sourceRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    appId: "app-1",
    remixEnabled: false,
    readiness: "READY",
    sourceKind: "GIT",
    git: {
      repoProvider: "GITHUB",
      repoUrl: "https://github.com/acme/app.git",
      repoRef: "main",
      subPath: "apps/web",
      cloneMode: "SHALLOW",
      repoStatus: "VALIDATED",
      credentialSecretRef: "secrets/git",
    },
    updatedAt: "2026-01-01T00:00:00Z",
    version: "3",
    ...overrides,
  };
}

function remixRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    appId: "app-1",
    remixEnabled: true,
    readiness: "READY",
    sourceKind: "GIT",
    ...overrides,
  };
}

function createTransport(options: {
  artifactList?: () => Promise<unknown>;
  remixRetrieve?: () => Promise<unknown>;
  remixUpdate?: (appId: string, body: { enabled: boolean }) => Promise<unknown>;
  sourceDelete?: (appId: string) => Promise<void>;
  sourceRetrieve?: () => Promise<unknown>;
  sourceUpdate?: (appId: string, body: DeployAppSourceUpdatePayload) => Promise<unknown>;
} = {}): { calls: RecordedCall[]; transport: DeployAppSourceTransport } {
  const calls: RecordedCall[] = [];
  const transport: DeployAppSourceTransport = {
    app: {
      source: {
        retrieve: async (appId) => {
          calls.push({ operation: "source.retrieve", args: [appId] });
          return options.sourceRetrieve ? options.sourceRetrieve() : sourceRecord();
        },
        update: async (appId, body) => {
          calls.push({ operation: "source.update", args: [appId, body] });
          return options.sourceUpdate
            ? options.sourceUpdate(appId, body)
            : sourceRecord({ sourceKind: body.kind });
        },
        delete: async (appId) => {
          calls.push({ operation: "source.delete", args: [appId] });
          if (options.sourceDelete) {
            await options.sourceDelete(appId);
          }
        },
      },
      remix: {
        retrieve: async (appId) => {
          calls.push({ operation: "remix.retrieve", args: [appId] });
          return options.remixRetrieve ? options.remixRetrieve() : remixRecord();
        },
        update: async (appId, body) => {
          calls.push({ operation: "remix.update", args: [appId, body] });
          return options.remixUpdate
            ? options.remixUpdate(appId, body)
            : remixRecord({ remixEnabled: body.enabled });
        },
      },
    },
    artifact: {
      list: async (params) => {
        calls.push({ operation: "artifact.list", args: [params] });
        return options.artifactList
          ? options.artifactList()
          : { items: [{ id: "art-1", fileName: "app.tar.gz", contentLength: "1024" }], pageInfo: {} };
      },
    },
  };
  return { calls, transport };
}

function gitDraft(overrides: Partial<DeployAppSourceDraft> = {}): DeployAppSourceDraft {
  return {
    kind: "GIT",
    repoProvider: "github",
    repoUrl: " https://github.com/acme/app.git ",
    repoRef: "main",
    subPath: "./apps/web/",
    credentialSecretRef: "",
    cloneMode: "SHALLOW",
    artifactId: "",
    ...overrides,
  };
}

function statusError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

describe("deploy app source payloads", () => {
  it("sends the Git half with normalized provider, URL, ref, and sub-directory", () => {
    const payload = toSourceUpdatePayload(gitDraft({ cloneMode: "FULL", credentialSecretRef: "secrets/git" }));

    expect(payload).toEqual({
      kind: "GIT",
      git: {
        repoProvider: "GITHUB",
        repoUrl: "https://github.com/acme/app.git",
        cloneMode: "FULL",
        repoRef: "main",
        subPath: "apps/web",
        credentialSecretRef: "secrets/git",
      },
    });
  });

  it("omits blank optional Git fields so the backend keeps its defaults", () => {
    const payload = toSourceUpdatePayload(
      gitDraft({ repoRef: "  ", subPath: "/", credentialSecretRef: "  " }),
    );

    expect(payload).toEqual({
      kind: "GIT",
      git: {
        repoProvider: "GITHUB",
        repoUrl: "https://github.com/acme/app.git",
        cloneMode: "SHALLOW",
      },
    });
    expect((payload as { git: Record<string, unknown> }).git).not.toHaveProperty("repoRef");
    expect((payload as { git: Record<string, unknown> }).git).not.toHaveProperty("subPath");
  });

  it("sends only the archive reference for an archive source", () => {
    const payload = toSourceUpdatePayload(gitDraft({ kind: "ARCHIVE", artifactId: " art-1 " }));

    expect(payload).toEqual({ kind: "ARCHIVE", archive: { artifactId: "art-1" } });
    expect(payload).not.toHaveProperty("git");
  });

  it("refuses to build a Git payload for an unsupported provider", () => {
    let failure: unknown;
    try {
      toSourceUpdatePayload(gitDraft({ repoProvider: "BITBUCKET" }));
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(DeployAppSourceFormError);
    expect((failure as DeployAppSourceFormError).code).toBe("repo-provider-invalid");
  });
});

describe("deploy app source service", () => {
  it("reads the source and the remix flag, preferring the remix read", async () => {
    const { calls, transport } = createTransport({
      remixRetrieve: async () => remixRecord({ remixEnabled: true }),
      sourceRetrieve: async () => sourceRecord({ remixEnabled: false, readiness: "MISSING", readinessReason: "GIT_REPOSITORY_NOT_VALIDATED" }),
    });
    const service = createDeployAppSourceService(transport);

    const snapshot = await service.load("app-1");

    expect(calls.map((call) => call.operation)).toEqual(["source.retrieve", "remix.retrieve"]);
    expect(snapshot.remix.remixEnabled).toBe(true);
    expect(snapshot.source.remixEnabled).toBe(true);
    expect(snapshot.source.readiness).toBe("MISSING");
    expect(snapshot.source.readinessReason).toBe("GIT_REPOSITORY_NOT_VALIDATED");
    expect(snapshot.source.git?.repoStatus).toBe("VALIDATED");
  });

  it("keeps the source form usable when the remix read is not served", async () => {
    const { transport } = createTransport({
      remixRetrieve: async () => {
        throw statusError("not found", 404);
      },
      sourceRetrieve: async () => sourceRecord({ remixEnabled: true }),
    });
    const service = createDeployAppSourceService(transport);

    const snapshot = await service.load("app-1");

    expect(snapshot.source.readiness).toBe("READY");
    expect(snapshot.remix.remixEnabled).toBe(true);
    expect(snapshot.remix.appId).toBe("app-1");
  });

  it("puts the Git payload through the generated source.update operation", async () => {
    const { calls, transport } = createTransport();
    const service = createDeployAppSourceService(transport);
    const payload = toSourceUpdatePayload(gitDraft());

    const saved = await service.save("app-1", payload);

    const updateCall = calls.find((call) => call.operation === "source.update");
    expect(updateCall?.args[0]).toBe("app-1");
    expect(updateCall?.args[1]).toEqual({
      kind: "GIT",
      git: {
        repoProvider: "GITHUB",
        repoUrl: "https://github.com/acme/app.git",
        cloneMode: "SHALLOW",
        repoRef: "main",
        subPath: "apps/web",
      },
    });
    expect(saved.appId).toBe("app-1");
    expect(saved.sourceKind).toBe("GIT");
  });

  it("puts the archive payload through the generated source.update operation", async () => {
    const { calls, transport } = createTransport();
    const service = createDeployAppSourceService(transport);

    await service.save("app-1", toSourceUpdatePayload(gitDraft({ kind: "ARCHIVE", artifactId: "art-9" })));

    const updateCall = calls.find((call) => call.operation === "source.update");
    expect(updateCall?.args[1]).toEqual({ kind: "ARCHIVE", archive: { artifactId: "art-9" } });
  });

  it("retires the source and drives remix through its own command", async () => {
    const { calls, transport } = createTransport();
    const service = createDeployAppSourceService(transport);

    await service.retire("app-1");
    const remix = await service.setRemix("app-1", true);

    expect(calls.map((call) => call.operation)).toEqual(["source.delete", "remix.update"]);
    expect(calls[1]?.args).toEqual(["app-1", { enabled: true }]);
    expect(remix.remixEnabled).toBe(true);
  });

  it("lists registered artifacts as archive candidates", async () => {
    const { calls, transport } = createTransport({
      artifactList: async () => ({
        items: [
          { id: "art-1", fileName: "app.tar.gz", contentLength: "1024", createdAt: "2026-01-01T00:00:00Z" },
          { fileName: "no-id.zip" },
        ],
        pageInfo: {},
      }),
    });
    const service = createDeployAppSourceService(transport);

    const artifacts = await service.listArtifacts();

    expect(calls[0]?.operation).toBe("artifact.list");
    expect(artifacts).toEqual([
      {
        id: "art-1",
        fileName: "app.tar.gz",
        contentLength: "1024",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
  });
});

describe("deploy app source failures", () => {
  it("keeps the readiness reason a 409 refusal was built from", async () => {
    const { transport } = createTransport({
      remixUpdate: async () => {
        throw Object.assign(
          new Error("remix cannot be enabled: the application source is MISSING (GIT_REPOSITORY_NOT_VALIDATED)"),
          { status: 409 },
        );
      },
    });
    const service = createDeployAppSourceService(transport);

    const failure = await service.setRemix("app-1", true).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DeployAppSourceServiceError);
    expect(isDeployAppSourceConflict(failure)).toBe(true);
    expect((failure as DeployAppSourceServiceError).status).toBe(409);
    expect(deployAppSourceErrorReason(failure)).toBe("GIT_REPOSITORY_NOT_VALIDATED");
  });

  it("reads the reason from the problem detail when the message is generic", async () => {
    const { transport } = createTransport({
      sourceUpdate: async () => {
        throw {
          httpStatus: 409,
          message: "Conflict",
          problem: { detail: "the source is ARCHIVE_UNAVAILABLE" },
        };
      },
    });
    const service = createDeployAppSourceService(transport);

    const failure = await service.save("app-1", toSourceUpdatePayload(gitDraft())).catch((error: unknown) => error);

    expect(isDeployAppSourceConflict(failure)).toBe(true);
    expect(deployAppSourceErrorReason(failure)).toBe("ARCHIVE_UNAVAILABLE");
  });

  it("classifies 404, 403, 401, 5xx, and transport failures separately", async () => {
    const cases: ReadonlyArray<{
      assert: (error: unknown) => boolean;
      error: unknown;
    }> = [
      { error: statusError("gone", 404), assert: isDeployAppSourceNotFound },
      { error: statusError("forbidden", 403), assert: isDeployAppSourceForbidden },
      { error: statusError("expired", 401), assert: isDeployAppSourceUnauthorized },
      { error: statusError("backend down", 503), assert: isDeployAppSourceUnavailable },
      {
        error: Object.assign(new Error("network down"), { code: "NETWORK_ERROR", name: "NetworkError" }),
        assert: isDeployAppSourceNetworkFailure,
      },
    ];

    for (const testCase of cases) {
      const { transport } = createTransport({
        sourceRetrieve: async () => {
          throw testCase.error;
        },
        remixRetrieve: async () => {
          throw testCase.error;
        },
      });
      const service = createDeployAppSourceService(transport);

      const failure = await service.load("app-1").catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(DeployAppSourceServiceError);
      expect(testCase.assert(failure)).toBe(true);
    }
  });

  it("never reports an unknown readiness verdict as ready", () => {
    const mapped = mapSourceState({ appId: "app-1", readiness: "READYISH" }, "app-1");

    expect(mapped?.readiness).toBe("MISSING");
    expect(mapped?.readinessReason).toBeUndefined();
  });

  it("maps wrapped and bare responses the same way", () => {
    const wrapped = mapSourceState({ data: { item: sourceRecord() } }, "app-1");
    const bare = mapSourceState(sourceRecord(), "app-1");

    expect(wrapped).toEqual(bare);
    expect(wrapped?.git?.repoUrl).toBe("https://github.com/acme/app.git");
    expect(mapSourceState({}, "app-1")).toBeUndefined();
    expect(mapRemixState({ readiness: "READY" }, "app-1")?.appId).toBe("app-1");
    expect(mapArtifact({ artifactId: "art-2" })).toEqual({ id: "art-2", fileName: "art-2" });
    expect(mapArtifact({ fileName: "no-id" })).toBeUndefined();
  });

  it("defaults a draft from the configured source", () => {
    const source = mapSourceState(sourceRecord(), "app-1");
    const draft = createSourceDraft(source);

    expect(draft).toEqual({
      kind: "GIT",
      repoProvider: "GITHUB",
      repoUrl: "https://github.com/acme/app.git",
      repoRef: "main",
      subPath: "apps/web",
      credentialSecretRef: "secrets/git",
      cloneMode: "SHALLOW",
      artifactId: "",
    });
    expect(createSourceDraft(undefined).kind).toBe("GIT");
  });
});
