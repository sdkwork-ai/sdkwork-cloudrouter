/**
 * Main trend chart of the operator data screen.
 *
 * Drawn as hand-built SVG in a fixed 1000×320 coordinate box scaled by
 * `preserveAspectRatio="none"` so the wall keeps its proportions at every
 * resolution. Each metric gets its own colour, a soft area glow, a baseline
 * dot row, and a hover crosshair that reports the exact decimal value — the
 * console page it links to shows the same numbers, so the hover must not
 * round them into a different truth.
 */

import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildAreaPath,
  buildSmoothPath,
  buildTicks,
  createLinearScale,
  formatCompactNumber,
  formatDecimalText,
  formatIntegerText,
  pickLabelIndices,
  plotX,
  toPlotPoints,
} from '../dataScreenChart.ts';
import type { DataScreenSummary, DataScreenTrendPoint } from '../dataScreenService.ts';

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 320;
const PLOT_PADDING = { top: 18, right: 16, bottom: 34, left: 62 };

export type TrendMetric = 'tokens' | 'requests' | 'points';

const METRIC_STYLE: Readonly<Record<TrendMetric, { color: string; gradient: string; key: keyof DataScreenTrendPoint }>> = {
  tokens: { color: '#22d3ee', gradient: 'tokenGlow', key: 'tokenValue' },
  requests: { color: '#34d399', gradient: 'requestGlow', key: 'requestValue' },
  points: { color: '#a78bfa', gradient: 'pointGlow', key: 'pointValue' },
};

