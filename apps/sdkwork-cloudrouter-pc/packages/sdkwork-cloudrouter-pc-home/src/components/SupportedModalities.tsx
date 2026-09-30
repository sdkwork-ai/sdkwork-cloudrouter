import { motion } from 'motion/react';
import { MessageSquare, Image as ImageIcon, Video, Mic, Sparkles, Music, ArrowUpRight } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useHomeContent } from '../content/useHomeContent';
import { resolveHomeIcon } from '../content/home-icons';

/**
 * Shipped modality columns, each with the provider list that renders under it.
 *
 * The provider names are model/vendor names rather than product copy, so they stay out of i18n and
 * are replaced wholesale when an operator publishes their own list.
 */
const DEFAULT_MODALITIES = [
  {
    icon: MessageSquare,
    id: 'llm',
    items: ['OpenAI GPT-4o', 'Anthropic Claude 3.5', 'Google Gemini 1.5', 'Meta Llama 3', 'Mistral Large'],
    titleKey: 'modalities.llm',
  },
  {
    icon: ImageIcon,
    id: 'image',
    items: ['Midjourney v6', 'DALL-E 3', 'Stable Diffusion 3', 'Flux.1', 'Adobe Firefly', 'Nanobanana', '即梦'],
    titleKey: 'modalities.image',
  },
  {
    icon: Video,
    id: 'video',
    items: ['OpenAI Sora', 'Runway Gen-3', 'Kling AI', 'Haiper', 'Luma Dream Machine', '即梦'],
    titleKey: 'modalities.video',
  },
  {
    icon: Mic,
    id: 'audio',
    items: ['ElevenLabs', 'OpenAI Whisper', 'SenseVoice', 'Azure TTS', 'Meta Voicebox'],
    titleKey: 'modalities.audio',
  },
  {
    icon: Music,
    id: 'music',
    items: ['Suno AI', 'Udio', 'Stable Audio', 'Mubert', 'Soundraw'],
    titleKey: 'modalities.music',
  },
];

export function SupportedModalities() {
  const { t } = useTranslation();
  const home = useHomeContent();
  const configured = home.content.modalities;

  const modalities = configured?.items
    ? configured.items.map((item) => ({
        icon: resolveHomeIcon(item.icon) ?? Sparkles,
        id: item.id,
        items: item.items.map((entry) => home.text(undefined, entry)),
        title: home.text(undefined, item.title),
      }))
    : DEFAULT_MODALITIES.map((item) => ({
        icon: item.icon,
        id: item.id,
        items: item.items,
        title: home.text(undefined, t(item.titleKey)),
      }));

  if (modalities.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#050505] border-y border-slate-200 dark:border-white/5">
      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-sm font-medium mb-6 border border-lobster-500/20">
            <Sparkles className="w-4 h-4" />
            {home.text(configured?.badge, t('modalities.badge'))}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {home.text(configured?.titleLead, t('modalities.title1'))}
            <span className="text-lobster-500">
              {home.text(configured?.titleHighlight, t('modalities.title2'))}
            </span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {home.text(configured?.subtitle, t('modalities.desc'))}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {modalities.map((modality, index) => {
            const Icon = modality.icon;
            return (
              <motion.div
                key={modality.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/20 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-6 transition-all group-hover:bg-lobster-500/10 group-hover:border-lobster-500/20 group-hover:text-lobster-600 dark:group-hover:text-lobster-400 group-hover:scale-110">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{modality.title}</h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 transition-all group-hover:opacity-100 group-hover:text-lobster-500" />
                </div>
                <ul className="space-y-2.5">
                  {modality.items.map((provider, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors group-hover:bg-lobster-400" />
                      {provider}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
