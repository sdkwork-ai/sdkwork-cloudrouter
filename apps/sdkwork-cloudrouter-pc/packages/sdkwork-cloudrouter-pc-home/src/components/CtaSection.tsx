import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { ContentLink } from './ContentLink';
import { useHomeContent } from '../content/useHomeContent';

export function CtaSection() {
  const { t } = useTranslation();
  const home = useHomeContent();
  const cta = home.content.cta ?? {};

  const primaryCta = cta.primaryCta ?? {
    href: '/console',
    label: home.text(undefined, t('cta.primary')),
  };
  const secondaryCta = cta.secondaryCta ?? {
    href: '/docs',
    label: home.text(undefined, t('cta.secondary')),
  };

  return (
    <section className="py-24 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 px-8 py-16 text-center md:px-16 md:py-20 dark:border-white/10"
        >
          {/* Top hairline accent */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-lobster-500/60" />

          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-lobster-300" />
              {home.text(cta.badge, t('cta.badge'))}
            </div>

            <h2 className="mx-auto mb-5 max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              {home.text(cta.title, t('cta.title'))}
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
              {home.text(cta.subtitle, t('cta.subtitle'))}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ContentLink
                className="group flex items-center gap-2 rounded-full bg-lobster-500 px-8 py-4 font-semibold text-white shadow-lg shadow-lobster-500/25 transition-all hover:scale-105 hover:bg-lobster-600"
                href={primaryCta.href}
              >
                <Zap className="h-5 w-5" />
                {primaryCta.label}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </ContentLink>
              <ContentLink
                className="rounded-full border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                href={secondaryCta.href}
              >
                {secondaryCta.label}
              </ContentLink>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
