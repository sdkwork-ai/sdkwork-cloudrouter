import { type ReactNode, type Ref } from 'react';
export type GroupPickerSelectionMode = 'single' | 'multiple';
export interface GroupPickerOption {
    value: string;
    label: string;
    description?: string;
    rate?: string | null;
    /** 绑定的模型厂商 code；null/undefined 表示不绑定（全局分组） */
    vendorCode?: string | null;
    /** 支持的模态（text/audio/image/video/music）；空数组表示不限制 */
    modalities?: string[];
    /** 营销/运营标签 code 列表（stable/hot/recommended/...） */
    tags?: string[];
    icon?: ReactNode;
    disabled?: boolean;
}
export interface GroupPickerVendor {
    code: string;
    label: string;
}
export interface GroupPickerLabels {
    /** 触发器占位文案 */
    triggerPlaceholder?: string;
    title?: string;
    /** 穿梭器左右列搜索框占位文案 */
    searchPlaceholder?: string;
    empty?: string;
    emptySearch?: string;
    emptySelected?: string;
    vendorAll?: string;
    modalityAll?: string;
    /** 厂商筛选下拉搜索框占位文案 */
    vendorSearchPlaceholder?: string;
    /** 厂商筛选已选计数文案（count = 已选厂商数） */
    vendorSelected?: (count: number) => string;
    available?: (count: number) => string;
    selected?: (count: number) => string;
    selectedCount?: (count: number) => string;
    addAll?: string;
    removeAll?: string;
    clear?: string;
    confirm?: string;
    cancel?: string;
    rate?: string;
    /** 模态标签覆盖，key 为模态 code（text/audio/image/video/music） */
    modalityLabels?: Record<string, string>;
    /** 标签显示覆盖，key 为标签 code；缺省时显示标签 code 原文 */
    tagLabels?: Record<string, string>;
}
export interface GroupPickerHandle {
    /** 编程式打开选择弹窗（如分组 cell 预览弹层中的编辑按钮） */
    open: () => void;
}
export interface GroupPickerProps {
    /** 全部分组（数据由调用方经 SDK 获取） */
    options: GroupPickerOption[];
    value: string[];
    onChange: (value: string[]) => void;
    /** vendor 列表；未传时从 options 的 vendorCode 去重推导 */
    vendors?: GroupPickerVendor[];
    /** 单选 / 多选，默认 multiple */
    selectionMode?: GroupPickerSelectionMode;
    /** 是否显示分组说明文字，默认 true */
    showDescription?: boolean;
    labels?: GroupPickerLabels;
    disabled?: boolean;
    /** 打开弹层时回调（用于懒加载分组数据） */
    onOpen?: () => void;
    /** 触发器文本覆盖（优先于已选计数/占位文案） */
    triggerLabel?: string;
    triggerClassName?: string;
    /** 禁用点击触发器打开弹窗（仍可通过 ref.open() 编程式打开）；默认 false */
    disableTriggerOpen?: boolean;
    /** 点击遮罩（弹窗外）时是否关闭选择弹窗；默认 true */
    closeOnClickOutside?: boolean;
    /** 命令式句柄：编程式打开选择弹窗 */
    ref?: Ref<GroupPickerHandle>;
}
export declare function GroupPicker({ options, value, onChange, vendors, selectionMode, showDescription, labels, disabled, onOpen, triggerLabel, triggerClassName, disableTriggerOpen, closeOnClickOutside, ref, }: GroupPickerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GroupPicker.d.ts.map