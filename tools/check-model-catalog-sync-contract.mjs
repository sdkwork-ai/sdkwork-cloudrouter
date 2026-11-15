#!/usr/bin/env node
/**
 * Validate the authored model-catalog sync contract fragments.
 *
 * The fragments under docs/architecture/tech/assets/ are authoring inputs for
 * the generated open-api and app-api authorities. They are not authorities
 * themselves, so the repository's composed-contract audits do not cover them.
 * This check keeps them structurally sound while they wait for Phase 2
 * materialization:
 *
 *   - OpenAPI 3.1.2, semver info.version
 *   - unique operation ids within one fragment
 *   - every operation declares security and a 200 response
 *   - every `$ref` resolves, including a relative reference to the open-api
 *     fragment from the app-api fragment
 *   - the open-api snapshot response carries the catalog version headers
 *   - the app-api responses wrap the shared resource in the SDKWork envelope
 *
 *   node tools/check-model-catalog-sync-contract.mjs
 *   node tools/check-model-catalog-sync-contract.mjs --check   # same; used by CI
 */
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = resolve(workspaceRoot, 'docs', 'architecture', 'tech', 'assets')
const FRAGMENTS = [
  resolve(assetsDir, 'model-catalog-sync.open-api.openapi.json'),
  resolve(assetsDir, 'model-catalog-sync.app-api.openapi.json'),
]
const SEMVER = /^\d+\.\d+\.\d+$/
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'])

/** One deduplicated finding. */
class Findings {
  constructor() {
    this.items = []
  }

  add(file, pointer, message) {
    this.items.push(`${file.replaceAll('\\', '/')}${pointer}: ${message}`)
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Walk every node, yielding the JSON path of each `$ref`. */
function collectRefs(value, pointer = '', out = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRefs(item, `${pointer}/${index}`, out))
    return out
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string') out.push({ pointer: `${pointer}/$ref`, ref: item })
      else collectRefs(item, `${pointer}/${key}`, out)
    }
  }
  return out
}

function decodePointerToken(token) {
  return token.replaceAll('~1', '/').replaceAll('~0', '~')
}

/** Resolve one `$ref` against its containing document, following files but not nested refs. */
function resolveRef(ref, documentPath) {
  const hashIndex = ref.indexOf('#')
  if (hashIndex < 0) return { documentPath, value: undefined }
  const filePart = ref.slice(0, hashIndex)
  const pointerPart = ref.slice(hashIndex + 1)
  const targetPath = filePart === '' ? documentPath : resolve(dirname(documentPath), filePart)
  let target
  try {
    target = readJson(targetPath)
  } catch {
    return { documentPath: targetPath, value: undefined }
  }
  if (pointerPart === '') return { documentPath: targetPath, value: target }
  if (!pointerPart.startsWith('/')) return { documentPath: targetPath, value: undefined }
  let node = target
  for (const rawToken of pointerPart.slice(1).split('/')) {
    if (node === null || typeof node !== 'object') return { documentPath: targetPath, value: undefined }
    node = node[decodePointerToken(rawToken)]
    if (node === undefined) return { documentPath: targetPath, value: undefined }
  }
  return { documentPath: targetPath, value: node }
}

function checkOperations(file, document, findings) {
  const operationIds = new Set()
  const paths = document.paths ?? {}
  for (const [routePath, pathItem] of Object.entries(paths)) {
    if (pathItem === null || typeof pathItem !== 'object') {
      findings.add(file, `/paths/${routePath}`, 'path item must be an object')
      continue
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue
      const pointer = `/paths/${routePath}/${method}`
      if (operation === null || typeof operation !== 'object') {
        findings.add(file, pointer, 'operation must be an object')
        continue
      }
      const operationId = operation.operationId
      if (typeof operationId !== 'string' || operationId.length === 0) {
        findings.add(file, pointer, 'operationId is required')
      } else if (operationIds.has(operationId)) {
        findings.add(file, pointer, `duplicate operationId "${operationId}"`)
      } else {
        operationIds.add(operationId)
      }
      const security = operation.security ?? document.security
      if (!Array.isArray(security) || security.length === 0) {
        findings.add(file, pointer, 'operation must declare security')
      }
      if (operation.responses?.['200'] === undefined) {
        findings.add(file, pointer, 'operation must declare a 200 response')
      }
    }
  }
  if (operationIds.size === 0) findings.add(file, '/paths', 'no operations found')
}

