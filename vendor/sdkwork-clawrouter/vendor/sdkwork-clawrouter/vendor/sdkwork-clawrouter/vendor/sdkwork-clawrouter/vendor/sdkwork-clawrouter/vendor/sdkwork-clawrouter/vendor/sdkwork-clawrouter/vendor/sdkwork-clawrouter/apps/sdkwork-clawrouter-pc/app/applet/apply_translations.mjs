import fs from 'fs';

const i18nPath = 'packages/sdkwork-clawrouter-pc-i18n/src/index.ts';
const content = fs.readFileSync(i18nPath, 'utf8');

const modelTranslationsEn = `
      "models.data.openai/gpt-4o.name": "GPT-4o",
      "models.data.openai/gpt-4o.provider": "OpenAI",
      "models.data.openai/gpt-4o.desc": "High-intelligence flagship model for complex, multi-step tasks.",
      "models.data.anthropic/claude-3-5-sonnet.name": "Claude 3.5 Sonnet",
      "models.data.anthropic/claude-3-5-sonnet.provider": "Anthropic",
      "models.data.anthropic/claude-3-5-sonnet.desc": "The ideal balance of intelligence and speed.",
      "models.data.deepseek/deepseek-coder-v2.name": "DeepSeek Coder V2",
      "models.data.deepseek/deepseek-coder-v2.provider": "DeepSeek",
      "models.data.deepseek/deepseek-coder-v2.desc": "Open-source Mixture-of-Experts (MoE) code language model.",
`;

const updatedContent = insertMissingTranslations(
  content,
  '"api.category.compat": "Agent & IDE Compat",',
  modelTranslationsEn,
);

fs.writeFileSync(i18nPath, updatedContent);
console.log('Written successfully');

function insertMissingTranslations(source, anchor, translations) {
  const translationLines = translations
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const missingLines = translationLines.filter((line) => {
    const key = line.match(/^"([^"]+)":/)?.[1];
    return key && !source.includes(`"${key}":`);
  });

  if (missingLines.length === 0 || !source.includes(anchor)) {
    return source;
  }

  return source.replace(anchor, `${anchor}\n      ${missingLines.join('\n      ')}`);
}