export function ScreenTrendChart({
  points,
  metric,
  summary,
}: {
  points: readonly DataScreenTrendPoint[];
  metric: TrendMetric;
  summary: DataScreenSummary | null;
}) {
  const { t } = useTranslation();
  const gradientPrefix = useId().replace(/:/gu, '');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const style = METRIC_STYLE[metric];
  const plotWidth = VIEW_WIDTH - PLOT_PADDING.left - PLOT_PADDING.right;
  const plotHeight = VIEW_HEIGHT - PLOT_PADDING.top - PLOT_PADDING.bottom;

  const geometry = useMemo(() => {
    const values = points.map((point) => Number(point[style.key] ?? 0));
    const scale = createLinearScale(Math.max(1, ...values), plotHeight);
    const rawPoints = toPlotPoints(values, plotWidth, plotHeight);
    const shifted = rawPoints.map((point) => ({
      x: point.x + PLOT_PADDING.left,
      y: point.y + PLOT_PADDING.top,
    }));
    return {
      scale,
      points: shifted,
      ticks: buildTicks(scale.domainMax, 4),
      labels: pickLabelIndices(points.length, 8),
    };
  }, [plotHeight, plotWidth, points, style.key]);

  const linePath = buildSmoothPath(geometry.points, VIEW_HEIGHT - PLOT_PADDING.bottom);
  const areaPath = buildAreaPath(geometry.points, VIEW_HEIGHT - PLOT_PADDING.bottom);
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : undefined;
  const hoveredGeometry = hoverIndex !== null ? geometry.points[hoverIndex] : undefined;

  const readMetricText = (point: DataScreenTrendPoint): string => {
    if (metric === 'tokens') {
      return formatIntegerText(point.tokens);
    }
    if (metric === 'requests') {
      return formatIntegerText(point.requests);
    }
    return formatDecimalText(point.points, 4);
  };

  const yTickFor = (tickValue: number): number => VIEW_HEIGHT - PLOT_PADDING.bottom - geometry.scale(tickValue);

  return (
    <div className="screen-trend" data-screen-trend>
      <div className="screen-trend__stage">
        <svg
          aria-label={t('admin.dataCenter.screen.trend.title', 'Aggregate traffic')}
          className="screen-trend__svg"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (bounds.width <= 0 || points.length === 0) {
              setHoverIndex(null);
              return;
            }
            const ratio = (event.clientX - bounds.left) / bounds.width;
            const relative = ((ratio * VIEW_WIDTH) - PLOT_PADDING.left) / Math.max(plotWidth, 1);
            const index = Math.round(relative * Math.max(points.length - 1, 1));
            setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
          }}
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        >
          <defs>
            <linearGradient id={`${gradientPrefix}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={style.color} stopOpacity="0.42" />
              <stop offset="60%" stopColor={style.color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={style.color} stopOpacity="0" />
            </linearGradient>
            <filter height="300%" id={`${gradientPrefix}-glow`} width="200%" x="-50%" y="-100%">
              <feGaussianBlur result="blur" stdDeviation="4" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {geometry.ticks.map((tickValue, index) => {
            const y = yTickFor(tickValue);
            return (
              <g key={`tick-${index}`}>
                <line
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeDasharray="4 6"
                  x1={PLOT_PADDING.left}
                  x2={VIEW_WIDTH - PLOT_PADDING.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="screen-trend__axis-label"
                  fill="rgba(148, 163, 184, 0.78)"
                  textAnchor="end"
                  x={PLOT_PADDING.left - 10}
                  y={y + 4}
                >
                  {formatCompactNumber(tickValue)}
                </text>
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill={`url(#${gradientPrefix}-area)`} /> : null}
          {linePath ? (
            <>
              <path
                d={linePath}
                fill="none"
                filter={`url(#${gradientPrefix}-glow)`}
                stroke={style.color}
                strokeOpacity="0.55"
                strokeWidth="6"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={linePath}
                fill="none"
                stroke={style.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : null}

          {geometry.points.map((point, index) => {
            const active = index === hoverIndex;
            return (
              <circle
                cx={point.x}
                cy={point.y}
                fill={active ? '#f8fafc' : style.color}
                key={`dot-${index}`}
                r={active ? 4 : 2.4}
                stroke={style.color}
                strokeWidth={active ? 2 : 0}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {hoveredGeometry && hoveredPoint ? (
            <g>
              <line
                stroke="rgba(226, 232, 240, 0.45)"
                strokeDasharray="3 3"
                x1={hoveredGeometry.x}
                x2={hoveredGeometry.x}
                y1={PLOT_PADDING.top}
                y2={VIEW_HEIGHT - PLOT_PADDING.bottom}
              />
              <circle cx={hoveredGeometry.x} cy={hoveredGeometry.y} fill={style.color} r="5" />
            </g>
          ) : null}

          {geometry.labels.map((index) => {
            const point = points[index];
            if (!point) {
              return null;
            }
            return (
              <text
                className="screen-trend__axis-label"
                fill="rgba(148, 163, 184, 0.78)"
                key={`label-${index}`}
                textAnchor="middle"
                x={plotX(index, points.length, plotWidth) + PLOT_PADDING.left}
                y={VIEW_HEIGHT - 12}
              >
                {point.label}
              </text>
            );
          })}
        </svg>

        {hoveredPoint && hoveredGeometry ? (
          <div
            className="screen-trend__tooltip"
            style={{
              left: `${(hoveredGeometry.x / VIEW_WIDTH) * 100}%`,
              top: `${Math.max((hoveredGeometry.y / VIEW_HEIGHT) * 100 - 18, 0)}%`,
            }}
          >
            <span className="screen-trend__tooltip-label">{hoveredPoint.label}</span>
            <span className="screen-trend__tooltip-value" style={{ color: style.color }}>
              {readMetricText(hoveredPoint)}
            </span>
          </div>
        ) : null}
      </div>

      <dl className="screen-trend__footer">
        <div>
          <dt>{t('admin.dataCenter.screen.trend.peak', 'Window peak')}</dt>
          <dd>{formatCompactNumber(Math.max(0, ...points.map((point) => Number(point[style.key] ?? 0))))}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.kpi.tokens', 'Tokens')}</dt>
          <dd>{formatIntegerText(summary?.totalTokens ?? '0')}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.kpi.points', 'Credits')}</dt>
          <dd>{formatDecimalText(summary?.totalPoints ?? '0', 2)}</dd>
        </div>
        <div>
          <dt>{t('admin.dataCenter.screen.kpi.requestsPerMinute', 'Requests / min')}</dt>
          <dd>{formatDecimalText(summary?.requestsPerMinute ?? '0', 2)}</dd>
        </div>
      </dl>
    </div>
  );
}
