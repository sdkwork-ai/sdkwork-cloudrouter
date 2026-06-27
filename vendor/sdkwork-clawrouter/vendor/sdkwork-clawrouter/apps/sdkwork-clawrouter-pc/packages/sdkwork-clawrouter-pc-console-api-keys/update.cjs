const fs = require('fs');
const content = fs.readFileSync('packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx', 'utf8');

const regex = /\s*\{\/\* Edit Modal \(Simple Dialog\) \*\/\}.*?\{\/\* Success Modal to show created key \*\/\}/s;

const newContent = content.replace(regex, `
      <CreateKeyDrawer
        isOpen={!!editKey}
        mode="edit"
        initialData={editKey}
        onClose={() => setEditKey(null)}
        onSubmit={handleEditSubmit}
      />

      {/* View Details Modal */}
      <CreateKeyDrawer
        isOpen={!!detailsKey}
        mode="view"
        initialData={detailsKey}
        onClose={() => setDetailsKey(null)}
      />

      {/* Success Modal to show created key */}`);

fs.writeFileSync('packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx', newContent);
console.log('Done');
