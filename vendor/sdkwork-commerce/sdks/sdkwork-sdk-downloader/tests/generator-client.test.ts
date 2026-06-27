// @vitest-environment node

import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createSdkGeneratorClient } from "../src/generator-client";

describe("generator-client", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })),
    );
  });

  it("generates a real sdk workspace and reads a healthy control plane snapshot", async () => {
    const outputPath = await createTempDir();
    const client = createSdkGeneratorClient();

    const result = await client.generateSdkProject({
      outputPath,
      spec: {
        openapi: "3.0.3",
        info: {
          title: "Downloader Generator Smoke API",
          version: "1.0.0",
        },
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["User"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/User",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              required: ["id"],
              properties: {
                id: {
                  type: "string",
                },
              },
            },
          },
        },
      },
      name: "DownloaderSmokeSdk",
      language: "typescript",
      sdkType: "backend",
      syncPublishedVersion: false,
    });

    await expect(access(join(outputPath, "README.md"), constants.F_OK)).resolves.toBeUndefined();
    await expect(
      access(join(outputPath, "src/api/user.ts"), constants.F_OK),
    ).resolves.toBeUndefined();
    await expect(readFile(join(outputPath, "README.md"), "utf-8")).resolves.toContain(
      "## Regeneration Contract",
    );
    expect(result.resolvedVersion?.version).toBeDefined();

    const snapshot = await client.readControlPlaneSnapshot(outputPath);

    expect(snapshot?.evaluation?.status).toBe("healthy");
  });

  async function createTempDir() {
    const target = await mkdtemp(join(tmpdir(), "sdk-downloader-generator-client-"));
    cleanupPaths.push(target);
    return target;
  }
});
