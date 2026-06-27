import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Code2, CreditCard, ShieldCheck, Route, Globe, Layers } from 'lucide-react';

export function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Code2 className="w-6 h-6 text-blue-500" />,
      title: t('features.unified.title'),
      desc: t('features.unified.desc'),
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
      title: t('features.billing.title'),
      desc: t('features.billing.desc'),
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-purple-500" />,
      title: t('features.security.title'),
      desc: t('features.security.desc'),
    },
    {
      icon: <Route className="w-6 h-6 text-orange-500" />,
      title: t('features.routing.title'),
      desc: t('features.routing.desc'),
    },
    {
      icon: <Globe className="w-6 h-6 text-cyan-500" />,
      title: t('features.edge.title'),
      desc: t('features.edge.desc'),
    },
    {
      icon: <Layers className="w-6 h-6 text-pink-500" />,
      title: t('features.multimodal.title'),
      desc: t('features.multimodal.desc'),
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5">
      <div className="w-full mx-auto px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {t('features.title')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-3xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-white/5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
