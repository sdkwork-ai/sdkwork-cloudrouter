import { type ReactNode } from 'react';
import type { GroupPickerOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
export interface GroupCellPopoverLabels {
    /** 弹层标题 */
    title?: string;
    /** 未绑定分组空态文案 */
    empty?: string;
    /** 底部「修改分组」按钮文案 */
    editHint?: string;
}
export interface GroupCellPopoverProps {
    /** 触发器（分组 cell 内容，如 GroupPicker） */
    children: ReactNode;
    /** 已绑定分组的展示数据（调用方按 key 过滤） */
    options: GroupPickerOption[];
    labels?: GroupCellPopoverLabels;
    /** 悬停打开预览时回调（用于懒加载分组数据） */
    onHoverOpen?: () => void;
    /** 点击「修改分组」按钮时回调（用于打开分组选择弹窗） */
    onEdit?: () => void;
    /** 触发器禁用时不再显示预览 */
    disabled?: boolean;
}
export declare function GroupCellPopover({ children, options, labels, onHoverOpen, onEdit, disabled, }: GroupCellPopoverProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GroupCellPopover.d.ts.map