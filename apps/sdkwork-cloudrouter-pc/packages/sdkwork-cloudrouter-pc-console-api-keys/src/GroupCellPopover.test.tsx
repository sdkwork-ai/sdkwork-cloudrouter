// GroupCellPopover + GroupPicker 交互契约：hover/点击打开预览，仅「修改分组」按钮进入编辑弹窗
// 运行：pnpm --dir packages/sdkwork-cloudrouter-pc-console-api-keys exec vitest run src/GroupCellPopover.test.tsx --environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupPicker, type GroupPickerHandle } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import { GroupCellPopover } from './GroupCellPopover';

const OPTIONS = [
  { value: 'g1', label: 'Group One', description: 'desc one' },
  { value: 'g2', label: 'Group Two', description: 'desc two' },
];

afterEach(() => {
  cleanup();
});

describe('GroupCellPopover + GroupPicker integration', () => {
  it('click cell opens popover; click edit button opens picker dialog', async () => {
    const handlesRef: { current: Record<string, GroupPickerHandle | null> } = { current: {} };
    const onChange = vi.fn();

    render(
      <table>
        <tbody>
          <tr>
            <td>
              <GroupCellPopover
                options={OPTIONS}
                onEdit={() => {
                  handlesRef.current['k1']?.open();
                }}
                labels={{ title: 'Groups', empty: 'None', editHint: 'Edit groups' }}
              >
                <GroupPicker
                  ref={(handle) => {
                    handlesRef.current['k1'] = handle;
                  }}
                  disableTriggerOpen
                  options={OPTIONS}
                  value={['g1']}
                  onChange={onChange}
                  triggerLabel="Group One"
                />
              </GroupCellPopover>
            </td>
          </tr>
        </tbody>
      </table>,
    );

    // 1. click cell → popover should open
    fireEvent.click(screen.getByText('Group One'));
    await waitFor(() => {
      expect(document.querySelector('[data-sdk-group-cell-popover-panel]')).toBeTruthy();
    });
    expect(screen.getByText('Group Two')).toBeTruthy();

    // 2. click edit button → picker dialog opens
    fireEvent.click(screen.getByText('Edit groups'));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Select groups' })).toBeTruthy();
    });
  });

  it('hover alone (without click) also opens popover', async () => {
    render(
      <GroupCellPopover options={OPTIONS} labels={{ editHint: 'Edit groups' }}>
        <GroupPicker options={OPTIONS} value={[]} onChange={vi.fn()} triggerLabel="Group One" />
      </GroupCellPopover>,
    );

    fireEvent.pointerEnter(screen.getByText('Group One'));
    await waitFor(
      () => {
        expect(document.querySelector('[data-sdk-group-cell-popover-panel]')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  });
});
