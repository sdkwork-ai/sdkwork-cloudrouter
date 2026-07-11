// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatewayView } from './GatewayView';
import {
  GatewayService,
  type GatewayTrace,
  type GatewayTracePage,
} from './gatewayService';

vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({ t }),
  };
});

vi.mock('@sdkwork/clawroutes-pc-commons', () => ({
  BusinessStatePanel: ({
    kind,
    title,
    description,
    onRetry,
    retryLabel,
  }: {
    kind: string;
    title: string;
    description?: string;
    onRetry?: () => void;
    retryLabel?: string;
  }) => (
    <div data-testid={`business-state-${kind}`}>
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
      {onRetry ? <button type="button" onClick={onRetry}>{retryLabel}</button> : null}
    </div>
  ),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function trace(id: string): GatewayTrace {
  return {
    id,
    time: '2026-05-05T08:00:00Z',
    ip: '10.***.***.11',
    endpoint: '/v1/chat/completions',
    method: 'POST',
    status: 200,
    duration: '128ms',
    channel: 'openai-main',
  };
}

function page(
  items: GatewayTrace[],
  hasMore: boolean,
  nextCursor: string | null,
): GatewayTracePage {
  return {
    items,
    pageInfo: {
      mode: 'cursor',
      pageSize: 20,
      hasMore,
      nextCursor,
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GatewayView cursor pagination', () => {
  it('keeps the current page visible, prevents duplicate continuation requests, and appends unique rows', async () => {
    const firstRequest = deferred<GatewayTracePage>();
    const continuationRequest = deferred<GatewayTracePage>();
    const fetchTraces = vi.spyOn(GatewayService, 'fetchTraces')
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => continuationRequest.promise);

    render(<GatewayView />);
    expect(screen.getByTestId('business-state-loading')).toBeTruthy();

    await act(async () => {
      firstRequest.resolve(page([trace('trace-1')], true, 'opaque-next-cursor'));
      await firstRequest.promise;
    });

    expect(await screen.findByText('trace-1')).toBeTruthy();
    const loadMoreButton = screen.getByRole('button', {
      name: 'console.gateway.pagination.loadMore',
    });
    fireEvent.click(loadMoreButton);
    fireEvent.click(loadMoreButton);

    expect(fetchTraces).toHaveBeenCalledTimes(2);
    expect(fetchTraces).toHaveBeenNthCalledWith(1, { pageSize: 20 });
    expect(fetchTraces).toHaveBeenNthCalledWith(2, {
      cursor: 'opaque-next-cursor',
      pageSize: 20,
    });
    expect(screen.getByText('trace-1')).toBeTruthy();
    expect(screen.getByRole('button')).toBeDisabled();

    await act(async () => {
      continuationRequest.resolve(page(
        [trace('trace-1'), trace('trace-2')],
        false,
        null,
      ));
      await continuationRequest.promise;
    });

    expect(await screen.findByText('trace-2')).toBeTruthy();
    expect(screen.getAllByText('trace-1')).toHaveLength(1);
    expect(screen.queryByRole('button', {
      name: 'console.gateway.pagination.loadMore',
    })).toBeNull();
  });

  it('keeps loaded rows after a continuation failure and retries the same cursor', async () => {
    const fetchTraces = vi.spyOn(GatewayService, 'fetchTraces')
      .mockResolvedValueOnce(page([trace('trace-1')], true, 'retry-cursor'))
      .mockRejectedValueOnce(new Error('internal transport detail'))
      .mockResolvedValueOnce(page([trace('trace-2')], false, null));

    render(<GatewayView />);
    expect(await screen.findByText('trace-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {
      name: 'console.gateway.pagination.loadMore',
    }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'console.gateway.states.loadMoreErrorFallback',
    );
    expect(screen.getByText('trace-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'common.actions.retry' }));
    await waitFor(() => expect(fetchTraces).toHaveBeenCalledTimes(3));
    expect(fetchTraces).toHaveBeenNthCalledWith(2, {
      cursor: 'retry-cursor',
      pageSize: 20,
    });
    expect(fetchTraces).toHaveBeenNthCalledWith(3, {
      cursor: 'retry-cursor',
      pageSize: 20,
    });
    expect(await screen.findByText('trace-2')).toBeTruthy();
    expect(screen.getByText('trace-1')).toBeTruthy();
  });
});
