/**
 * DOM-level regression for the模型前端配置 header action.
 *
 * The operator must be able to re-import the sdkwork-models catalog from the
 * page header beside "Save configuration"; the action has to call the Rust
 * models sync endpoint, align every surface with the refreshed catalog, and
 * persist the aligned document as its own revision with the editor's base
 * revision.
 */
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from './packages/sdkwork-cloudroutes-pc-commons/src/app-session-token.ts'
import { resetCloudRouterSdkClients } from './packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const dictionary: Record<string, string> = {
        'admin.model.frontend.syncCatalog': 'Update model data',
        'admin.model.frontend.syncingCatalog': 'Updating...',
        'admin.model.frontend.syncSummaryTitle': 'Model data synchronization',
        'admin.model.frontend.syncCatalogDone': 'Model data synchronized',
        'admin.model.frontend.syncCatalogNoChange': 'Model data synchronized; already aligned',
        'admin.model.frontend.save': 'Save configuration',
        'admin.model.frontend.saved': 'Saved',
      }
      if (key === 'admin.model.frontend.syncCatalogDone') {
        return `${dictionary[key]} (${String(options?.models ?? '')} models)`
      }
      return dictionary[key] ?? key
    },
    i18n: { language: 'en-US' },
  }),
}))

const { FrontendModelAdmin } = await import('@sdkwork/models-pc-admin-catalog')

function envelope(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data, traceId: 'test-trace' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function catalogModel(
  id: string,
  model: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    vendorId: 'v_deepseek',
    vendorCode: 'deepseek',
    model,
    displayName: model,
    type: 'Chat',
    regionPrices: [],
    status: 'active',
    calls: '0',
    description: null,
    modalities: ['text'],
    inputModalities: ['text'],
    outputModalities: ['text'],
    apiFormat: 'openai_completions',
    capabilityIntro: null,
    limitations: [],
    supportedLanguages: [],
    useCases: [],
    trainingDataCutoff: null,
    contextTokens: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonSchema: true,
    releaseStage: 1,
    shelfState: 1,
    routingState: 1,
    replacementModel: null,
    ...overrides,
  }
}

function frontendModel(catalogKey: string, modelId: string, visible = true) {
  return {
    catalogKey,
    modelId,
    visible,
    featured: false,
    sortOrder: 10,
    badge: null,
    config: {},
  }
}

const ORIGINAL_FETCH = globalThis.fetch

