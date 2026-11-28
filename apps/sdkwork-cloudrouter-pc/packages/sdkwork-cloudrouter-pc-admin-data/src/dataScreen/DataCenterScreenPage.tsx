/**
 * Full-screen operator data wall (`/admin/data/screen`).
 *
 * This surface lives outside the admin console chrome on purpose: no sidebar, no
 * top navigation, no content gutters — the wall is the page. The Data Center
 * overview opens it in its own window so an operator can put it on a
 * meeting-room display while the console stays usable in this tab.
 *
 * Every figure comes from {@link loadDataScreenSnapshot}, which reads the
 * management APIs the platform already owns. A source that fails drops only its
 * own panels — never a fabricated zero — and is named in the header status rail,
 * so a degraded wall always states which part of the business is missing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ArrowLeft,
  CircleAlert,
  ExternalLink,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  Tooltip,
} from 'recharts';
import {
  loadDataScreenSnapshot,
  type DataScreenRange,
  type DataScreenSnapshot,
  type DataScreenShareItem,
} from '../dataScreenService.ts';
import { useDataScreenQuery } from '../dataScreenHooks.ts';
import {
  buildCurtainPath,
  buildSmoothPath,
  buildTicks,
  createLinearScale,
  currencySymbol,
  formatClock,
  formatCompactNumber,
  formatDateLabel,
  formatDecimalText,
  formatIntegerText,
  toPlotPoints,
} from '../dataScreenChart.ts';
import { ScreenButton, ScreenEmpty, ScreenMeter, ScreenPanel, ScreenSegmented, ScreenStatValue } from './ScreenFrame.tsx';
import { ScreenDonut } from './ScreenCharts.tsx';
import type { TrendMetric } from './ScreenTrendChart.tsx';
import './dataScreen.css';

const RANGE_OPTIONS: readonly DataScreenRange[] = ['daily', 'weekly', 'monthly', 'yearly'];
const TREND_METRICS: readonly TrendMetric[] = ['tokens', 'requests', 'points'];
const REFRESH_INTERVAL_MS = 60_000;

const TREND_COLORS: Readonly<Record<TrendMetric, string>> = {
  tokens: '#38bdf8',
  requests: '#34d399',
  points: '#a78bfa',
};

export interface DataCenterScreenPageProps {
  /** Leave the wall; defaults to the Data Center overview. */
  onExit?: () => void;
  /** Jump to a console surface for the selected metric; defaults to the Data Center overview. */
  onOpenConsole?: (target: 'records' | 'payments' | 'overview') => void;
}

