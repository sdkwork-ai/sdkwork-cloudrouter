import fs from 'node:fs';

const p = 'services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/ai_routing_seed.rs';
let content = fs.readFileSync(p, 'utf8');
const before = 'WHERE tenant_id = \\$1 AND organization_id = \\$2';
const after = 'WHERE tenant_id = $1 AND organization_id = $2';
if (!content.includes(before)) {
  console.log('escape pattern not found');
  process.exit(1);
}
content = content.replaceAll(before, after);
fs.writeFileSync(p, content);
console.log('fixed $1 escaping');
