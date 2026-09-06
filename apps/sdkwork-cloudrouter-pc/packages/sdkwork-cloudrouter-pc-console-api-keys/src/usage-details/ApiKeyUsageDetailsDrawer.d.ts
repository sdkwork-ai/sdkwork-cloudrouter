import type { ApiKey } from '../apiKeyService';
interface ApiKeyUsageDetailsDrawerProps {
    isOpen: boolean;
    apiKey: ApiKey | null;
    onClose: () => void;
    /** 点击遮罩（抽屉外）时是否关闭；默认 true */
    closeOnClickOutside?: boolean;
}
export declare function ApiKeyUsageDetailsDrawer({ isOpen, apiKey, onClose, closeOnClickOutside, }: ApiKeyUsageDetailsDrawerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ApiKeyUsageDetailsDrawer.d.ts.map