import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useSiteBranding } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { DownloadPanel } from './DownloadSection';
import {
  cloudRouterDownloadCatalog,
  createCloudRouterDownloadCatalog,
} from '../downloads/cloudRouterDownloads';

const currentReleaseVersion = createCloudRouterDownloadCatalog(cloudRouterDownloadCatalog).product.version;

const STATS = [
  { key: 'hero.stats.models', value: '100+' },
  { key: 'hero.stats.providers', value: '20+' },
  { key: 'hero.stats.uptime', value: '99.99%' },
  { key: 'hero.stats.regions', value: '12' },
];

export function Hero() {
  const { t } = useTranslation();
  const siteBranding = useSiteBranding();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28">
      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-lobster-500/20 bg-lobster-500/10 px-4 py-1.5 text-sm font-medium text-lobster-600 backdrop-blur-sm dark:text-lobster-400"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lobster-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lobster-500" />
            </span>
            {t('hero.badge', { siteName: siteBranding.siteName, version: currentReleaseVersion })}
          </motion.div>

          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-5xl font-bold tracking-tight text-slate-900 dark:text-white md:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t('hero.title1')} <br className="hidden md:block" />
            <span className="text-lobster-500">{t('hero.title2')}</span>
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              className="group flex items-center gap-2 rounded-full bg-lobster-500 px-8 py-4 font-semibold text-white shadow-lg shadow-lobster-500/25 transition-all hover:scale-105 hover:bg-lobster-600 hover:shadow-xl hover:shadow-lobster-500/30"
              to="/console"
            >
              {t('hero.start')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-8 py-4 font-semibold text-slate-900 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              to="/docs"
            >
              <BookOpen className="h-5 w-5" />
              {t('hero.readDocs')}
            </Link>
          </motion.div>

          {/* Stats / trust bar */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {STATS.map((stat) => (
              <div
                key={stat.key}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-5 backdrop-blur-sm transition-all hover:border-lobster-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-lobster-500/30"
              >
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                  {stat.value}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t(stat.key)}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-14 w-full"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <DownloadPanel
            className="py-2"
            variant="compact"
          />
        </motion.div>
      </div>
    </section>
  );
}