describe('模型前端配置 header model data sync', () => {
  let putBody: Record<string, unknown> | undefined
  let syncCalls = 0

  beforeEach(() => {
    putBody = undefined
    syncCalls = 0
    storeAppSessionFromResult({
      accessToken: 'test-access-token',
      authToken: 'test-auth-token',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      sessionId: 'test-session',
    })
    resetCloudRouterSdkClients()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'
      const path = url.split('?')[0]
      if (path === '/backend/v3/api/ai/frontend_config' && method === 'GET') {
        return envelope({
          revision: 3,
          channels: [{
            channelCode: 'llm',
            displayName: 'LLM',
            displayNameI18n: {},
            description: null,
            enabled: true,
            sortOrder: 10,
            defaultCatalogKey: 'deepseek/deepseek-gone',
            capabilityCodes: ['chat'],
            config: {},
            schemaVersion: '1.0.0',
            revision: 3,
            models: [
              frontendModel('deepseek/deepseek-current', '10'),
              frontendModel('deepseek/deepseek-gone', '9'),
            ],
            fields: [],
          }],
        })
      }
      if (path === '/backend/v3/api/ai/frontend_config' && method === 'PUT') {
        putBody = JSON.parse(String(init?.body)) as Record<string, unknown>
        return envelope({ revision: 4, channels: putBody.channels })
      }
      if (path === '/backend/v3/api/ai/models' && method === 'GET') {
        return envelope({
          items: [
            catalogModel('10', 'deepseek-current'),
            catalogModel('11', 'deepseek-next'),
            catalogModel('12', 'deepseek-retired', { status: 'inactive' }),
          ],
          pageInfo: { page: 1, pageSize: 200, totalItems: 3, hasMore: false },
        })
      }
      if (path === '/backend/v3/api/ai/models/sync' && method === 'POST') {
        syncCalls += 1
        return envelope({
          synced: true,
          source: 'sdkwork_models',
          mode: 'official_refresh',
          dryRun: false,
          catalogVersion: '2026.11.23.1',
          requestedCatalogVersion: '2026.11.23.1',
          catalogRoot: null,
          vendorCodes: ['deepseek'],
          sourceHash: 'a'.repeat(64),
          meterCount: 1,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 2,
          capabilityCount: 1,
          priceCount: 3,
          rankingCount: 0,
          voiceCount: 0,
          voiceBindingCount: 0,
          videoProfileCount: 0,
          acceptedCount: 8,
          snapshotId: 'snapshot-1',
          syncRunId: 'sync-run-1',
          vendors: [],
          models: [],
        })
      }
      throw new Error(`unexpected request ${method} ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    globalThis.fetch = ORIGINAL_FETCH
    clearStoredAppSessionToken()
    resetCloudRouterSdkClients()
  })

  it('syncs the catalog, aligns the surface and persists the aligned revision', async () => {
    render(<FrontendModelAdmin />)
    await screen.findByText('LLM')
    fireEvent.click(screen.getByRole('button', { name: 'Update model data' }))
    await screen.findByText(/Model data synchronized/)

    expect(syncCalls).toBe(1)
    expect(putBody).toBeDefined()
    expect(putBody?.expectedRevision).toBe(3)
    expect(putBody?.source).toBe('model_sync_alignment')
    const channels = putBody?.channels as Array<{
      channelCode: string
      defaultCatalogKey: string | null
      models: Array<{ catalogKey: string; modelId: string | null; visible: boolean }>
    }>
    const llm = channels.find(channel => channel.channelCode === 'llm')
    expect(llm).toBeDefined()
    expect(llm?.defaultCatalogKey).toBe('deepseek/deepseek-current')
    const gone = llm?.models.find(model => model.catalogKey === 'deepseek/deepseek-gone')
    expect(gone).toMatchObject({ visible: false, modelId: null })
    const current = llm?.models.find(model => model.catalogKey === 'deepseek/deepseek-current')
    expect(current?.modelId).toBe('10')
    expect(screen.getByText('Model data synchronization')).toBeTruthy()
  })

  it('does not PUT when the surface is already aligned', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'
      const path = url.split('?')[0]
      if (path === '/backend/v3/api/ai/frontend_config' && method === 'GET') {
        return envelope({
          revision: 3,
          channels: [{
            channelCode: 'llm',
            displayName: 'LLM',
            displayNameI18n: {},
            description: null,
            enabled: true,
            sortOrder: 10,
            defaultCatalogKey: 'deepseek/deepseek-current',
            capabilityCodes: ['chat'],
            config: {},
            schemaVersion: '1.0.0',
            revision: 3,
            models: [frontendModel('deepseek/deepseek-current', '10')],
            fields: [],
          }],
        })
      }
      if (path === '/backend/v3/api/ai/models/sync' && method === 'POST') {
        return envelope({
          synced: true,
          source: 'sdkwork_models',
          mode: 'official_refresh',
          dryRun: false,
          catalogVersion: '2026.11.23.1',
          requestedCatalogVersion: '2026.11.23.1',
          catalogRoot: null,
          vendorCodes: ['deepseek'],
          sourceHash: 'a'.repeat(64),
          meterCount: 1,
          vendorCount: 1,
          familyCount: 1,
          modelCount: 1,
          capabilityCount: 1,
          priceCount: 1,
          rankingCount: 0,
          voiceCount: 0,
          voiceBindingCount: 0,
          videoProfileCount: 0,
          acceptedCount: 1,
          snapshotId: 'snapshot-1',
          syncRunId: 'sync-run-1',
          vendors: [],
          models: [catalogModel('10', 'deepseek-current')],
        })
      }
      if (path === '/backend/v3/api/ai/frontend_config' && method === 'PUT') {
        throw new Error('an already aligned surface must not be rewritten')
      }
      throw new Error(`unexpected request ${method} ${url}`)
    }) as typeof fetch

    render(<FrontendModelAdmin />)
    await screen.findByText('LLM')
    fireEvent.click(screen.getByRole('button', { name: 'Update model data' }))
    await screen.findByText(/already aligned/)
  })
})
