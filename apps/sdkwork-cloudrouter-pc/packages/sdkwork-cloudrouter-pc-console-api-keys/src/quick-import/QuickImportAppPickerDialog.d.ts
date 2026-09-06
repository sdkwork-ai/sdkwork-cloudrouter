import { type CcSwitchApp } from './quickImport';
interface QuickImportAppPickerDialogProps {
    keyName: string;
    maskedKey: string;
    /** Plaintext key used to fetch the key-specific model list. */
    rawKey: string;
    onSelect: (app: CcSwitchApp, options: {
        name: string;
        model?: string;
    }) => void;
    onClose: () => void;
    /** 点击遮罩（弹窗外）时是否关闭；默认 true */
    closeOnClickOutside?: boolean;
    /**
     * Whether to show the app selection grid. When false the dialog only
     * configures name / default model and submits via the confirm button —
     * used for targets with unified model configuration (Birdcoder), which
     * submit with the fixed `claude` app value.
     */
    showAppSelection?: boolean;
    /** Confirm button label in configure mode (e.g. "Import to Birdcoder"). */
    confirmLabel?: string;
}
/**
 * Import configuration dialog shared by CC Switch and Birdcoder flows.
 *
 * For CC Switch the user first picks which app the relay provider belongs to
 * (CC Switch keeps a separate provider list per app); for Birdcoder — which
 * unifies model configuration — the app grid is hidden and the dialog submits
 * directly with the fixed `claude` app value. Both flows let the user adjust
 * the imported provider name and pick the default model from the model list
 * the gateway exposes for this key (`GET /v1/models`).
 *
 * The provider being imported is the Cloud Router relay itself; its official
 * website (shown on the CC Switch provider card via the `homepage` link
 * parameter) is linked from the description.
 */
export declare function QuickImportAppPickerDialog({ keyName, maskedKey, rawKey, onSelect, onClose, closeOnClickOutside, showAppSelection, confirmLabel, }: QuickImportAppPickerDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuickImportAppPickerDialog.d.ts.map