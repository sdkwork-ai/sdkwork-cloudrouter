import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useSiteBranding } from '@sdkwork/clawroutes-pc-commons/runtime';
import { DownloadPanel } from './DownloadSection';
import {
  clawRouterDownloadCatalog,
  createClawRouterDownloadCatalog,
} from '../downloads/clawRouterDownloads';

const currentReleaseVersion = createClawRouterDownloadCatalog(clawRouterDownloadCatalog).product.version;

export function Hero() {
  const { t } = useTranslation();
  const siteBranding = useSiteBranding();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-lobster-500/20 bg-lobster-500/10 px-3 py-1 text-sm font-medium text-lobster-600 dark:text-lobster-400"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-lobster-500" />
            {t('hero.badge', { siteName: siteBranding.siteName, version: currentReleaseVersion })}
          </motion.div>

          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-5xl font-bold tracking-tight text-slate-900 dark:text-white md:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t('hero.title1')} <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-lobster-500 to-orange-500 bg-clip-text text-transparent">
              {t('hero.title2')}
            </span>
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
              className="flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:scale-105 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              to="/console"
            >
              {t('hero.start')}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              className="rounded-full border border-slate-200 bg-white px-8 py-4 font-semibold text-slate-900 transition-all hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              to="/docs"
            >
              {t('hero.readDocs')}
            </Link>
          </motion.div>

        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-14 w-full max-w-7xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
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
