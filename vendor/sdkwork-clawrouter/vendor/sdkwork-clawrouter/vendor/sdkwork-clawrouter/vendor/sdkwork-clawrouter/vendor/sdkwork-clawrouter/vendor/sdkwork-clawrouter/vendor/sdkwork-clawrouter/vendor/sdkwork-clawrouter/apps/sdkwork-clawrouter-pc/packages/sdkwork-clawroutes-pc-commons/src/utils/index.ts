export const syntaxHighlightJson = (json: unknown): string => {
  const source = escapeHtml(formatSyntaxHighlightJsonValue(json));
  return source.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match: string) {
    let cls = 'text-[#098658] dark:text-[#79c0ff]'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-[#005cc5] dark:text-[#a5d6ff] font-medium'; // key
      } else {
        cls = 'text-[#032f62] dark:text-[#ff7b72]'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-[#d73a49] dark:text-[#ffab70] font-medium'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-[#005cc5] dark:text-[#79c0ff] font-medium'; // null
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
};

function formatSyntaxHighlightJsonValue(json: unknown): string {
  if (typeof json === 'string') {
    return json;
  }
  if (typeof json === 'undefined') {
    return 'undefined';
  }

  try {
    const formatted = JSON.stringify(json, undefined, 2);
    return typeof formatted === 'string' ? formatted : String(json);
  } catch {
    return '[Unserializable JSON value]';
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
