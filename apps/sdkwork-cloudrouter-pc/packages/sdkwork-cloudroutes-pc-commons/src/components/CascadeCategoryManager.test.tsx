// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CascadeCategoryManager,
  type CascadeCategoryNode,
  type CascadeCategoryManagerLabels,
} from './CascadeCategoryManager';

const labels: CascadeCategoryManagerLabels = {
  columnTitles: ['L1', 'L2', 'L3', 'L4', 'L5'],
  loading: 'Loading',
  empty: 'No categories',
  emptyColumn: 'No children',
  selectHint: 'Select a parent first',
};

function node(id: string, parentId: string | undefined, displayName: string): CascadeCategoryNode {
  return { id, ...(parentId ? { parentId } : {}), displayName };
}

const items: CascadeCategoryNode[] = [
  node('l1', undefined, 'Level one'),
  node('l2', 'l1', 'Level two'),
  node('l3', 'l2', 'Level three'),
  node('l4', 'l3', 'Level four'),
  node('l5', 'l4', 'Level five'),
];

afterEach(cleanup);

describe('CascadeCategoryManager', () => {
  it('renders five cascade columns and drills through five levels', () => {
    const onSelect = vi.fn();
    render(
      <CascadeCategoryManager
        actions={{ node: (item) => <button type="button">{`edit ${item.id}`}</button> }}
        items={items}
        labels={labels}
        onSelect={onSelect}
      />,
    );

    expect(screen.getAllByRole('listbox')).toHaveLength(5);
    expect(screen.getByText('Level one')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Level one'));
    expect(screen.getByText('Level two')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Level two'));
    fireEvent.click(screen.getByText('Level three'));
    fireEvent.click(screen.getByText('Level four'));
    expect(screen.getByText('Level five')).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(4);

    // Level 5 has no deeper column action and its node is selectable.
    expect(screen.getByRole('button', { name: 'edit l5' })).toBeInTheDocument();
  });

  it('renders column-level create slots and respects maxDepth', () => {
    render(
      <CascadeCategoryManager
        actions={{ create: (level) => <button type="button">{`create L${level}`}</button> }}
        items={items}
        labels={labels}
        maxDepth={3}
      />,
    );

    expect(screen.getAllByRole('listbox')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'create L1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'create L4' })).toBeNull();
  });

  it('keeps the selected path when the item list is refreshed', () => {
    const { rerender } = render(
      <CascadeCategoryManager items={items} labels={labels} />,
    );
    fireEvent.click(screen.getByText('Level one'));
    fireEvent.click(screen.getByText('Level two'));
    expect(screen.getByText('Level three')).toBeInTheDocument();

    rerender(
      <CascadeCategoryManager
        items={items.map((item) => ({ ...item, displayName: `${item.displayName}!` }))}
        labels={labels}
      />,
    );

    expect(screen.getByText('Level one!')).toBeInTheDocument();
    expect(screen.getByText('Level two!')).toBeInTheDocument();
    expect(screen.getByText('Level three!')).toBeInTheDocument();
  });

  it('does not clear the selection during a transient empty reload', () => {
    const { rerender } = render(
      <CascadeCategoryManager items={items} labels={labels} />,
    );
    fireEvent.click(screen.getByText('Level one'));
    expect(screen.getByText('Level two')).toBeInTheDocument();

    rerender(<CascadeCategoryManager items={[]} labels={labels} />);
    rerender(<CascadeCategoryManager items={items} labels={labels} />);

    expect(screen.getByText('Level one')).toBeInTheDocument();
    expect(screen.getByText('Level two')).toBeInTheDocument();
  });
});
