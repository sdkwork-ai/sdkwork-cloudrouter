import { type GroupPickerVendor } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import type { AccountGroup, ApiKey } from './apiKeyService';
import { type ApiKeyFormValues as ApiKeyFormValuesContract } from './apiKeyForm';
export type ApiKeyFormValues = ApiKeyFormValuesContract;
interface KeyFormDrawerProps {
    isOpen: boolean;
    mode?: 'create' | 'view' | 'edit';
    initialData?: ApiKey | null;
    groups: AccountGroup[];
    groupsLoading?: boolean;
    /** 模型厂商列表（code + 显示名）；未传时由分组选项去重推导 */
    vendors?: GroupPickerVendor[];
    submitting?: boolean;
    onClose: () => void;
    onRequestGroups?: () => void;
    onSubmit?: (data: ApiKeyFormValues) => void | Promise<void>;
    /** 点击遮罩（抽屉外）时是否关闭；默认 true */
    closeOnClickOutside?: boolean;
}
export declare function CreateKeyDrawer({ isOpen, mode, initialData, groups, groupsLoading, vendors, submitting, onClose, onRequestGroups, onSubmit, closeOnClickOutside, }: KeyFormDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=CreateKeyDrawer.d.ts.map