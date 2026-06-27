import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Image as ImageIcon, Video, Music, ExternalLink, ArrowRight, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ModelShowcase() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('llm');

  const categories = [
    { id: 'llm', name: t('showcase.cat.llm'), icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'image', name: t('showcase.cat.image'), icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'video', name: t('showcase.cat.video'), icon: <Video className="w-4 h-4" /> },
    { id: 'audio', name: t('showcase.cat.audio'), icon: <Mic className="w-4 h-4" /> },
    { id: 'music', name: t('showcase.cat.music'), icon: <Music className="w-4 h-4" /> },
  ];

  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', category: 'llm', context: '128k', price: '$5.00 / 1M tokens' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', category: 'llm', context: '200k', price: '$15.00 / 1M tokens' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', category: 'llm', context: '2M', price: '$7.00 / 1M tokens' },
    { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Meta', category: 'llm', context: '8k', price: '$0.90 / 1M tokens' },
    { id: 'midjourney-v6', name: 'Midjourney v6', provider: 'Midjourney', category: 'image', context: 'N/A', price: '$0.05 / image' },
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'OpenAI', category: 'image', context: 'N/A', price: '$0.04 / image' },
    { id: 'sora', name: 'Sora (Preview)', provider: 'OpenAI', category: 'video', context: 'N/A', price: 'Custom' },
    { id: 'runway-gen3', name: 'Gen-3 Alpha', provider: 'Runway', category: 'video', context: 'N/A', price: '$0.20 / sec' },
    { id: 'suno-v3', name: 'Suno v3', provider: 'Suno', category: 'music', context: 'N/A', price: '$0.10 / song' },
    { id: 'elevenlabs', name: 'ElevenLabs TTS', provider: 'ElevenLabs', category: 'audio', context: 'N/A', price: '$0.30 / 1k chars' },
  ];

  const filteredModels = models.filter(m => m.category === activeCategory);

  return (
    <section id="models" className="py-24 bg-slate-50 dark:bg-[#050505] relative border-t border-slate-200 dark:border-white/5">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />
      <div className="w-full mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {t('showcase.title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl">
              {t('showcase.subtitle')}
            </p>
          </div>
          <Link to="/models" className="text-lobster-500 hover:text-lobster-600 dark:text-lobster-400 dark:hover:text-lobster-300 font-medium flex items-center gap-2 transition-colors">
            {t('showcase.viewAll')} <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto pb-4 mb-8 gap-2 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {cat.icon}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModels.map((model, index) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all group cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-lobster-600 dark:group-hover:text-lobster-400 transition-colors">{model.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-1">{model.provider}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-white/10 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase">{t('showcase.context')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{model.context}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase">{t('showcase.price')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{model.price}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
