export type CopyTextResult = {
    ok: true;
} | {
    ok: false;
    reason: 'empty' | 'unsupported' | 'denied' | 'unknown';
    message: string;
};
export declare function copyTextToClipboard(text: string): Promise<CopyTextResult>;
//# sourceMappingURL=clipboard.d.ts.map