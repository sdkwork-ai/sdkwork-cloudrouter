import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");

describe("sdkwork-commerce-pc-membership-purchase UI boundary", () => {
  it("imports only narrow sdkwork UI component entrypoints", () => {
    const source = readFileSync(resolve(packageRoot, "src/components/membership-purchase-menu.tsx"), "utf8");

    expect(source).not.toMatch(/from ["']@sdkwork\/ui-pc-react["']/);
    expect(source).not.toMatch(/from ["']@sdkwork\/ui-pc-react\/components\/ui["']/);
  });
});
