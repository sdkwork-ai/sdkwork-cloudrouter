import type { ReactNode } from 'react';
export interface ConfirmDialogProps {
    title: string;
    description: string;
    /** 附加内容（如警告、勾选项），渲染在描述文本下方 */
    children?: ReactNode;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    cancelLabel?: string;
    isBusy?: boolean;
    tone?: 'danger' | 'default';
    icon?: ReactNode;
    /** 点击遮罩（弹窗外）时是否调用 onCancel 关闭；默认 true */
    closeOnClickOutside?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function ConfirmDialog({ title, description, children, confirmLabel, confirmDisabled, cancelLabel, isBusy, tone, icon, closeOnClickOutside, onConfirm, onCancel, }: ConfirmDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ConfirmDialog.d.ts.map