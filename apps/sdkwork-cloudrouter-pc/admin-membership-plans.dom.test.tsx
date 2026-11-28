/**
 * DOM regression for the redesigned admin plans console.
 *
 * The catalog now has two classification axes that must stay visible together:
 * audience (who buys) crossed with purchase model (how it is billed). This test
 * renders the real page against a mocked membership backend and asserts the
 * quadrant navigation, the coverage summary, and the classified table rows.
 *
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => {
  const dictionary: Record<string, string> = {
    'admin.commerce.memberships.quadrant.personalSubscription': 'Personal · Subscription',
    'admin.commerce.memberships.quadrant.personalOneTime': 'Personal · One-time',
    'admin.commerce.memberships.quadrant.teamSubscription': 'Enterprise · Subscription',
    'admin.commerce.memberships.quadrant.teamOneTime': 'Enterprise · One-time',
    'admin.commerce.memberships.audience.personal': 'Personal',
    'admin.commerce.memberships.audience.team': 'Enterprise',
    'admin.commerce.memberships.purchaseModel.subscription': 'Subscription',
    'admin.commerce.memberships.purchaseModel.oneTime': 'One-time',
    'admin.commerce.memberships.purchaseModel.mixed': 'Subscription + One-time',
    'admin.commerce.memberships.purchaseModel.unlisted': 'Not on sale',
    'admin.commerce.memberships.category.token': 'Token Plan',
    'admin.commerce.memberships.category.community': 'Community',
    'admin.commerce.memberships.status.active': 'Active',
    'admin.commerce.memberships.status.disabled': 'Disabled',
  }
  return {
    useTranslation: () => ({
      t: (key: string, second?: unknown, third?: Record<string, unknown>) => {
        const template = typeof second === 'string' ? second : (dictionary[key] ?? key)
        const options = (typeof second === 'object' ? second : third) as Record<string, unknown> | undefined
        if (!options) {
          return template
        }
        return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(options[name] ?? ''))
      },
      i18n: { language: 'en-US', resolvedLanguage: 'en-US' },
    }),
  }
})

const { MembershipPlansPage } = await import(
  './packages/sdkwork-cloudrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx'
)
const {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} = await import('./packages/sdkwork-cloudroutes-pc-commons/src/app-session-token.ts')
const { resetCloudRouterSdkClients } = await import(
  './packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts'
)

const originalFetch = globalThis.fetch

const planRows = [
  {
    id: 'plan-basic',
    code: 'basic',
    name: 'Basic',
    rank: '1',
    status: 'active',
    category: 'token',
    audience: 'personal',
    benefits: [],
    packageCount: '3',
    billingCycles: ['month', 'year'],
    updatedAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'plan-team-starter',
    code: 'team-starter',
    name: 'Team Starter',
    rank: '1',
    status: 'active',
    category: 'token',
    audience: 'team',
    benefits: [],
    packageCount: '2',
    billingCycles: ['once'],
    updatedAt: '2026-11-02T00:00:00Z',
  },
]

function installBackendMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const path = new URL(url, 'http://sdkwork.test').pathname
    if (path.endsWith('/memberships/plans')) {
      return new Response(JSON.stringify({
        code: 0,
        data: {
          items: planRows,
          pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '2', totalPages: 1, hasMore: false },
        },
        traceId: 'test-trace',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/auth/sessions') || path.includes('/app/v3/api/auth')) {
      return new Response(JSON.stringify({
        code: 0,
        data: { accessToken: 'dom-test-access-token', authToken: 'dom-test-auth-token' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ code: 0, data: { items: [], pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '0', totalPages: 0, hasMore: false } } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

describe('admin membership plans console', () => {
  beforeEach(() => {
    installBackendMock()
    clearStoredAppSessionToken()
    storeAppSessionFromResult({
      code: 0,
      data: { accessToken: 'dom-test-access-token', authToken: 'dom-test-auth-token' },
    })
    resetCloudRouterSdkClients()
  })

  afterEach(() => {
    cleanup()
    clearStoredAppSessionToken()
    resetCloudRouterSdkClients()
    globalThis.fetch = originalFetch
  })

  it('renders the audience x purchase-model quadrants and the classified plan table', async () => {
    render(<MembershipPlansPage />)

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeTruthy()
    })

    // The four sellable quadrants are the primary navigation.
    for (const label of [
      'Personal · Subscription',
      'Personal · One-time',
      'Enterprise · Subscription',
      'Enterprise · One-time',
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }

    // Classification columns exist and are populated per row. Assertions are
    // scoped to the table because the same words also label the filter controls.
    const table = screen.getByRole('table')
    expect(within(table).getByText('Audience')).toBeTruthy()
    expect(within(table).getByText('Purchase model')).toBeTruthy()
    expect(within(table).getByText('Billing cycles')).toBeTruthy()

    // Two rows: a personal subscription plan and an enterprise one-time plan.
    expect(within(table).getByText('Basic')).toBeTruthy()
    expect(within(table).getByText('Team Starter')).toBeTruthy()
    expect(within(table).getByText('Subscription')).toBeTruthy()
    expect(within(table).getByText('One-time')).toBeTruthy()
    // Audience appears in the group header and again in each row's audience cell.
    expect(within(table).getAllByText('Personal').length).toBeGreaterThanOrEqual(2)
    expect(within(table).getAllByText('Enterprise').length).toBeGreaterThanOrEqual(2)

    // Audience grouping keeps "who buys" visible when the whole catalog is shown.
    expect(screen.getAllByText(/plans · .* with a subscription package/).length).toBeGreaterThan(0)
  })

  it('filters by purchase model without dropping the audience grouping', async () => {
    render(<MembershipPlansPage />)
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeTruthy()
    })

    // The one-time segmented filter is the second radio group option.
    const oneTimeRadio = screen.getAllByRole('radio', { name: 'One-time' })
    fireEvent.click(oneTimeRadio[0]!)

    await waitFor(() => {
      expect(screen.queryByText('Basic')).toBeNull()
    })
    expect(screen.getByText('Team Starter')).toBeTruthy()
  })

  it('sends the audience slice to the API and hides quadrant counts once filtered', async () => {
    const requestedUrls: string[] = []
    const mockFetch = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      requestedUrls.push(url)
      return mockFetch(input as RequestInfo, init)
    }) as typeof fetch

    render(<MembershipPlansPage />)
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeTruthy()
    })

    // Full catalog view: every quadrant carries a count.
    expect(document.querySelectorAll('[data-quadrant-count]').length).toBe(4)

    // Switching audience must be a server-side slice, not a client filter.
    const enterpriseRadio = screen.getAllByRole('radio', { name: 'Enterprise' })
    fireEvent.click(enterpriseRadio[0]!)

    await waitFor(() => {
      expect(requestedUrls.some((url) => url.includes('audience=team'))).toBe(true)
    })
    // Other quadrants have no truthful count in a filtered view, so the cards
    // stop printing numbers instead of showing a false zero.
    await waitFor(() => {
      expect(document.querySelectorAll('[data-quadrant-count]').length).toBe(0)
    })
  })

  it('locks the audience control while the plan still has sellable packages', async () => {
    render(<MembershipPlansPage />)
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeTruthy()
    })

    // Open the edit drawer for the plan with packageCount = 3.
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    const dialog = within(screen.getByRole('dialog'))
    const personalAudience = dialog.getByRole('button', { name: /Personal/ })
    expect(personalAudience).toHaveProperty('disabled', true)
    expect(dialog.getByText(/audience is locked/i)).toBeTruthy()
  })
})
