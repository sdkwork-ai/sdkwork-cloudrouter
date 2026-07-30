import { API_BASE_URL } from '@sdkwork/clawroutes-pc-commons/runtime';
import { resolveApiRequestUrl } from '@sdkwork/clawroutes-pc-commons/runtime';

function isRequestIdentityHeader(name: string): boolean {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').endsWith('requestid');
}

function stripRequestIdentityHeaders(curlCommand: string): string {
  return curlCommand
    .replace(/\s+-H\s+"[^"]*:\s*[^"]*"/g, (header) => {
      const headerName = header.match(/^\s+-H\s+"([^":]+)\s*:/)?.[1] ?? '';
      return isRequestIdentityHeader(headerName) ? '' : header;
    })
    .trim();
}

export function generateCodeSnippets(curlCommand: string) {
  try {
    const sanitizedCurlCommand = stripRequestIdentityHeaders(curlCommand);
    // Extract URL
    const urlMatch = sanitizedCurlCommand.match(/curl\s+([^\s\\]+)/);
    const url = urlMatch?.[1] ?? resolveApiRequestUrl(API_BASE_URL, '/v1/chat/completions').url;

    // Extract Headers
    const headers: Record<string, string> = {};
    const headerRegex = /-H\s+"([^"]+)"/g;
    let match;
    while ((match = headerRegex.exec(sanitizedCurlCommand)) !== null) {
      const header = match[1];
      const separatorIndex = header?.indexOf(': ') ?? -1;
      if (header && separatorIndex > 0) {
        const name = header.slice(0, separatorIndex);
        headers[name] = header.slice(separatorIndex + 2);
      }
    }

    // Extract Body
    const bodyMatch = sanitizedCurlCommand.match(/-d\s+'([^']+)'/);
    let body = bodyMatch?.[1] ?? '{}';

    // Format JSON body for snippets
    try {
      body = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // Ignore parse error, use raw body
    }

    const jsSnippet = `fetch('${url}', {
  method: 'POST',
  headers: ${JSON.stringify(headers, null, 2)},
  body: JSON.stringify(${body})
})
.then(response => response.json())
.then(data => console.log(data));`;

    const pythonSnippet = `import requests

url = '${url}'
headers = ${JSON.stringify(headers, null, 2)}
data = ${body}

response = requests.post(url, headers=headers, json=data)
print(response.json())`;

    return {
      cURL: sanitizedCurlCommand,
      JavaScript: jsSnippet,
      Python: pythonSnippet,
    };
  } catch {
    return { cURL: curlCommand };
  }
}
