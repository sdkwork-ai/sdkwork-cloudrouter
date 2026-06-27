// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createSdkworkSdkDownloaderService,
} from "../src";

describe("sdk-downloader package root", () => {
  it("exports the public downloader service factory", () => {
    expect(typeof createSdkworkSdkDownloaderService).toBe("function");
  });
});