export function DataCenterScreenPage({ onExit, onOpenConsole }: DataCenterScreenPageProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const navigate = useNavigate();
  const [range, setRange] = useState<DataScreenRange>('daily');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('tokens');
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rankTab, setRankTab] = useState<'models' | 'users'>('users');

  const load = useCallback(() => loadDataScreenSnapshot({ range }), [range]);
  const state = useDataScreenQuery(load, { refreshIntervalMs: paused ? 0 : REFRESH_INTERVAL_MS });

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const exit = onExit ?? (() => navigate('/admin/data/overview'));
  const openConsole = useCallback((target: 'records' | 'payments' | 'overview') => {
    if (onOpenConsole) {
      onOpenConsole(target);
      return;
    }
    navigate(target === 'overview' ? '/admin/data/overview' : '/admin/data/overview');
  }, [navigate, onOpenConsole]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const snapshot = state.snapshot;
  const degraded = useMemo(
    () => (snapshot ? snapshot.sections.filter((section) => section.status === 'degraded') : []),
    [snapshot],
  );
  const windowCaption = snapshot
    ? t('admin.dataCenter.screen.window', '{{start}} → {{end}}', {
      start: formatDateLabel(snapshot.windowStart, locale) || '—',
      end: formatDateLabel(snapshot.windowEnd, locale) || '—',
    })
    : '';

  return (
    <div className="screen-root" data-data-screen>
      <div aria-hidden="true" className="screen-root__grid" />
      <div aria-hidden="true" className="screen-root__aurora" />

      <header className="screen-header">
        <div className="screen-header__identity">
          <span className="screen-header__badge">
            <Activity aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="screen-header__title">
              <span className="screen-header__module">{t('admin.header.dataCenter', 'Data Center')}</span>
              <span aria-hidden="true" className="screen-header__title-sep">/</span>
              {t('admin.dataCenter.screen.title', 'Business Intelligence Wall')}
            </h1>
            <p className="screen-header__subtitle">
              {t('admin.dataCenter.screen.subtitle', 'Tokens · Orders · Users · Revenue · Calls')}
            </p>
          </div>
        </div>

        <div className="screen-header__status">
          <span aria-hidden="true" className="screen-header__pulse" />
          <span className="screen-header__live">
            {paused ? t('admin.dataCenter.screen.paused', 'PAUSED') : t('admin.dataCenter.screen.live', 'LIVE')}
          </span>
          <span aria-hidden="true" className="screen-header__divider" />
          <span>{windowCaption}</span>
          {degraded.length > 0 ? (
            <span className="screen-header__degraded" role="status">
              <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.dataCenter.screen.degraded', '{{sources}} source(s) degraded', { sources: degraded.length })}
            </span>
          ) : null}
        </div>

        <div className="screen-header__actions">
          <ScreenSegmented
            label={t('admin.dataCenter.screen.range.label', 'Time range')}
            onChange={setRange}
            options={RANGE_OPTIONS.map((option) => ({
              value: option,
              label: t(`admin.dataCenter.screen.range.${option}`, option),
            }))}
            value={range}
          />
          <ScreenButton
            active={paused}
            ariaLabel={paused
              ? t('admin.dataCenter.screen.resume', 'Resume live refresh')
              : t('admin.dataCenter.screen.pause', 'Pause live refresh')}
            onClick={() => setPaused((current) => !current)}
            title={paused
              ? t('admin.dataCenter.screen.resume', 'Resume live refresh')
              : t('admin.dataCenter.screen.pause', 'Pause live refresh')}
          >
            {paused
              ? <Play aria-hidden="true" className="h-4 w-4" />
              : <Pause aria-hidden="true" className="h-4 w-4" />}
          </ScreenButton>
          <ScreenButton
            ariaLabel={t('admin.dataCenter.screen.refresh', 'Refresh now')}
            onClick={state.reload}
            title={t('admin.dataCenter.screen.refresh', 'Refresh now')}
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${state.refreshing ? 'screen-spin' : ''}`} />
          </ScreenButton>
          <ScreenButton
            ariaLabel={t('admin.dataCenter.screen.fullscreen', 'Toggle full screen')}
            onClick={toggleFullscreen}
            title={t('admin.dataCenter.screen.fullscreen', 'Toggle full screen')}
          >
            {isFullscreen
              ? <Minimize2 aria-hidden="true" className="h-4 w-4" />
              : <Maximize2 aria-hidden="true" className="h-4 w-4" />}
          </ScreenButton>
          <ScreenButton
            ariaLabel={t('admin.dataCenter.screen.exit', 'Back to console')}
            onClick={exit}
            title={t('admin.dataCenter.screen.exit', 'Back to console')}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </ScreenButton>
        </div>
      </header>

      {state.phase === 'loading' && !snapshot ? <ScreenLoading label={t('admin.dataCenter.loading', 'Loading…')} /> : null}
      {state.phase === 'empty' && !snapshot ? (
        <ScreenFailure
          message={state.errorMessage}
          onRetry={state.reload}
          title={t('admin.dataCenter.screen.error.title', 'The wall could not read any live source')}
        />
      ) : null}

      {snapshot ? (
        <main
          aria-busy={state.refreshing}
          className="screen-body"
          data-screen-stale={state.stale ? 'true' : 'false'}
        >
          <KpiWall snapshot={snapshot} />

          <section className="screen-grid-main">
            <ScreenPanel
              accent="cyan"
              actions={(
                <ScreenSegmented
                  label={t('admin.dataCenter.screen.trend.metricLabel', 'Trend metric')}
                  onChange={setTrendMetric}
                  options={TREND_METRICS.map((metric) => ({
                    value: metric,
                    label: t(`admin.dataCenter.screen.trend.${metric}`, metric),
                  }))}
                  value={trendMetric}
                />
              )}
              className="screen-panel--trend"
              eyebrow={windowCaption}
              title={t('admin.dataCenter.screen.trend.title', 'Aggregate trend')}
            >
              <TrendStage locale={locale} metric={trendMetric} snapshot={snapshot} />
            </ScreenPanel>

            <ScreenPanel
              accent="violet"
              className="screen-panel--distribution"
              title={t('admin.dataCenter.screen.model.title', 'Model mix')}
            >
              <SharePanel
                emptyMessage={t('admin.dataCenter.screen.model.empty', 'No model traffic in this window')}
                items={snapshot.modelDistribution}
                unitLabel={t('admin.dataCenter.screen.creditsUnit', 'Credits')}
              />
            </ScreenPanel>
          </section>

          <section className="screen-grid-quad">
            <ScreenPanel accent="emerald" title={t('admin.dataCenter.screen.modality.title', 'Multimodal share')}>
              <ScreenDonut
                centerLabel={t('admin.dataCenter.screen.modality.centerLabel', 'modalities')}
                centerValue={String(snapshot.modalityDistribution.length || '—')}
                emptyMessage={t('admin.dataCenter.screen.modality.empty', 'No modality traffic in this window')}
                items={snapshot.modalityDistribution}
                legend="bottom"
              />
            </ScreenPanel>
            <ScreenPanel
              accent="amber"
              actions={(
                <ScreenSegmented
                  label={t('admin.dataCenter.screen.ranking.tabLabel', 'Ranking')}
                  onChange={setRankTab}
                  options={[
                    { value: 'users', label: t('admin.dataCenter.screen.ranking.users', 'Users') },
                    { value: 'models', label: t('admin.dataCenter.screen.ranking.models', 'Models') },
                  ]}
                  value={rankTab}
                />
              )}
              title={t('admin.dataCenter.screen.ranking.title', 'Spend ranking')}
            >
              <RankingChart
                emptyMessage={t('admin.dataCenter.screen.ranking.empty', 'No ranked traffic in this window')}
                items={rankTab === 'models' ? snapshot.modelRanking : snapshot.userRanking}
              />
            </ScreenPanel>

            <ScreenPanel accent="cyan" title={t('admin.dataCenter.screen.orders.title', 'Paid orders & revenue')}>
              <OrdersPanel locale={locale} snapshot={snapshot} />
            </ScreenPanel>

            <ScreenPanel accent="violet" title={t('admin.dataCenter.screen.recharge.title', 'Recharge & credits')}>
              <RechargePanel snapshot={snapshot} />
            </ScreenPanel>
          </section>

          <section className="screen-grid-bottom">
            <ScreenPanel
              accent="sky"
              actions={(
                <button className="screen-link" onClick={() => openConsole('records')} type="button">
                  {t('admin.dataCenter.screen.live.openConsole', 'Open console')}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
              className="screen-panel--live"
              title={t('admin.dataCenter.screen.live.title', 'Live invocation feed')}
            >
              <LiveFeed snapshot={snapshot} />
            </ScreenPanel>

            <ScreenPanel accent="amber" title={t('admin.dataCenter.screen.insights.title', 'Operational health')}>
              <HealthPanel snapshot={snapshot} />
            </ScreenPanel>
          </section>

          <Ticker locale={locale} snapshot={snapshot} />
        </main>
      ) : null}

      {state.stale ? (
        <div className="screen-stale" role="status">
          <CircleAlert aria-hidden="true" className="h-4 w-4" />
          {t('admin.dataCenter.screen.stale', 'Latest refresh failed. Showing the last successful snapshot: {{message}}', {
            message: state.errorMessage,
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * KPI wall
 * ------------------------------------------------------------------ */

function KpiWall({ snapshot }: { snapshot: DataScreenSnapshot }) {
  const { t } = useTranslation();
  const summary = snapshot.summary;
  const payments = snapshot.payments;
  const recharge = snapshot.recharge;
  const referral = snapshot.referral;
  const primary = payments?.amounts[0];
  const cashText = primary
    ? `${currencySymbol(primary.currencyCode)}${formatDecimalText(primary.amount, 2)}`
    : null;

  const cards = [
    {
      key: 'tokens',
      icon: Zap,
      label: t('admin.dataCenter.screen.kpi.tokens', 'Tokens consumed'),
      value: summary ? formatCompactNumber(Number(summary.totalTokens)) : null,
      unit: summary
        ? t('admin.dataCenter.screen.kpi.perRequestTokens', '{{value}} per request', {
          value: formatDecimalText(summary.averageTokensPerRequest, 0),
        })
        : null,
      accent: 'cyan' as const,
      percent: 100,
    },
    {
      key: 'calls',
      icon: Activity,
      label: t('admin.dataCenter.screen.kpi.requests', 'API calls'),
      value: summary ? formatIntegerText(summary.totalRequests) : null,
      unit: summary
        ? t('admin.dataCenter.screen.kpi.perMinute', '{{value}} / min · {{success}}% success', {
          value: formatDecimalText(summary.requestsPerMinute, 2),
          success: formatDecimalText(summary.successRate, 2),
        })
        : null,
      accent: 'emerald' as const,
      percent: summary ? Math.min(Number(summary.successRate), 100) : 0,
    },
    {
      key: 'orders',
      icon: Wallet,
      label: t('admin.dataCenter.screen.kpi.orders', 'Paid orders'),
      value: payments ? formatIntegerText(payments.paidCount) : null,
      unit: payments
        ? t('admin.dataCenter.screen.kpi.conversion', '{{value}}% of {{total}} orders', {
          value: payments.paidRate.toFixed(1),
          total: formatIntegerText(payments.orderCount),
        })
        : null,
      accent: 'amber' as const,
      percent: payments ? payments.paidRate : 0,
    },
    {
      key: 'revenue',
      icon: Wallet,
      label: t('admin.dataCenter.screen.kpi.revenue', 'Paid revenue'),
      value: cashText,
      unit: payments && snapshot.economy
        ? t('admin.dataCenter.screen.kpi.revenueCredits', '≈ {{value}} Credits', {
          value: formatDecimalText(snapshot.economy.paidCredits, 0),
        })
        : null,
      accent: 'violet' as const,
      percent: payments ? Math.min(payments.paidRate, 100) : 0,
    },
    {
      key: 'users',
      icon: Users,
      label: t('admin.dataCenter.screen.kpi.users', 'Active users'),
      value: summary ? formatIntegerText(summary.activeUsers) : null,
      unit: summary
        ? t('admin.dataCenter.screen.kpi.ofTotal', 'of {{total}} registered', { total: formatIntegerText(summary.totalUsers) })
        : null,
      accent: 'cyan' as const,
      percent: summary && Number(summary.totalUsers) > 0
        ? Math.min((Number(summary.activeUsers) / Number(summary.totalUsers)) * 100, 100)
        : 0,
    },
    {
      key: 'recharge',
      icon: Zap,
      label: t('admin.dataCenter.screen.kpi.recharge', 'Recharge cash-in'),
      value: recharge ? formatDecimalText(recharge.amount, 2) : null,
      unit: recharge
        ? t('admin.dataCenter.screen.kpi.rechargeDetail', '{{settled}} settled · {{multiplier}}× multiplier', {
          settled: formatIntegerText(recharge.successCount),
          multiplier: formatDecimalText(recharge.bonusRate, 2),
        })
        : null,
      accent: 'emerald' as const,
      percent: recharge && Number(recharge.count) > 0
        ? Math.min((Number(recharge.successCount) / Number(recharge.count)) * 100, 100)
        : 0,
    },
    {
      key: 'referral',
      icon: Users,
      label: t('admin.dataCenter.screen.kpi.invited', 'Users invited'),
      value: referral ? formatIntegerText(referral.invited) : null,
      unit: referral
        ? t('admin.dataCenter.screen.kpi.inviters', '{{inviters}} inviters · {{active}} active campaigns', {
          inviters: referral.inviterCount,
          active: referral.activeStrategies,
        })
        : null,
      accent: 'violet' as const,
      percent: referral && Number(referral.invited) > 0 ? 100 : 0,
    },
    {
      key: 'errorRate',
      icon: CircleAlert,
      label: t('admin.dataCenter.screen.kpi.errorRate', 'Error rate'),
      value: summary ? `${formatDecimalText(summary.errorRate, 2)}%` : null,
      unit: summary
        ? t('admin.dataCenter.screen.kpi.failed', '{{value}} failed requests', { value: formatIntegerText(summary.failedRequests) })
        : null,
      accent: 'rose' as const,
      percent: summary ? Math.min(Number(summary.errorRate), 100) : 0,
    },
  ];

  return (
    <section aria-label={t('admin.dataCenter.screen.kpi.section', 'Key business metrics')} className="screen-kpis">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="screen-kpi" data-accent={card.accent} data-screen-kpi={card.key} key={card.key}>
            <span aria-hidden="true" className="screen-kpi__glow" />
            <header className="screen-kpi__header">
              <span className="screen-kpi__icon">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="screen-kpi__label">{card.label}</span>
            </header>
            {card.value === null ? (
              <span className="screen-kpi__unavailable">{t('admin.dataCenter.screen.unavailable', 'unavailable')}</span>
            ) : (
              <ScreenStatValue tone={card.accent}>{card.value}</ScreenStatValue>
            )}
            <footer className="screen-kpi__footer">
              <span className="screen-kpi__unit">{card.unit ?? ''}</span>
            </footer>
            <ScreenMeter color="var(--screen-accent)" percent={card.percent} />
          </article>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Trend
 * ------------------------------------------------------------------ */

/**
 * Trend plot box. The viewBox is deliberately close to the rendered aspect ratio
 * of the panel stage (≈ 3.4:1 at 1080p), so `preserveAspectRatio="none"` barely
 * distorts the axis labels while the curve still fills the full height.
 *
 * The right margin reserves room for the floating "latest point" badge, which
 * would otherwise cover the newest date label on wall-style time series.
 */
const TREND_VIEW = { width: 1000, height: 260, top: 34, right: 210, bottom: 34, left: 62 };
/**
 * Horizontal room one date label needs, in viewBox units: `YYYY-MM-DD` at the
 * 17-unit axis font is ~86 units wide, plus a readable gap. Labels are thinned
 * against this budget so they never overlap, on a 7-point daily series or a
 * 30-point monthly one.
 */
const LABEL_SLOT_UNITS = 104;
/** How far the floor footprint spreads below the back curve (fraction of bar height). */
const TREND_FLOOR_SPREAD = 0.26;

function TrendStage({ metric, snapshot, locale }: { metric: TrendMetric; snapshot: DataScreenSnapshot; locale: string }) {
  const { t } = useTranslation();
  const points = snapshot.trend;
  const color = TREND_COLORS[metric];
  const readValue = (point: DataScreenSnapshot['trend'][number]): string => (
    metric === 'points' ? formatDecimalText(point.points, 2) : formatIntegerText(point[metric])
  );

  const plotWidth = TREND_VIEW.width - TREND_VIEW.left - TREND_VIEW.right;
  const plotHeight = TREND_VIEW.height - TREND_VIEW.top - TREND_VIEW.bottom;
  const values = points.map((point) => (
    metric === 'points' ? point.pointValue : metric === 'requests' ? point.requestValue : point.tokenValue
  ));
  const peak = values.length > 0 ? Math.max(...values) : 0;
  const scale = createLinearScale(peak, plotHeight);
  const geometry = toPlotPoints(values, plotWidth, plotHeight).map((point) => ({
    x: point.x + TREND_VIEW.left,
    y: point.y + TREND_VIEW.top,
  }));
  const baseline = TREND_VIEW.height - TREND_VIEW.bottom;
  const linePath = buildSmoothPath(geometry, baseline);
  const areaPath = geometry.length > 0
    ? `${linePath} L ${geometry[geometry.length - 1]?.x ?? 0} ${baseline} L ${geometry[0]?.x ?? 0} ${baseline} Z`
    : '';
  // 3D volume: the curve is mirrored onto a floor plane that sinks toward the
  // viewer, so the series reads as a solid surface lifted off the ground.
  const floorPoints = geometry.map((point) => ({
    x: point.x,
    y: point.y + (baseline - point.y) * TREND_FLOOR_SPREAD,
  }));
  const floorPath = floorPoints.length > 0
    ? `${buildSmoothPath(floorPoints)} L ${floorPoints[floorPoints.length - 1]?.x ?? 0} ${TREND_VIEW.height - 2} L ${floorPoints[0]?.x ?? 0} ${TREND_VIEW.height - 2} Z`
    : '';
  const curtainPath = buildCurtainPath(geometry, floorPoints);
  const ticks = buildTicks(scale.domainMax, 4);
  const lastPoint = points[points.length - 1];

  if (points.length === 0) {
    return (
      <div className="screen-trend">
        <ScreenEmpty message={t('admin.dataCenter.screen.trend.empty', 'No traffic in this window')} />
      </div>
    );
  }

  return (
    <div className="screen-trend" data-screen-trend>
      <div className="screen-trend__stage">
        <svg
          aria-label={t('admin.dataCenter.screen.trend.title', 'Aggregate trend')}
          className="screen-trend__svg"
          data-screen-trend-chart
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${TREND_VIEW.width} ${TREND_VIEW.height}`}
        >
          <defs>
            <linearGradient id="screen-trend-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="55%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="screen-trend-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="35%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor="#eaf6ff" stopOpacity="1" />
            </linearGradient>
            {/* Curtain wall connecting the back curve to the floor footprint. */}
            <linearGradient id="screen-trend-curtain" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.42" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="screen-trend-floor" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="screen-trend-rail" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="55%" stopColor={color} stopOpacity="0.42" />
              <stop offset="100%" stopColor="#eaf6ff" stopOpacity="0.85" />
            </linearGradient>
            <filter height="300%" id="screen-trend-glow" width="120%" x="-10%" y="-100%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Back plane: horizontal value grid with axis values. */}
          {ticks.map((tick) => {
            const y = baseline - scale(tick);
            return (
              <g key={`tick-${tick}`}>
                <line stroke="rgba(148,163,184,0.16)" strokeDasharray="3 6" x1={TREND_VIEW.left} x2={TREND_VIEW.width - TREND_VIEW.right} y1={y} y2={y} />
                <text
                  className="screen-trend__axis"
                  dominantBaseline="middle"
                  fill="rgba(160,190,219,0.95)"
                  textAnchor="end"
                  x={TREND_VIEW.left - 12}
                  y={y}
                >
                  {formatCompactNumber(tick, 1)}
                </text>
              </g>
            );
          })}

          {/* Floor footprint + receding side walls: the 3D volume of the series. */}
          <path d={floorPath} fill="url(#screen-trend-floor)" opacity="0.85" />
          <path d={curtainPath} fill="url(#screen-trend-curtain)" />

          {/* Depth rails: the last point is the nearest, so its drop line is the
              strongest depth cue and is drawn brightest. */}
          {geometry.map((point, index) => {
            if (index % Math.max(1, Math.ceil(geometry.length / 7)) !== 0) {
              return null;
            }
            return (
              <g key={`rail-${index}`}>
                <line stroke="url(#screen-trend-rail)" strokeWidth="1.2" x1={point.x} x2={point.x} y1={point.y} y2={baseline} />
                <ellipse cx={point.x} cy={baseline} fill={color} opacity="0.55" rx="3" ry="1.6" />
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill="url(#screen-trend-area)" /> : null}
          {linePath ? <path d={linePath} fill="none" filter="url(#screen-trend-glow)" stroke={color} strokeOpacity="0.7" strokeWidth="8" /> : null}
          {linePath ? <path d={linePath} fill="none" stroke="url(#screen-trend-stroke)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" /> : null}

          {/* Nodes: a lit sphere per point with a specular highlight. */}
          {geometry.map((point, index) => (
            <g key={`point-${index}`}>
              <circle cx={point.x} cy={point.y} fill={color} r="3.4" />
              <circle cx={point.x - 0.8} cy={point.y - 0.8} fill="#ffffff" opacity="0.85" r="1.1" />
            </g>
          ))}

          {geometry.length > 0 ? (
            <g>
              <circle cx={geometry[geometry.length - 1]?.x ?? 0} cy={geometry[geometry.length - 1]?.y ?? 0} fill={color} opacity="0.28" r="12" />
              <circle cx={geometry[geometry.length - 1]?.x ?? 0} cy={geometry[geometry.length - 1]?.y ?? 0} fill="#f8fafc" r="4.4" stroke={color} strokeWidth="2" />
            </g>
          ) : null}

          {points.map((point, index) => {
            // Label budget follows the real plot width: a wall draws at most a
            // handful of date labels, and every label costs ~96 viewBox units at
            // the axis font size plus a gap, so a 728-unit plot fits ~6 dates.
            const labelBudget = Math.max(2, Math.min(6, Math.floor(plotWidth / LABEL_SLOT_UNITS)));
            const stride = Math.max(1, Math.ceil(points.length / labelBudget));
            const isLast = index === points.length - 1;
            if (!isLast && index % stride !== 0) {
              return null;
            }
            // Drop the final label when it would crowd its predecessor.
            if (isLast && points.length > 1 && (points.length - 1) % stride !== 0
              && (points.length - 1) - Math.floor((points.length - 1) / stride) * stride < stride) {
              return null;
            }
            const x = geometry[index]?.x ?? 0;
            return (
              <text
                className="screen-trend__axis"
                fill="rgba(148,176,205,0.95)"
                key={`label-${index}`}
                textAnchor={index === 0 ? 'start' : isLast ? 'end' : 'middle'}
                x={x}
                y={TREND_VIEW.height - 8}
              >
                {point.label}
              </text>
            );
          })}
        </svg>
        <div className="screen-trend__badge">
          <span className="screen-trend__badge-label">{t(`admin.dataCenter.screen.trend.${metric}`, metric)}</span>
          <strong style={{ color }}>{lastPoint ? readValue(lastPoint) : '—'}</strong>
          <span className="screen-trend__badge-caption">
            {t('admin.dataCenter.screen.trend.latest', 'latest point')}
          </span>
        </div>
      </div>

      <dl className="screen-trend__facts">
        <div>
          <dt>{t('admin.dataCenter.screen.trend.peak', 'Window peak')}</dt>
          <dd style={{ color }}>{formatCompactNumber(peak)}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.trend.tokens', 'Tokens')}</dt>
          <dd>{snapshot.summary ? formatIntegerText(snapshot.summary.totalTokens) : '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.trend.requests', 'Calls')}</dt>
          <dd>{snapshot.summary ? formatIntegerText(snapshot.summary.totalRequests) : '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.trend.points', 'Credits')}</dt>
          <dd>{snapshot.summary ? formatDecimalText(snapshot.summary.totalPoints, 2) : '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.trend.users', 'Active users')}</dt>
          <dd>{snapshot.summary ? formatIntegerText(snapshot.summary.activeUsers) : '—'}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.trend.generated', 'Snapshot')}</dt>
          <dd>{formatClock(snapshot.generatedAt, locale) || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Distribution panels
 * ------------------------------------------------------------------ */

function SharePanel({ items, emptyMessage, unitLabel }: { items: readonly DataScreenShareItem[]; emptyMessage: string; unitLabel: string }) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return <ScreenEmpty message={emptyMessage} />;
  }
  const total = items.reduce((sum, item) => sum + item.chartValue, 0);
  return (
    <div className="screen-share">
      <div className="screen-share__chart">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              cornerRadius={6}
              cx="50%"
              cy="50%"
              data={items.map((item) => ({ ...item, value: item.chartValue }))}
              dataKey="value"
              innerRadius="58%"
              isAnimationActive={false}
              outerRadius="92%"
              paddingAngle={2}
              stroke="rgba(4, 7, 15, 0.85)"
              strokeWidth={2}
            >
              {items.map((item) => (
                <Cell fill={item.color} key={item.name} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#050a14',
                border: '1px solid rgba(56,189,248,0.35)',
                borderRadius: 8,
                fontSize: 12,
                color: '#e2e8f0',
              }}
              formatter={(value: unknown, name: unknown) => [`${formatDecimalText(String(value ?? 0), 2)} ${unitLabel}`, String(name ?? '')]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="screen-share__center">
          <strong>{items.length}</strong>
          <span>{t('admin.dataCenter.screen.model.centerLabel', 'models')}</span>
        </div>
      </div>
      <ul className="screen-share__legend">
        {items.slice(0, 6).map((item) => (
          <li key={item.name}>
            <span className="screen-share__swatch" style={{ background: item.color }} />
            <div className="screen-share__legend-text">
              <span className="screen-share__name" title={item.name}>{item.name}</span>
              <span className="screen-share__absolute">
                {formatCompactNumber(item.chartValue, 1)} {unitLabel}
                {' · '}
                {formatDecimalText(item.value, 2)}
              </span>
            </div>
            <span className="screen-share__value">{item.percent.toFixed(1)}%</span>
            <span aria-hidden="true" className="screen-share__track">
              <span style={{ background: item.color, width: `${Math.max(item.percent, 2)}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <footer className="screen-share__total">
        <span>{t('admin.dataCenter.screen.model.total', 'Total share')}</span>
        <strong>{formatCompactNumber(total, 1)} {unitLabel}</strong>
      </footer>
    </div>
  );
}

/**
 * Ranking bars as extruded 3D blocks.
 *
 * A flat bar chart reads as a spreadsheet; an isometric block with a lit face,
 * a shaded side, a bright top edge, and a floor shadow reads as "this user
 * spends the most" at a glance — which is the whole point of a wall a visitor
 * looks at for ten seconds. Each bar is drawn in one SVG per row so the width is
 * exact and the depth offset never distorts the value.
 */
function RankingChart({ items, emptyMessage }: { items: DataScreenSnapshot['modelRanking']; emptyMessage: string }) {
  const { t } = useTranslation();
  const rows = items.slice(0, 6);
  if (rows.length === 0) {
    return <ScreenEmpty message={emptyMessage} />;
  }
  const lead = Math.max(rows[0]?.metricValue ?? 0, 1);
  const depth = 7;
  const barHeight = 14;
  const viewWidth = 240;
  const viewHeight = barHeight + depth + 5;

  return (
    <div className="screen-ranking" data-screen-ranking>
      <ol className="screen-ranking__list">
        {rows.map((item, index) => {
          const ratio = Math.min(Math.max(item.metricValue / lead, 0), 1);
          const width = Math.max(ratio * (viewWidth - depth), 6);
          const top = 2;
          const face = `M 0 ${top} L ${width} ${top} L ${width} ${top + barHeight} L 0 ${top + barHeight} Z`;
          const side = `M ${width} ${top} L ${width + depth} ${top - depth * 0.55} L ${width + depth} ${top + barHeight - depth * 0.55} L ${width} ${top + barHeight} Z`;
          const cap = `M 0 ${top} L ${depth} ${top - depth * 0.55} L ${width + depth} ${top - depth * 0.55} L ${width} ${top} Z`;
          return (
            <li className="screen-ranking__row" key={`${item.label}-${index}`}>
              <span className="screen-ranking__rank" data-top={index < 3 ? 'true' : 'false'}>
                {index + 1}
              </span>
              <div className="screen-ranking__identity">
                <span className="screen-ranking__name" title={item.label}>{item.label}</span>
                <span className="screen-ranking__secondary" title={item.secondary}>{item.secondary || '\u00a0'}</span>
              </div>
              <div className="screen-ranking__bar">
                <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
                  <defs>
                    <linearGradient id={`screen-rank-face-${index}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#c2410c" />
                      <stop offset="55%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fde68a" />
                    </linearGradient>
                    <linearGradient id={`screen-rank-side-${index}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#b45309" />
                      <stop offset="100%" stopColor="#7c2d12" />
                    </linearGradient>
                  </defs>
                  <ellipse cx={width / 2} cy={top + barHeight + 3} fill="rgba(251, 191, 36, 0.18)" rx={width / 2} ry="3" />
                  <path d={cap} fill="#fde68a" opacity="0.95" />
                  <path d={side} fill={`url(#screen-rank-side-${index})`} />
                  <path d={face} fill={`url(#screen-rank-face-${index})`} />
                </svg>
              </div>
              <span className="screen-ranking__value">
                {formatDecimalText(item.metric, 2)}
                <small>{t('admin.dataCenter.screen.creditsUnit', 'Credits')}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Commercial panels
 * ------------------------------------------------------------------ */

function OrdersPanel({ snapshot, locale }: { snapshot: DataScreenSnapshot; locale: string }) {
  const { t } = useTranslation();
  const payments = snapshot.payments;
  if (!payments) {
    return <ScreenEmpty message={t('admin.dataCenter.screen.orders.empty', 'Order and revenue data is unavailable')} />;
  }
  return (
    <div className="screen-orders">
      <div className="screen-orders__hero">
        <span className="screen-orders__hero-label">{t('admin.dataCenter.screen.orders.revenue', 'Collected')}</span>
        <strong className="screen-orders__hero-value">
          {payments.amounts.length > 0
            ? payments.amounts.slice(0, 2)
              .map((bucket) => `${currencySymbol(bucket.currencyCode)}${formatDecimalText(bucket.amount, 2)}`)
              .join('  ·  ')
            : t('admin.dataCenter.screen.orders.none', 'No paid orders yet')}
        </strong>
        <span className="screen-orders__hero-meta">
          {t('admin.dataCenter.screen.orders.total', '{{orders}} orders', { orders: formatIntegerText(payments.orderCount) })}
          {' · '}
          {t('admin.dataCenter.screen.orders.averageTicket', 'avg {{value}}', { value: formatDecimalText(payments.averageTicket, 2) })}
        </span>
      </div>

      <ul className="screen-orders__status">
        {payments.statuses
          .filter((bucket) => bucket.count !== '0')
          .slice(0, 6)
          .map((bucket) => (
            <li key={bucket.status}>
              <span className="screen-orders__status-name">
                {t(`admin.dataCenter.screen.orders.status.${bucket.status}`, bucket.status)}
              </span>
              <span className="screen-orders__status-count">{formatIntegerText(bucket.count)}</span>
            </li>
          ))}
      </ul>

      <div className="screen-orders__gauges">
        <RadialGauge
          caption={t('admin.dataCenter.screen.orders.paidRate', 'Paid')}
          color="#fbbf24"
          percent={payments.paidRate}
        />
        <RadialGauge
          caption={t('admin.dataCenter.screen.orders.refundRate', 'Refunded')}
          color="#fb7185"
          percent={payments.refundRate}
        />
        <dl className="screen-orders__facts">
          <div>
            <dt>{t('admin.dataCenter.screen.orders.paid', 'Paid orders')}</dt>
            <dd>{formatIntegerText(payments.paidCount)}</dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.orders.refunds', 'Refunded')}</dt>
            <dd>
              {formatIntegerText(payments.refundCount)}
              <small>{currencySymbol(payments.primaryCurrency)}{formatDecimalText(payments.refundAmount, 2)}</small>
            </dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.orders.currency', 'Currency')}</dt>
            <dd>{payments.primaryCurrency || '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.orders.updated', 'Snapshot')}</dt>
            <dd>{formatClock(snapshot.generatedAt, locale) || '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function RechargePanel({ snapshot }: { snapshot: DataScreenSnapshot }) {
  const { t } = useTranslation();
  const recharge = snapshot.recharge;
  if (!recharge) {
    return <ScreenEmpty message={t('admin.dataCenter.screen.recharge.empty', 'Recharge data is unavailable')} />;
  }
  return (
    <div className="screen-recharge">
      <div className="screen-recharge__hero">
        <span className="screen-recharge__hero-label">{t('admin.dataCenter.screen.recharge.credited', 'Credits credited')}</span>
        <strong className="screen-recharge__hero-value">{formatIntegerText(recharge.usdCredited)}</strong>
        <span className="screen-recharge__hero-meta">
          {t('admin.dataCenter.screen.recharge.multiplier', '{{value}}× credits per cash unit', {
            value: formatDecimalText(recharge.bonusRate, 2),
          })}
        </span>
      </div>

      <ul className="screen-recharge__methods">
        {recharge.methods.length === 0 ? <li className="screen-recharge__methods-empty">{t('admin.dataCenter.screen.recharge.methodsEmpty', 'No settled recharge yet')}</li> : null}
        {recharge.methods.slice(0, 4).map((method) => (
          <li key={method.name}>
            <div className="screen-recharge__method-head">
              <span className="screen-recharge__method-name" title={method.name}>{method.name}</span>
              <span className="screen-recharge__method-value">{method.percent.toFixed(1)}%</span>
            </div>
            <ScreenMeter color={method.color} height={5} percent={method.percent} />
          </li>
        ))}
      </ul>

      <dl className="screen-recharge__counts">
        <div>
          <dt>{t('admin.dataCenter.screen.recharge.settled', 'Settled')}</dt>
          <dd data-tone="emerald">{formatIntegerText(recharge.successCount)}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.recharge.pending', 'Pending')}</dt>
          <dd data-tone="amber">{formatIntegerText(recharge.pendingCount)}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.recharge.failed', 'Failed')}</dt>
          <dd data-tone="rose">{formatIntegerText(recharge.failedCount)}</dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Live + health
 * ------------------------------------------------------------------ */

function LiveFeed({ snapshot }: { snapshot: DataScreenSnapshot }) {
  const { t } = useTranslation();
  if (snapshot.liveTraces.length === 0) {
    return <ScreenEmpty message={t('admin.dataCenter.screen.live.empty', 'No invocations recorded yet')} />;
  }
  return (
    <ul className="screen-live">
      <li aria-hidden="true" className="screen-live__row screen-live__row--head">
        <span />
        <span>{t('admin.dataCenter.screen.live.head.time', 'Time')}</span>
        <span>{t('admin.dataCenter.screen.live.head.user', 'Caller')}</span>
        <span>{t('admin.dataCenter.screen.live.head.model', 'Model')}</span>
        <span>{t('admin.dataCenter.screen.live.head.usage', 'In / Out')}</span>
        <span>{t('admin.dataCenter.screen.live.head.cost', 'Cost')}</span>
        <span>{t('admin.dataCenter.screen.live.head.status', 'Status')}</span>
      </li>
      {snapshot.liveTraces.slice(0, 5).map((trace) => (
        <li className="screen-live__row" data-status={trace.success ? 'ok' : 'error'} key={trace.id}>
          <span aria-hidden="true" className="screen-live__dot" />
          <span className="screen-live__time">{trace.time}</span>
          <span className="screen-live__user" title={trace.user}>{trace.user}</span>
          <span className="screen-live__model" title={trace.model}>{trace.model}</span>
          <span className="screen-live__usage">{trace.usageLabel}</span>
          <span className="screen-live__cost">{formatDecimalText(trace.cost, 4)}</span>
          <span className="screen-live__status">
            {trace.success
              ? t('admin.dataCenter.screen.live.success', 'OK')
              : t('admin.dataCenter.screen.live.failed', 'ERR')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function HealthPanel({ snapshot }: { snapshot: DataScreenSnapshot }) {
  const { t } = useTranslation();
  const summary = snapshot.summary;
  const health = snapshot.health;
  return (
    <div className="screen-health">
      <div className="screen-health__gauges">
        <RadialGauge
          caption={t('admin.dataCenter.screen.health.success', 'Success')}
          color="#34d399"
          percent={summary ? Number(summary.successRate) : 0}
        />
        <RadialGauge
          caption={t('admin.dataCenter.screen.health.availability', 'Nodes online')}
          color="#22d3ee"
          percent={health && health.totalNodes > 0 ? (health.onlineNodes / health.totalNodes) * 100 : 0}
        />
        <dl className="screen-health__facts">
          <div>
            <dt>{t('admin.dataCenter.screen.health.activeModels', 'Active models')}</dt>
            <dd>{summary ? formatIntegerText(summary.activeModels) : '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.health.nodes', 'Nodes')}</dt>
            <dd>{health ? `${health.onlineNodes}/${health.totalNodes}` : '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.health.upstreamCost', 'Upstream cost')}</dt>
            <dd>{summary ? formatDecimalText(summary.upstreamCost, 2) : '—'}</dd>
          </div>
          <div>
            <dt>{t('admin.dataCenter.screen.health.referral', 'Referral revenue')}</dt>
            <dd>{snapshot.referral ? formatDecimalText(snapshot.referral.revenue, 2) : '—'}</dd>
          </div>
        </dl>
      </div>

      {snapshot.insights.length > 0 ? (
        <ul className="screen-health__insights">
          {snapshot.insights.slice(0, 2).map((insight) => (
            <li data-severity={insight.severity} key={insight.key} title={insight.detail}>
              <span className="screen-health__insight-title">{insight.title}</span>
              <span className="screen-health__insight-value">{insight.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="screen-health__calm">
          {t('admin.dataCenter.screen.health.noInsights', 'No operational alerts for this window')}
        </p>
      )}
    </div>
  );
}

function RadialGauge({ percent, caption, color }: { percent: number; caption: string; color: string }) {
  const safe = Math.min(Math.max(Number.isFinite(percent) ? percent : 0, 0), 100);
  const data = [{ name: caption, value: safe, fill: color }];
  return (
    <div className="screen-radial" data-screen-gauge={caption}>
      <ResponsiveContainer height="100%" width="100%">
        <RadialBarChart barSize={7} cx="50%" cy="50%" data={data} endAngle={-250} innerRadius="72%" outerRadius="96%" startAngle={70}>
          <PolarAngleAxis domain={[0, 100]} type="number" />
          <RadialBar background={{ fill: 'rgba(148,163,184,0.16)' }} cornerRadius={8} dataKey="value" isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="screen-radial__center">
        <strong>{safe.toFixed(1)}%</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ticker + states
 * ------------------------------------------------------------------ */

function Ticker({ snapshot, locale }: { snapshot: DataScreenSnapshot; locale: string }) {
  const { t } = useTranslation();
  const items = [
    snapshot.summary ? `${t('admin.dataCenter.screen.kpi.tokens', 'Tokens')} ${formatIntegerText(snapshot.summary.totalTokens)}` : null,
    snapshot.summary ? `${t('admin.dataCenter.screen.kpi.requests', 'API calls')} ${formatIntegerText(snapshot.summary.totalRequests)}` : null,
    snapshot.payments ? `${t('admin.dataCenter.screen.kpi.orders', 'Paid orders')} ${formatIntegerText(snapshot.payments.paidCount)}` : null,
    snapshot.recharge ? `${t('admin.dataCenter.screen.kpi.recharge', 'Recharge cash-in')} ${formatDecimalText(snapshot.recharge.amount, 2)}` : null,
    snapshot.referral ? `${t('admin.dataCenter.screen.kpi.invited', 'Users invited')} ${formatIntegerText(snapshot.referral.invited)}` : null,
    snapshot.health ? `${t('admin.dataCenter.screen.health.nodes', 'Nodes')} ${snapshot.health.onlineNodes}/${snapshot.health.totalNodes}` : null,
    `${t('admin.dataCenter.screen.trend.generated', 'Snapshot')} ${formatClock(snapshot.generatedAt, locale) || '—'}`,
  ].filter((item): item is string => Boolean(item));

  return (
    <footer aria-live="off" className="screen-ticker">
      <span className="screen-ticker__tag">
        {t('admin.dataCenter.screen.live', 'LIVE')}
      </span>
      <div className="screen-ticker__viewport">
        <div className="screen-ticker__track">
          {[...items, ...items].map((item, index) => (
            <span className="screen-ticker__item" key={`ticker-${index}`}>
              {item}
              <span aria-hidden="true" className="screen-ticker__separator">◆</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

function ScreenLoading({ label }: { label: string }) {
  return (
    <div className="screen-state" role="status">
      <span className="screen-state__spinner" />
      <p>{label}</p>
    </div>
  );
}

function ScreenFailure({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="screen-state" role="alert">
      <CircleAlert aria-hidden="true" className="h-8 w-8 text-rose-400" />
      <h2>{title}</h2>
      <p>{message}</p>
      <button className="screen-button" onClick={onRetry} type="button">
        <RefreshCw aria-hidden="true" className="h-4 w-4" />
        {t('admin.dataCenter.error.retry', 'Retry')}
      </button>
    </div>
  );
}
