import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Code2, CreditCard, ShieldCheck, Route, Globe, Layers, Layers3 } from 'lucide-react';

export function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Code2 className="w-6 h-6 text-blue-500" />,
      title: t('features.unified.title'),
      desc: t('features.unified.desc'),
      accent: 'from-blue-500/20 to-blue-500/0',
      number: '01',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
      title: t('features.billing.title'),
      desc: t('features.billing.desc'),
      accent: 'from-emerald-500/20 to-emerald-500/0',
      number: '02',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-purple-500" />,
      title: t('features.security.title'),
      desc: t('features.security.desc'),
      accent: 'from-purple-500/20 to-purple-500/0',
      number: '03',
    },
    {
      icon: <Route className="w-6 h-6 text-orange-500" />,
      title: t('features.routing.title'),
      desc: t('features.routing.desc'),
      accent: 'from-orange-500/20 to-orange-500/0',
      number: '04',
    },
    {
      icon: <Globe className="w-6 h-6 text-cyan-500" />,
      title: t('features.edge.title'),
      desc: t('features.edge.desc'),
      accent: 'from-cyan-500/20 to-cyan-500/0',
      number: '05',
    },
    {
      icon: <Layers3 className="w-6 h-6 text-pink-500" />,
      title: t('features.multimodal.title'),
      desc: t('features.multimodal.desc'),
      accent: 'from-pink-500/20 to-pink-500/0',
      number: '06',
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-sm font-medium mb-6 border border-lobster-500/20">
            <Layers className="w-4 h-4" />
            {t('features.badge')}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {t('features.title')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-8 rounded-3xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/20 transition-all overflow-hidden"
            >
              <div className={`pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${feature.accent} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />
              {/* Sequence number watermark */}
              <span className="pointer-events-none absolute right-6 top-6 text-5xl font-bold text-slate-100 dark:text-white/5 select-none transition-colors group-hover:text-lobster-100 dark:group-hover:text-lobster-500/10">
                {feature.number}
              </span>
              <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-white/5 transition-transform group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="relative text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="relative text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
