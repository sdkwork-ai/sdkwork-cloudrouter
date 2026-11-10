import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deploymentsBaseUrl,
  fetchDeploymentsCatalog,
  readDownloadsPointer,
} from './packages/sdkwork-cloudrouter-pc-home/src/downloads/deploymentsCatalog.ts'

function response(payload: unknown, ok = true): Response {
  return { ok, json: async () => payload } as unknown as Response
}

test('a pointer is only a non-empty catalog key', () => {
  assert.equal(readDownloadsPointer({ catalogKey: ' birdcoder-desktop ' }), 'birdcoder-desktop')
  assert.equal(readDownloadsPointer({ catalogKey: '' }), undefined)
  assert.equal(readDownloadsPointer({ catalogKey: 42 }), undefined)
  assert.equal(readDownloadsPointer({ cards: [] }), undefined)
  assert.equal(readDownloadsPointer(null), undefined)
  assert.equal(readDownloadsPointer('birdcoder'), undefined)
})

test('the configured origin is trimmed and an absent origin stays empty', async () => {
  assert.equal(deploymentsBaseUrl(), '')
  let calls = 0
  const catalog = await fetchDeploymentsCatalog('   ', 'birdcoder-desktop', (async () => {
    calls += 1
    return response({ data: {} })
  }) as typeof fetch)
  assert.equal(catalog, undefined)
  assert.equal(calls, 0)
})

test('a published catalog returns the envelope data and encodes the key', async () => {
  const urls: string[] = []
  const catalog = await fetchDeploymentsCatalog(
    'https://deploy.example.com/',
    'birdcoder desktop',
    (async (input: unknown) => {
      urls.push(String(input))
      return response({ data: { schemaVersion: '2026-05-18.sdkwork-download-catalog.v1' } })
    }) as typeof fetch,
  )
  assert.deepEqual(catalog, { schemaVersion: '2026-05-18.sdkwork-download-catalog.v1' })
  assert.deepEqual(urls, [
    'https://deploy.example.com/app/v3/api/downloads/catalog/birdcoder%20desktop',
  ])
})

test('rejections and unexpected payloads fall back to the bundled catalog', async () => {
  assert.equal(
    await fetchDeploymentsCatalog('https://deploy.example.com', 'k', (async () =>
      response({}, false)) as typeof fetch),
    undefined,
  )
  assert.equal(
    await fetchDeploymentsCatalog('https://deploy.example.com', 'k', (async () =>
      response({ data: undefined })) as typeof fetch),
    undefined,
  )
  assert.equal(
    await fetchDeploymentsCatalog('https://deploy.example.com', 'k', (async () =>
      response(null)) as typeof fetch),
    undefined,
  )
  assert.equal(
    await fetchDeploymentsCatalog('https://deploy.example.com', 'k', (async () => {
      throw new Error('offline')
    }) as typeof fetch),
    undefined,
  )
})
