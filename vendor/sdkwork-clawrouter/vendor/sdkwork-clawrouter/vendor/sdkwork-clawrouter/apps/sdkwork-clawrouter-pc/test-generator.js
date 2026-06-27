import { generateCodeSnippets } from './src/utils/codeGenerator.js';

const curl = `curl https://api.sdkwork.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $CLAW_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

console.log(generateCodeSnippets(curl));
