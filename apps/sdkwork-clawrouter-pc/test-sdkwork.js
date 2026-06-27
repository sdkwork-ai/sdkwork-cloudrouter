import { CodeGeneratorFactory } from 'sdkwork-code-generator/dist/index.es.js';

const curl = `curl https://api.sdkwork.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $CLAW_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

function parseCurl(curl) {
  const headers = [];
  let body = null;

  const headerRegex = /-H\s+["']([^"']+)["']/g;
  let match;
  while ((match = headerRegex.exec(curl)) !== null) {
    const [key, ...values] = match[1].split(/:\s*/);
    headers.push({
      name: key,
      in: 'header',
      value: values.join(': ')
    });
  }

  const bodyRegex = /-d\s+('([^']+)'|"([^"]+)")/s;
  const bodyMatch = bodyRegex.exec(curl);
  if (bodyMatch) {
    try {
      body = JSON.parse(bodyMatch[2] || bodyMatch[3]);
    } catch (e) {
      body = bodyMatch[2] || bodyMatch[3];
    }
  }

  return { headers, body };
}

const { headers, body } = parseCurl(curl);

const operation = {
  responses: {}
};

const context = {
  baseUrl: 'https://api.sdkwork.com',
  language: 'typescript',
  library: 'axios',
  openAPISpec: { openapi: '3.0.0', info: { title: '', version: '' }, paths: {} }
};

const generator = CodeGeneratorFactory.getGenerator('typescript', 'axios');
const code = generator.generateCode(
  '/v1/chat/completions',
  'POST',
  'https://api.sdkwork.com',
  operation,
  [], // cookies
  headers, // headers
  [], // queryParams
  body, // requestBody
  context
);

console.log(code);
