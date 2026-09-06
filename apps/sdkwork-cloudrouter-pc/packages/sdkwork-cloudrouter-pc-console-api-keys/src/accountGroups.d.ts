import type { GroupPickerOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import type { GroupSelectorOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupSelector';
import type { AccountGroup } from './apiKeyService';
export declare function resolveAccountGroupName(groupCode: string, groups: AccountGroup[]): string;
export declare function resolveAccountGroupCode(groupValue: string | null | undefined, groups: AccountGroup[]): string;
export declare function toAccountGroupSelectorOptions(groups: AccountGroup[]): GroupSelectorOption[];
export declare function toGroupPickerOptions(groups: AccountGroup[]): GroupPickerOption[];
/** 构建分组标签显示翻译映射（key 为标签 code） */
export declare function buildTagLabels(t: (key: string) => string): Record<string, string>;
//# sourceMappingURL=accountGroups.d.ts.map