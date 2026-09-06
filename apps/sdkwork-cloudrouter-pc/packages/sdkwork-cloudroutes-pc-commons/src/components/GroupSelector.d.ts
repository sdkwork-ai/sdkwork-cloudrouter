import { type ReactNode } from 'react';
export type GroupSelectorSelectionMode = 'single' | 'multiple';
export interface GroupSelectorOption {
    /** 提交值（例如分组 code） */
    value: string;
    /** 名称 */
    label: string;
    /** 名称下方的说明文字 */
    description?: string;
    /** 倍率，展示在选项右侧徽章 */
    rate?: string | null;
    /** 自定义图标；未提供时按 value 哈希确定性配色渲染默认图标 */
    icon?: ReactNode;
    disabled?: boolean;
}
export interface GroupSelectorLabels {
    searchPlaceholder?: string;
    empty?: string;
    emptySearch?: string;
    loading?: string;
    clear?: string;
    selectedCount?: (count: number) => string;
    /** 倍率徽章 title（前缀固定为 ×） */
    rate?: string;
}
export interface GroupSelectorProps {
    options: GroupSelectorOption[];
    /** 单选传 string，多选传 string[] */
    value: string | string[] | null | undefined;
    onChange: (value: string | string[]) => void;
    /** 通过属性配置单选 / 多选，默认 single */
    selectionMode?: GroupSelectorSelectionMode;
    /** 顶部过滤输入框，默认开启 */
    filterable?: boolean;
    /** 触发器形态：表单字段 / 行内紧凑徽章 */
    variant?: 'field' | 'compact';
    /** 打开弹层时展示加载态（配合 onOpen 懒加载数据） */
    loading?: boolean;
    /** 是否在选项名称下方显示说明文字，默认 true */
    showDescription?: boolean;
    /** 触发器 hover 时展示当前选中分组详情卡片（含说明与倍率） */
    hoverCard?: boolean;
    disabled?: boolean;
    placeholder?: string;
    /** 弹层面板宽度（px），默认取触发器宽度且不小于 280 */
    width?: number;
    labels?: GroupSelectorLabels;
    /** 弹层打开时回调（用于懒加载） */
    onOpen?: () => void;
    /** 触发器 title（tooltip） */
    title?: string;
    className?: string;
}
/**
 * 倍率格式化：保留 4 位小数，并去除末尾多余的 0。
 * 例如 "0.100" -> "0.1"、"1.23456" -> "1.2346"、"2" -> "2"。
 * 非数字文本原样返回。
 */
export declare function formatGroupMultiplier(value: string | null | undefined): string | null;
export declare function GroupSelector({ options, value, onChange, selectionMode, filterable, variant, loading, showDescription, hoverCard, disabled, placeholder, width, labels, onOpen, title, className, }: GroupSelectorProps): import("react/jsx-runtime").JSX.Element;
export declare function OptionIconTile({ option, size, }: {
    option: Pick<GroupSelectorOption, 'value' | 'label' | 'icon'>;
    size: 'tiny' | 'sm' | 'md';
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GroupSelector.d.ts.map