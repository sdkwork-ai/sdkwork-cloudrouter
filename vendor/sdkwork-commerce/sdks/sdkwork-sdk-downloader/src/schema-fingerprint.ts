import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const localRequire = createRequire(import.meta.url);
const generatorRequire = createRequire(
  new URL("../../../../sdkwork-sdk-generator/package.json", import.meta.url),
);

type YamlModule = {
  load(input: string): unknown;
};

export function createSchemaFingerprint(input: unknown): string {
  const normalizedSchema = normalizeSchemaInput(input);
  return createHash("sha256")
    .update(serializeCanonicalValue(normalizedSchema), "utf-8")
    .digest("hex");
}

export function serializeCanonicalValue(input: unknown): string {
  return JSON.stringify(sortValue(input));
}

function normalizeSchemaInput(input: unknown): unknown {
  if (typeof input === "string") {
    return parseSchemaText(input);
  }

  return input;
}

function parseSchemaText(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return loadYamlModule().load(content);
  }
}

function loadYamlModule(): YamlModule {
  try {
    return localRequire("js-yaml") as YamlModule;
  } catch {
    return generatorRequire("js-yaml") as YamlModule;
  }
}

function sortValue(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => sortValue(item));
  }

  if (input && typeof input === "object") {
    return Object.keys(input as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortValue((input as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return input;
}
