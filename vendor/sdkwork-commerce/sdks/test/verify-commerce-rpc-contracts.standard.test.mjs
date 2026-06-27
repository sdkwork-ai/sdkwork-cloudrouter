import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "../..");

function read(relativePath) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function collectProtoFiles(relativeRoot) {
  const absoluteRoot = path.join(workspaceRoot, relativeRoot);
  const files = [];

  for (const entry of readdirSync(absoluteRoot, { withFileTypes: true })) {
    const entryPath = path.join(absoluteRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectProtoFiles(path.relative(workspaceRoot, entryPath)));
      continue;
    }
    if (entry.name.endsWith(".proto")) {
      files.push(path.relative(workspaceRoot, entryPath).replaceAll("\\", "/"));
    }
  }

  return files.sort();
}

function parseProtoServices(protoSource) {
  const services = new Map();
  const servicePattern = /service\s+(\w+)\s*\{([^}]*)\}/gms;

  for (const match of protoSource.matchAll(servicePattern)) {
    const serviceName = match[1];
    const body = match[2];
    const rpcNames = [...body.matchAll(/rpc\s+(\w+)\s*\(/g)].map((rpc) => rpc[1]);
    services.set(serviceName, rpcNames);
  }

  return services;
}

function parseRustRpcManifests(rpcSource) {
  const manifests = new Map();
  const manifestPattern =
    /SdkworkRpcServiceManifest::new\(\s*"[^"]+",\s*"(\w+)",\s*"[^"]+",\s*"[^"]+",\s*vec!\[([\s\S]*?)\],\s*\)/g;

  for (const match of rpcSource.matchAll(manifestPattern)) {
    const serviceName = match[1];
    const methodsBlock = match[2];
    const methodNames = [...methodsBlock.matchAll(/SdkworkRpcMethod::new\(\s*"(\w+)"/g)].map(
      (method) => method[1],
    );
    manifests.set(serviceName, methodNames);
  }

  return manifests;
}

test("commerce rpc proto services align with runtime rpc manifests", () => {
  const protoRoot = "packages/common/commerce/sdkwork-commerce-rpc-contracts/proto";
  const protoServices = new Map();

  for (const protoPath of collectProtoFiles(protoRoot)) {
    const parsed = parseProtoServices(read(protoPath));
    for (const [serviceName, rpcNames] of parsed) {
      protoServices.set(serviceName, rpcNames);
    }
  }

  const rustManifests = parseRustRpcManifests(
    read("crates/sdkwork-commerce-rpc/src/lib.rs"),
  );

  assert.deepEqual(
    [...protoServices.keys()].sort(),
    [...rustManifests.keys()].sort(),
    "proto services must match Rust rpc manifests",
  );

  for (const [serviceName, protoRpcNames] of protoServices) {
    assert.deepEqual(
      protoRpcNames,
      rustManifests.get(serviceName),
      `${serviceName} rpc methods must match between proto and rpc.rs`,
    );
  }
});

test("commerce rpc contracts component declares proto authority", () => {
  const spec = JSON.parse(
    read("packages/common/commerce/sdkwork-commerce-rpc-contracts/specs/component.spec.json"),
  );

  assert.equal(spec.component.status, "standard");
  assert.match(spec.contracts?.protoRoot ?? "", /\/proto$/);
});
