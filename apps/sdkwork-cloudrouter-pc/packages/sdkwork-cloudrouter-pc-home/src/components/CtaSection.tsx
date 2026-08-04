import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 text-center md:px-16 md:py-20 dark:border dark:border-white/10"
        >
          {/* Layered background */}
          <div className="pointer-events-none absolute inset-0">
            {/* Primary center glow */}
            <div className="absolute left-1/2 top-0 h-80 w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(229,80,57,0.35),transparent_70%)] blur-3xl" />
            {/* Secondary corner accents */}
            <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_50%,transparent_100%)]" />
            {/* Top hairline accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lobster-500/60 to-transparent" />
          </div>

          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-lobster-300" />
              {t('cta.badge')}
            </div>

            <h2 className="mx-auto mb-5 max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              {t('cta.title')}
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 font-semibold text-slate-900 shadow-lg shadow-black/20 transition-all hover:scale-105 hover:bg-slate-100"
                to="/console"
              >
                <Zap className="h-5 w-5 text-lobster-500" />
                {t('cta.primary')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                className="rounded-full border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                to="/docs"
              >
                {t('cta.secondary')}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
