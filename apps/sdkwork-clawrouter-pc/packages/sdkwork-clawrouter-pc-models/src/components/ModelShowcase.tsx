import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Image as ImageIcon, Video, Music, ExternalLink, ArrowRight, Mic, Sparkles } from 'lucide-react';
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
    <section id="models" className="py-24 bg-slate-50 dark:bg-[#050505] relative border-t border-slate-200 dark:border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />
      {/* Soft accent glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[640px] -translate-x-1/2 rounded-full bg-lobster-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-sm font-medium mb-5 border border-lobster-500/20">
              <Sparkles className="w-4 h-4" />
              {t('showcase.badge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {t('showcase.title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {t('showcase.subtitle')}
            </p>
          </div>
          <Link to="/models" className="group inline-flex items-center gap-2 text-lobster-500 hover:text-lobster-600 dark:text-lobster-400 dark:hover:text-lobster-300 font-medium transition-colors shrink-0">
            {t('showcase.viewAll')}
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-white dark:text-slate-950 dark:shadow-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white dark:border-white/10'
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
              className="group relative p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-lobster-300 dark:hover:border-lobster-500/40 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/20 hover:-translate-y-0.5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-lobster-600 dark:group-hover:text-lobster-400 transition-colors truncate">{model.name}</h3>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-mono text-slate-600 dark:text-slate-400">
                    {model.provider}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-lobster-500 group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase tracking-wide">{t('showcase.context')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{model.context}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 uppercase tracking-wide">{t('showcase.price')}</span>
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
