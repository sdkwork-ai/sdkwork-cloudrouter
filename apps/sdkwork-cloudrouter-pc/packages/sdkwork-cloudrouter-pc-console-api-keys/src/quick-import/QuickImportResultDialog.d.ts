import { type QuickImportResult } from './quickImport';
interface QuickImportResultDialogProps {
    result: QuickImportResult;
    /**
     * Set when the deep link was opened but no app hand-off was detected. Renders
     * an install banner above the manual import content so the user can still
     * download the app or fall back to copying the config.
     */
    appUnavailable?: boolean;
    /** Retries opening the deep link (the probe is a heuristic, so a failed
     *  hand-off may still be a false negative when the app is installed). */
    onRetryOpen?: () => void;
    onClose: () => void;
    /** 点击遮罩（弹窗外）时是否关闭；默认 true */
    closeOnClickOutside?: boolean;
}
export declare function QuickImportResultDialog({ result, appUnavailable, onRetryOpen, onClose, closeOnClickOutside }: QuickImportResultDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=QuickImportResultDialog.d.ts.map