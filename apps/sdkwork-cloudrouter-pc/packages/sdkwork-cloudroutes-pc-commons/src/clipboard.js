const COPY_UNAVAILABLE_MESSAGE = 'Clipboard copy is unavailable in this browser.';
const COPY_DENIED_MESSAGE = 'Clipboard permission was denied. Copy the value manually.';
export async function copyTextToClipboard(text) {
    if (!text) {
        return { ok: false, reason: 'empty', message: 'There is no text to copy.' };
    }
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard?.writeText) {
        return { ok: false, reason: 'unsupported', message: COPY_UNAVAILABLE_MESSAGE };
    }
    try {
        await clipboard.writeText(text);
        return { ok: true };
    }
    catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
            return { ok: false, reason: 'denied', message: COPY_DENIED_MESSAGE };
        }
        return { ok: false, reason: 'unknown', message: COPY_UNAVAILABLE_MESSAGE };
    }
}
//# sourceMappingURL=clipboard.js.map