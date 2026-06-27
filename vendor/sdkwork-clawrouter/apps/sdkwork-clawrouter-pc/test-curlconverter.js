import * as curlconverter from 'curlconverter';

const curl = `curl https://api.sdkwork.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $CLAW_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

console.log(curlconverter.toPython(curl));
console.log(curlconverter.toNodeFetch(curl));
console.log(curlconverter.toGo(curl));
console.log(curlconverter.toJava(curl));
