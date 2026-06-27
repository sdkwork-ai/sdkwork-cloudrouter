import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Download, Apple, Play, Monitor, Server, Terminal } from 'lucide-react';

export function BottomDownload() {
  const { t } = useTranslation();
  const [os, setOs] = useState('macOS');

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    if (userAgent.match(/Android/i)) {
      setOs('Android');
    } else if (userAgent.match(/(iPhone|iPod|iPad)/i)) {
      setOs('iOS');
    } else if (userAgent.indexOf('Win') !== -1) {
      setOs('Windows');
    } else if (userAgent.indexOf('Mac') !== -1) {
      setOs('macOS');
    } else if (userAgent.indexOf('Linux') !== -1) {
      setOs('Linux');
    }
  }, []);

  const platforms = [
    { name: 'macOS', icon: <Download className="w-4 h-4" />, primaryIcon: <Download className="w-5 h-5" /> },
    { name: 'Windows', icon: <Download className="w-4 h-4" />, primaryIcon: <Download className="w-5 h-5" /> },
    { name: 'Linux', icon: <Download className="w-4 h-4" />, primaryIcon: <Download className="w-5 h-5" /> },
    { name: 'iOS', icon: <Apple className="w-4 h-4" />, primaryIcon: <Apple className="w-5 h-5" /> },
    { name: 'Android', icon: <Play className="w-4 h-4" />, primaryIcon: <Play className="w-5 h-5" /> },
  ];

  const primaryPlatform = platforms.find(p => p.name === os) || platforms[0];
  const secondaryPlatforms = platforms.filter(p => p.name !== os);

  return (
    <section className="py-24 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#050505]">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            {t('home.deploy.title', 'Ready to deploy?')}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('home.deploy.subtitle', 'Choose the edition that fits your workflow. From local development to massive enterprise clusters.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto text-left">
          {/* Desktop Card */}
          <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -top-6 -right-6 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 transform group-hover:scale-110">
              <Monitor className="w-48 h-48 text-lobster-500" />
            </div>

            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lobster-50 dark:bg-lobster-500/10 text-lobster-600 dark:text-lobster-400">
              <Monitor className="w-6 h-6" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('home.desktop.title', 'Claw Router Desktop')}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 flex-1 text-sm leading-relaxed">
              {t('home.desktop.desc', 'For developers and local environments. Includes a full graphical interface, visual API building, integrated Playground, and one-click app testing.')}
            </p>

            <a
              href="#"
              className="w-full px-6 py-4 rounded-xl bg-lobster-600 text-white font-medium hover:bg-lobster-700 shadow-md shadow-lobster-500/20 transition-all flex items-center justify-center gap-2 mb-6"
            >
              {primaryPlatform.primaryIcon}
              {t('home.downloadFor', { os: primaryPlatform.name, defaultValue: `Download for ${primaryPlatform.name}` })}
            </a>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 w-full font-medium">
              {secondaryPlatforms.map((platform, index) => (
                <React.Fragment key={platform.name}>
                  <a href="#" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                    {platform.icon}
                    {platform.name}
                  </a>
                  {index < secondaryPlatforms.length - 1 && (
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Server Card */}
          <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute -top-6 -right-6 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 transform group-hover:scale-110">
              <Server className="w-48 h-48 text-slate-900 dark:text-white" />
            </div>

            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent">
              <Server className="w-6 h-6" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('home.server.title', 'Claw Router Server')}</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 flex-1 text-sm leading-relaxed">
              {t('home.server.desc', 'For production deployments. Optimized for headless execution, extreme throughput, containerization (Docker), and large-scale enterprise routing.')}
            </p>

            <a
              href="#"
              className="w-full px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white/10 dark:hover:bg-white/20 text-white border border-transparent dark:border-white/10 font-medium transition-all flex items-center justify-center gap-2 mb-6"
            >
              <Terminal className="w-5 h-5" />
              {t('home.server.get', 'Get Server Edition')}
            </a>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 w-full font-medium">
              <a href="#" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                {t('home.server.docker', 'Docker Image')}
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a href="#" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                {t('home.server.linux', 'Linux Tarball')}
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a href="#" className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                {t('home.server.helm', 'Helm Chart')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
