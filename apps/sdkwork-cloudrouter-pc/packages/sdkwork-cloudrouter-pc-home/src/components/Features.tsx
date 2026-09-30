import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Code2, CreditCard, ShieldCheck, Route, Globe, Layers, Layers3 } from 'lucide-react';
import { useHomeContent } from '../content/useHomeContent';
import { resolveHomeIcon } from '../content/home-icons';

/**
 * Shipped capability grid.
 *
 * Each entry carries its own icon and i18n keys so the default stays localised. An operator who
 * publishes their own list replaces it wholesale — mixing operator copy with shipped icons by
 * position would attach the wrong glyph the moment the order changed.
 */
const DEFAULT_FEATURES = [
  { descKey: 'features.unified.desc', icon: Code2, id: 'unified', titleKey: 'features.unified.title' },
  { descKey: 'features.billing.desc', icon: CreditCard, id: 'billing', titleKey: 'features.billing.title' },
  { descKey: 'features.security.desc', icon: ShieldCheck, id: 'security', titleKey: 'features.security.title' },
  { descKey: 'features.routing.desc', icon: Route, id: 'routing', titleKey: 'features.routing.title' },
  { descKey: 'features.edge.desc', icon: Globe, id: 'edge', titleKey: 'features.edge.title' },
  { descKey: 'features.multimodal.desc', icon: Layers3, id: 'multimodal', titleKey: 'features.multimodal.title' },
];

function sequenceNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function Features() {
  const { t } = useTranslation();
  const home = useHomeContent();
  const configured = home.content.features;

  const features = configured?.items
    ? configured.items.map((item, index) => ({
        desc: home.text(undefined, item.description),
        icon: resolveHomeIcon(item.icon) ?? Layers3,
        id: item.id,
        number: sequenceNumber(index),
        title: home.text(undefined, item.title),
      }))
    : DEFAULT_FEATURES.map((item, index) => ({
        desc: home.text(undefined, t(item.descKey)),
        icon: item.icon,
        id: item.id,
        number: sequenceNumber(index),
        title: home.text(undefined, t(item.titleKey)),
      }));

  if (features.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lobster-500/10 text-lobster-600 dark:text-lobster-400 text-sm font-medium mb-6 border border-lobster-500/20">
            <Layers className="w-4 h-4" />
            {home.text(configured?.badge, t('features.badge'))}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            {home.text(configured?.title, t('features.title'))}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {home.text(configured?.subtitle, t('features.subtitle'))}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative p-8 rounded-3xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:shadow-xl hover:shadow-slate-900/5 dark:hover:shadow-black/20 transition-all overflow-hidden"
              >
                {/* Sequence number watermark */}
                <span className="pointer-events-none absolute right-6 top-6 text-5xl font-bold text-slate-100 dark:text-white/5 select-none transition-colors group-hover:text-lobster-100 dark:group-hover:text-lobster-500/10">
                  {feature.number}
                </span>
                <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mb-6 shadow-sm border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-all group-hover:bg-lobster-500/10 group-hover:border-lobster-500/20 group-hover:text-lobster-600 dark:group-hover:text-lobster-400 group-hover:scale-110">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="relative text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="relative text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
