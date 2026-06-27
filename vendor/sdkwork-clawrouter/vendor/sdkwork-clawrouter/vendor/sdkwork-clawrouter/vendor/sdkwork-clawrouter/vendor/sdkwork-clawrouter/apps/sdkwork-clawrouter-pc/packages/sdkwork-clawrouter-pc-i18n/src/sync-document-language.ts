export function syncDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
