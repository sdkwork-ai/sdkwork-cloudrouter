import { motion } from 'motion/react';
import { MessageSquare, Image as ImageIcon, Video, Mic, Sparkles, Music } from 'lucide-react';

import { useTranslation } from 'react-i18next';

const MODALITIES = [
  {
    id: 'llm',
    titleKey: 'modalities.llm',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    providers: ['OpenAI GPT-4o', 'Anthropic Claude 3.5', 'Google Gemini 1.5', 'Meta Llama 3', 'Mistral Large']
  },
  {
    id: 'image',
    titleKey: 'modalities.image',
    icon: <ImageIcon className="w-5 h-5" />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    providers: ['Midjourney v6', 'DALL-E 3', 'Stable Diffusion 3', 'Flux.1', 'Adobe Firefly', 'Nanobanana', '即梦']
  },
  {
    id: 'video',
    titleKey: 'modalities.video',
    icon: <Video className="w-5 h-5" />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    providers: ['OpenAI Sora', 'Runway Gen-3', 'Kling AI', 'Haiper', 'Luma Dream Machine', '即梦']
  },
  {
    id: 'audio',
    titleKey: 'modalities.audio',
    icon: <Mic className="w-5 h-5" />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    providers: ['ElevenLabs', 'OpenAI Whisper', 'SenseVoice', 'Azure TTS', 'Meta Voicebox']
  },
  {
    id: 'music',
    titleKey: 'modalities.music',
    icon: <Music className="w-5 h-5" />,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    providers: ['Suno AI', 'Udio', 'Stable Audio', 'Mubert', 'Soundraw']
  }
];

export function SupportedModalities() {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#050505] border-y border-slate-200 dark:border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div className="w-full mx-auto px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-sm font-medium mb-6 border border-lobster-500/20">
            <Sparkles className="w-4 h-4" />
            {t('modalities.badge')}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {t('modalities.title1')}<br />{t('modalities.title2')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('modalities.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {MODALITIES.map((modality, index) => (
            <motion.div
              key={modality.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:border-slate-300 dark:hover:border-white/20 transition-colors shadow-sm"
            >
              <div className={`w-12 h-12 rounded-xl ${modality.bg} ${modality.color} ${modality.border} border flex items-center justify-center mb-6`}>
                {modality.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{t(modality.titleKey)}</h3>
              <ul className="space-y-3">
                {modality.providers.map((provider, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    {provider}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
