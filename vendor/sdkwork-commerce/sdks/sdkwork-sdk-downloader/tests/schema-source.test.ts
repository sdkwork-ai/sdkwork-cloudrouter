// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(async () => [
    {
      address: "93.184.216.34",
      family: 4,
    },
  ]),
}));

vi.mock("node:dns/promises", async () => {
  const actual = await vi.importActual<typeof import("node:dns/promises")>("node:dns/promises");
  return {
    ...actual,
    lookup: lookupMock,
  };
});

import { loadSchemaSource } from "../src/schema-source";

const fixtureJsonPath = resolve(
  "sdks/sdkwork-sdk-downloader/tests/fixtures/openapi.sample.json",
);
const fixtureYamlPath = resolve(
  "sdks/sdkwork-sdk-downloader/tests/fixtures/openapi.sample.yaml",
);

describe("schema-source", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([
      {
        address: "93.184.216.34",
        family: 4,
      },
    ]);
  });

  it("loads a local JSON schema file", async () => {
    const result = await loadSchemaSource({
      schema: {
        kind: "file",
        value: fixtureJsonPath,
      },
    });

    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.kind).toBe("file");
    expect(result.source.format).toBe("json");
  });

  it("loads a local YAML schema file", async () => {
    const result = await loadSchemaSource({
      schema: {
        kind: "file",
        value: fixtureYamlPath,
      },
    });

    expect(result.schema.info.title).toBe("Downloader Fixture API");
    expect(result.source.kind).toBe("file");
    expect(result.source.format).toBe("yaml");
  });

  it("loads a raw schema string", async () => {
    const rawContent = await readFile(fixtureJsonPath, "utf-8");

    const result = await loadSchemaSource({
      schema: {
        kind: "raw",
        value: rawContent,
        format: "json",
      },
    });

    expect(result.schema.paths["/health"]).toBeDefined();
    expect(result.source.kind).toBe("raw");
    expect(result.rawContent).toContain("\"openapi\": \"3.0.3\"");
  });

  it("loads an in-memory schema object", async () => {
    const result = await loadSchemaSource({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "In-Memory API",
            version: "1.0.0",
          },
          paths: {},
        },
      },
    });

    expect(result.schema.info.title).toBe("In-Memory API");
    expect(result.source.kind).toBe("object");
    expect(result.source.format).toBe("object");
  });

  it("loads a remote schema URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://example.com/openapi.json",
      },
      fetchTimeoutMs: 1_000,
      maxBytes: 1_024,
    });

    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.kind).toBe("url");
    expect(result.source.contentType).toBe("application/json");
  });

  it("follows safe remote schema redirects within the configured limit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://cdn.example.com/openapi.json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(await readFile(fixtureJsonPath, "utf-8"), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    const result = await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://example.com/openapi.json",
      },
      maxRedirects: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.url).toBe("https://cdn.example.com/openapi.json");
  });

  it("preserves custom request headers for same-origin remote schema redirects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "/redirected/openapi.json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(await readFile(fixtureJsonPath, "utf-8"), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://example.com/openapi.json",
        headers: {
          authorization: "Bearer secret-token",
          "x-sdkwork-source": "downloader-test",
        },
      },
      maxRedirects: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: "Bearer secret-token",
      "x-sdkwork-source": "downloader-test",
    });
    expect(fetchSpy.mock.calls[1]?.[1]?.headers).toEqual({
      authorization: "Bearer secret-token",
      "x-sdkwork-source": "downloader-test",
    });
  });

  it("strips custom request headers for cross-origin remote schema redirects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://cdn.example.com/openapi.json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(await readFile(fixtureJsonPath, "utf-8"), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://example.com/openapi.json",
        headers: {
          authorization: "Bearer secret-token",
          "x-sdkwork-source": "downloader-test",
        },
      },
      maxRedirects: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: "Bearer secret-token",
      "x-sdkwork-source": "downloader-test",
    });
    expect(fetchSpy.mock.calls[1]?.[1]?.headers).toBeUndefined();
  });

  it("rejects remote schema redirects to private or local targets before following them", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://127.0.0.1/openapi.json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://example.com/openapi.json",
        },
      }),
    ).rejects.toThrow("Remote schema host is private or local and is not allowed: 127.0.0.1");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects remote schema redirects to unsupported protocols before following them", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "ftp://downloads.example.com/openapi.json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://example.com/openapi.json",
        },
      }),
    ).rejects.toThrow("Unsupported schema URL protocol: ftp:");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects remote schema redirect chains that exceed the configured limit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://redirect-1.example.com/openapi.json",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: "https://redirect-2.example.com/openapi.json",
          },
        }),
      );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://example.com/openapi.json",
        },
        maxRedirects: 1,
      }),
    ).rejects.toThrow("Remote schema URL exceeded the configured maxRedirects limit.");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("rejects remote schemas that exceed the configured size limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("x".repeat(2_048), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://example.com/too-large.json",
        },
        fetchTimeoutMs: 1_000,
        maxBytes: 1_024,
      }),
    ).rejects.toThrow("Schema payload exceeds the configured maxBytes limit.");
  });

  it("rejects blocked remote schema hosts before fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://blocked.example.com/openapi.json",
        },
        remoteUrlPolicy: {
          blockedHosts: ["blocked.example.com"],
        },
      }),
    ).rejects.toThrow("Remote schema host is blocked: blocked.example.com");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects remote schema hosts outside the configured allowlist", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://example.com/openapi.json",
        },
        remoteUrlPolicy: {
          allowedHosts: ["schemas.example.com"],
        },
      }),
    ).rejects.toThrow("Remote schema host is not in the allowlist: example.com");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects remote schema URLs that target private IP addresses by default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://127.0.0.1/openapi.json",
        },
      }),
    ).rejects.toThrow("Remote schema host is private or local and is not allowed: 127.0.0.1");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects remote schema hosts that resolve to private IP addresses by default", async () => {
    lookupMock.mockResolvedValueOnce([
      {
        address: "10.0.0.8",
        family: 4,
      },
    ]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://schemas.example.com/openapi.json",
        },
      }),
    ).rejects.toThrow("Remote schema host resolves to a private or local address: 10.0.0.8");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows private remote schema hosts only when explicitly enabled", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://127.0.0.1/openapi.json",
      },
      remoteUrlPolicy: {
        allowPrivateHosts: true,
      },
    });

    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.url).toBe("https://127.0.0.1/openapi.json");
  });

  it("allows hostname-based remote schemas that resolve to private IP addresses only when explicitly enabled", async () => {
    lookupMock.mockResolvedValueOnce([
      {
        address: "10.0.0.8",
        family: 4,
      },
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://schemas.example.com/openapi.json",
      },
      remoteUrlPolicy: {
        allowPrivateHosts: true,
      },
    });

    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.url).toBe("https://schemas.example.com/openapi.json");
  });

  it("rejects unresolved remote schema hosts by default", async () => {
    lookupMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND unresolved.example.com"));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      loadSchemaSource({
        schema: {
          kind: "url",
          value: "https://unresolved.example.com/openapi.json",
        },
      }),
    ).rejects.toThrow("Failed to resolve remote schema host for safety checks: unresolved.example.com");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows unresolved remote schema hosts only when explicitly enabled", async () => {
    lookupMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND unresolved.example.com"));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(await readFile(fixtureJsonPath, "utf-8"), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const result = await loadSchemaSource({
      schema: {
        kind: "url",
        value: "https://unresolved.example.com/openapi.json",
      },
      remoteUrlPolicy: {
        allowUnresolvedHosts: true,
      },
    });

    expect(result.schema.openapi).toBe("3.0.3");
    expect(result.source.url).toBe("https://unresolved.example.com/openapi.json");
  });
});
