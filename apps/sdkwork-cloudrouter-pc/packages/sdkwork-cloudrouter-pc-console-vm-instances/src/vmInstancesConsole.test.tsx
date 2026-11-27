import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type {
  CreateSandboxInstanceInput,
  SandboxInstance,
  SandboxInstancesClient,
} from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';

import { vmInstancesConsoleMessages } from './i18n/index.ts';
import { VmInstancesConsoleView } from './VmInstancesConsoleView.tsx';

function instance(overrides: Partial<SandboxInstance> = {}): SandboxInstance {
  return {
    sandboxInstanceId: 'sbi-1',
    sandboxInstanceOwnerId: 'user-1',
    sandboxInstanceName: 'agent-vm-01',
    sandboxInstanceState: 'suspended',
    sandboxInstanceProfile: 'standard',
    sandboxInstanceBaseImage: 'sdkwork/sandbox-runtime:latest',
    sandboxInstanceVcpuCount: 2,
    sandboxInstanceMemoryMb: 4096,
    sandboxInstanceDiskMb: 20480,
    sandboxInstanceRequiredCapabilities: ['git', 'terminal'],
    sandboxInstanceMinimumAssurance: 'container',
    sandboxInstanceRuntimeKind: 'docker',
    sandboxInstanceAutoStart: false,
    sandboxVersion: '7',
    ...overrides,
  };
}

function stubClient(overrides: Partial<SandboxInstancesClient> = {}): SandboxInstancesClient {
  return {
    create: vi.fn(async (body: CreateSandboxInstanceInput) =>
      instance({ sandboxInstanceId: 'sbi-new', sandboxInstanceName: body.sandboxInstanceName }),
    ),
    list: vi.fn(async () => ({
      items: [] as readonly SandboxInstance[],
      pageInfo: { mode: 'offset' as const, page: 1, pageSize: 20, totalItems: '0' },
    })),
    remove: vi.fn(async () => undefined),
    retrieve: vi.fn(async () => instance()),
    update: vi.fn(async () => instance()),
    ...overrides,
  };
}

async function createTranslator() {
  const translator = createInstance();
  await translator.init({
    fallbackLng: 'en',
    lng: 'en',
    resources: { en: { translation: vmInstancesConsoleMessages.en } },
  });
  return translator;
}

async function renderPage(client: SandboxInstancesClient) {
  const i18n = await createTranslator();
  return render(
    <I18nextProvider i18n={i18n}>
      <VmInstancesConsoleView client={client} />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('vm instances console page', () => {
  test('an empty listing renders the empty frame, not a fake row', async () => {
    await renderPage(stubClient());
    await waitFor(() => expect(screen.getByText('No VM instances yet')).toBeTruthy());
    expect(screen.getAllByRole('button', { name: 'Provision VM' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('agent-vm-01')).toBeNull();
  });

  test('a row renders its shape, state, and capabilities', async () => {
    await renderPage(
      stubClient({
        list: vi.fn(async () => ({
          items: [instance()],
          pageInfo: { mode: 'offset' as const, page: 1, pageSize: 20, totalItems: '1' },
        })),
      }),
    );

    await waitFor(() => expect(screen.getByText('agent-vm-01')).toBeTruthy());
    const row = screen.getByText('agent-vm-01').closest('tr');
    expect(row).toBeTruthy();
    const rowScope = within(row as HTMLElement);
    expect(rowScope.getByText('Suspended')).toBeTruthy();
    expect(rowScope.getByText('Standard')).toBeTruthy();
    expect(rowScope.getByText('2 vCPU · 4096 MiB · 20480 MiB')).toBeTruthy();
    expect(rowScope.getByText('Git')).toBeTruthy();
    expect(rowScope.getByText('Terminal')).toBeTruthy();
    expect(rowScope.getByText('Never')).toBeTruthy();
  });

  test('a live instance cannot be deleted from the row', async () => {
    await renderPage(
      stubClient({
        list: vi.fn(async () => ({
          items: [instance({ sandboxInstanceState: 'active' })],
          pageInfo: { mode: 'offset' as const, page: 1, pageSize: 20, totalItems: '1' },
        })),
      }),
    );

    await waitFor(() => expect(screen.getByText('agent-vm-01')).toBeTruthy());
    const row = screen.getByText('agent-vm-01').closest('tr');
    expect(row).toBeTruthy();
    const deleteButton = within(row as HTMLElement).getByRole('button', { name: 'Delete' });
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
    expect(deleteButton.getAttribute('title')).toBe(
      'A running instance cannot be deleted. Suspend or terminate it first.',
    );
  });

  test('provisioning submits the validated shape and closes the drawer', async () => {
    const client = stubClient();
    await renderPage(client);
    await waitFor(() => expect(screen.getByText('No VM instances yet')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: 'Provision VM' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'agent-vm-02' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Provision VM' }));

    await waitFor(() => expect(client.create).toHaveBeenCalledTimes(1));
    expect(client.create).toHaveBeenCalledWith({
      sandboxInstanceAutoStart: false,
      sandboxInstanceBaseImage: 'sdkwork/sandbox-runtime:latest',
      sandboxInstanceDiskMb: 20480,
      sandboxInstanceMemoryMb: 4096,
      sandboxInstanceMinimumAssurance: 'container',
    sandboxInstanceRuntimeKind: 'docker',
      sandboxInstanceName: 'agent-vm-02',
      sandboxInstanceProfile: 'standard',
      sandboxInstanceRequiredCapabilities: [],
      sandboxInstanceVcpuCount: 2,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('an invalid draft never reaches the transport', async () => {
    const client = stubClient();
    await renderPage(client);
    await waitFor(() => expect(screen.getByText('No VM instances yet')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: 'Provision VM' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Provision VM' }));

    expect(await within(dialog).findByText('Name is required.')).toBeTruthy();
    expect(client.create).not.toHaveBeenCalled();
  });

  test('the state filter re-reads the listing narrowed to that state', async () => {
    const client = stubClient();
    await renderPage(client);
    await waitFor(() => expect(screen.getByText('No VM instances yet')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Filter by state'), { target: { value: 'suspended' } });

    await waitFor(() =>
      expect(client.list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        sandboxInstanceState: 'suspended',
      }),
    );
  });

  test('a refused read is reported as a failure, not as an empty account', async () => {
    await renderPage(
      stubClient({
        list: vi.fn(async () => {
          throw new Error('HTTP 401: unauthorized');
        }),
      }),
    );

    await waitFor(() => expect(screen.getByText('The VM instance list is unavailable.')).toBeTruthy());
    expect(screen.getByText(/HTTP 401: unauthorized/u)).toBeTruthy();
    expect(screen.queryByText('No VM instances yet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
