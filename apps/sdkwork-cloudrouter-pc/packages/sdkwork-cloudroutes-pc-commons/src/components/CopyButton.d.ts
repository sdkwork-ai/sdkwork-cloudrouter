export type CopyButtonVariant = 'icon' | 'inline' | 'menu';
export type CopyButtonStatus = 'idle' | 'copying' | 'copied' | 'failed';
export type CopyButtonProps = {
    text: string;
    label?: string;
    copiedLabel?: string;
    errorLabel?: string;
    className?: string;
    iconClassName?: string;
    title?: string;
    disabled?: boolean;
    variant?: CopyButtonVariant;
    onCopied?: () => void;
};
export declare function CopyButton({ text, label, copiedLabel, errorLabel, className, iconClassName, title, disabled, variant, onCopied, }: CopyButtonProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CopyButton.d.ts.map