function requireHeader(file, operation, pointer, header, findings) {
  if (operation?.responses?.['200']?.headers?.[header] === undefined) {
    findings.add(file, pointer, `200 response must declare header "${header}"`)
  }
}

function checkOpenApi(file, document, findings) {
  const snapshot = document.paths?.['/v1/model_catalog']?.get
  if (snapshot === undefined) {
    findings.add(file, '/paths', 'missing GET /v1/model_catalog')
    return
  }
  for (const header of ['ETag', 'X-Catalog-Revision', 'X-Catalog-Version', 'X-Catalog-Schema-Version']) {
    requireHeader(file, snapshot, '/paths/~1v1~1model_catalog/get', header, findings)
  }
  for (const name of ['CatalogSnapshot', 'CatalogDelta', 'CatalogVendor', 'CatalogModel', 'ParameterDescriptor', 'ProblemDetail']) {
    if (document.components?.schemas?.[name] === undefined) {
      findings.add(file, '/components/schemas', `missing schema "${name}"`)
    }
  }
  for (const ref of collectRefs(document)) {
    const resolved = resolveRef(ref.ref, file)
    if (resolved.value === undefined) findings.add(file, ref.pointer, `unresolved $ref "${ref.ref}"`)
  }
}

function checkAppApi(file, document, findings) {
  const snapshot = document.paths?.['/app/v3/api/ai/model_catalog']?.get
  if (snapshot === undefined) {
    findings.add(file, '/paths', 'missing GET /app/v3/api/ai/model_catalog')
    return
  }
  for (const header of ['ETag', 'X-Catalog-Revision', 'X-Catalog-Version']) {
    requireHeader(file, snapshot, '/paths/~1app~1v3~1api~1ai~1model_catalog/get', header, findings)
  }
  const envelope = document.components?.schemas?.CatalogSnapshotEnvelope
  if (envelope === undefined) {
    findings.add(file, '/components/schemas', 'missing schema "CatalogSnapshotEnvelope"')
  }
  for (const ref of collectRefs(document)) {
    const resolved = resolveRef(ref.ref, file)
    if (resolved.value === undefined) findings.add(file, ref.pointer, `unresolved $ref "${ref.ref}"`)
  }
}

function main() {
  const findings = new Findings()
  for (const file of FRAGMENTS) {
    let document
    try {
      document = readJson(file)
    } catch (error) {
      findings.add(file, '', `unreadable JSON: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    if (document.openapi !== '3.1.2') findings.add(file, '/openapi', 'must be "3.1.2"')
    if (!SEMVER.test(String(document.info?.version ?? ''))) findings.add(file, '/info/version', 'must be semver')
    if (typeof document.info?.['x-sdkwork-api-surface'] !== 'string') {
      findings.add(file, '/info/x-sdkwork-api-surface', 'must name the API surface')
    }
    checkOperations(file, document, findings)
    if (file.endsWith('open-api.openapi.json')) checkOpenApi(file, document, findings)
    else checkAppApi(file, document, findings)
  }

  if (findings.items.length > 0) {
    console.error(`model-catalog-sync-contract: ${findings.items.length} finding(s)`)
    for (const finding of findings.items) console.error(`  - ${finding}`)
    process.exitCode = 1
    return
  }
  console.log(`model-catalog-sync-contract: ok (${FRAGMENTS.length} fragments)`)
}

main()
