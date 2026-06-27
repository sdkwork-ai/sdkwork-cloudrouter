const fs = require('fs');
const path = require('path');

const viewsDir = 'packages/sdkwork-clawrouter-pc-playground/src/components/views';
const views = ['ImageView.tsx', 'VideoView.tsx', 'MusicView.tsx', 'AudioView.tsx', 'SfxView.tsx'];

views.forEach(view => {
  const file = path.join(viewsDir, view);
  let content = fs.readFileSync(file, 'utf8');

  // Need to import SharedHistoryView
  if (!content.includes('SharedHistoryView')) {
    content = content.replace(/(import .*?;)\n/, "$1\nimport { SharedHistoryView } from './SharedHistoryView';\n");
  }

  // Remove the old grid imports
  content = content.replace(/import \{.*?MessageItem.*?\} from '\.\.\/MessageItems';\n/, "");

  const modalityMap = {
    'ImageView.tsx': 'image',
    'VideoView.tsx': 'video',
    'MusicView.tsx': 'music',
    'AudioView.tsx': 'audio',
    'SfxView.tsx': 'sfx'
  };
  const modality = modalityMap[view];

  const rightPanelRegex = /<div className="flex-1 bg-\[#0a0a0a\] overflow-y-auto(.|\n)*?<\/div>\s*<\/div>\s*\);\s*\}/s;

  content = content.replace(rightPanelRegex, `<SharedHistoryView agentHistory={agentHistory} setPreviewItem={setPreviewItem} modality="${modality}" />\n    </div>\n  );\n}`);

  fs.writeFileSync(file, content);
});
console.log("Hooks refactored successfully");
