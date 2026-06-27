import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Check, Info, FileText, ExternalLink, Zap, Cpu, Globe, AlertTriangle, Code2, Layers, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/clawroutes-pc-commons';
import type { Model } from '../data/models';
import { findModelByCatalogRouteId, ModelService } from '../modelService';
import { deriveModelCatalogDetailView, type ModelCatalogModalityTone } from '../modelCatalog';

export function ModelDetails() {
  const { id, provider, model: modelParam } = useParams<{ id?: string, provider?: string, model?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routeModelId = id ?? (provider && modelParam ? `${provider}/${modelParam}` : '');
  const [model, setModel] = useState<Model | null>(null);

  useEffect(() => {
    let cancelled = false;

    ModelService.fetchModels()
      .then((models) => {
        if (cancelled) {
          return;
        }
        const runtimeModel = findModelByCatalogRouteId(models, routeModelId);
        if (runtimeModel) {
          setModel(runtimeModel);
          return;
        }
        navigate('/models');
      })
      .catch(() => {
        if (!cancelled) {
          navigate('/models');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, routeModelId]);

  if (!model) return null;

  const detail = deriveModelCatalogDetailView(model);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] pt-20 pb-24">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0a0a0a] border-b border-slate-200 dark:border-white/10 pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/models')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-8 group w-fit"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {t('models.backToModels', 'Back to Models')}
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-lobster-600 dark:text-lobster-400 uppercase tracking-wider">
                  {detail.hero.provider}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${modalityToneClassName(detail.hero.modalityTone)}`}>
                  {detail.hero.modality}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                {detail.hero.name}
              </h1>

              <div className="flex items-center gap-3 mb-6">
                <code className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 flex items-center gap-2">
                  {detail.hero.id}
                  <CopyButton
                    text={detail.hero.id}
                    copiedLabel={t('models.details.copied')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    iconClassName="w-3.5 h-3.5"
                    title={t('models.details.copy')}
                  />
                </code>
              </div>

              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {t(detail.hero.descriptionLabelKey, detail.hero.description)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0 min-w-[200px]">
              <button
                onClick={() => navigate('/playground')}
                className="w-full px-6 py-3 bg-lobster-500 hover:bg-lobster-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm shadow-lobster-500/20"
              >
                <MessageSquare className="w-4 h-4" />
                {t('models.details.tryNow', 'Try in Playground')}
              </button>
              <a
                href={detail.hero.providerDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-3 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                {t(detail.performanceSummary.providerDocsLabelKey, detail.performanceSummary.fallbackProviderDocsLabel)}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-12">

            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-blue-500" />
                {t('models.details.capabilityIntro', 'Capability Introduction')}
              </h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                  {t(detail.hero.introLabelKey, detail.hero.intro)}
                </p>
              </div>
            </section>

            {/* Use Cases */}
            {detail.useCases.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  {t('models.details.useCases', 'Use Cases')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {detail.useCases.map((useCase) => (
                    <div key={useCase.labelKey} className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{t(useCase.labelKey, useCase.label)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* API Example */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Code2 className="w-6 h-6 text-indigo-500" />
                {t('models.details.apiExample', 'API Example')}
              </h2>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#0d1117]">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200 dark:bg-[#161b22] dark:border-white/5">
                  <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">TypeScript / Node.js</span>
                  <CopyButton
                    text={detail.apiExample}
                    label={t('models.details.copy')}
                    copiedLabel={t('models.details.copied')}
                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                  />
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-[13px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                    <code>{detail.apiExample}</code>
                  </pre>
                </div>
              </div>
            </section>

            {/* Performance Summary */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-500" />
                  {t(detail.performanceSummary.titleLabelKey, detail.performanceSummary.fallbackTitle)}
                </h2>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {t(detail.performanceSummary.sourceLabelKey, detail.performanceSummary.fallbackSource)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {detail.performanceSummary.rows.map((row) => (
                  <div key={row.key} className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{t(row.labelKey, row.fallbackLabel)}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{row.value}</div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">

            {/* Pricing Card */}
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-lobster-500" />
                {t('models.pricing', 'Pricing')}
              </h3>

              <div className="space-y-4">
                {detail.pricingRows.map((row, index) => (
                  <div key={row.key} className={`flex justify-between items-center ${index < detail.pricingRows.length - 1 ? 'pb-4 border-b border-slate-100 dark:border-white/5' : ''}`}>
                    <span className="text-slate-600 dark:text-slate-400">{t(row.labelKey, row.fallbackLabel)}</span>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.value}</div>
                      <div className="text-xs text-slate-500">{row.unitLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications Card */}
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-slate-500" />
                {t(detail.performanceSummary.specificationsLabelKey, detail.performanceSummary.fallbackSpecificationsLabel)}
              </h3>

              <div className="space-y-3">
                {detail.specificationRows.map((row, index) => (
                  <div key={row.key} className={`flex justify-between py-2 ${index < detail.specificationRows.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
                    <span className="text-slate-500">{t(row.labelKey, row.fallbackLabel)}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameters Card */}
            {detail.parameters.length > 0 && (
              <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  {t('models.details.parameters', 'Parameters')}
                </h3>
                <div className="space-y-3">
                  {detail.parameters.map((parameter) => (
                    <div key={parameter.key} className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
                      <span className="text-slate-600 dark:text-slate-400">{parameter.key}</span>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-slate-700 dark:text-slate-300">{parameter.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limitations Card */}
            {detail.limitations.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-orange-900 dark:text-orange-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('models.details.limitations', 'Limitations')}
                </h3>
                <ul className="space-y-2">
                  {detail.limitations.map((limitation) => (
                    <li key={limitation.labelKey} className="flex items-start gap-2 text-sm text-orange-800 dark:text-orange-300/80">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      {t(limitation.labelKey, limitation.label)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Supported Languages */}
            {detail.supportedLanguages.length > 0 && (
              <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-slate-500" />
                  {t('models.details.supportedLanguages', 'Languages')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {detail.supportedLanguages.map((language) => (
                    <span key={language} className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function modalityToneClassName(tone: ModelCatalogModalityTone): string {
  switch (tone) {
    case 'text':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    case 'image':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
    case 'video':
      return 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border-pink-200 dark:border-pink-500/20';
    case 'audio':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
    case 'music':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    case 'default':
    default:
      return 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10';
  }
}
