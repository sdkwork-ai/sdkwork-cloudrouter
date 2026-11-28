/**
 * Donut and gauge visuals for the operator data screen.
 *
 * Both are polar SVGs on a `0 0 100 100` viewBox, drawn as solid objects:
 *
 * - the donut is a tilted torus — an extruded underside gives it thickness, the
 *   rim carries a specular highlight, and the whole disc is rotated in 3D by
 *   the stylesheet so it reads as a physical ring viewed from above;
 * - the gauge is a partial ring exposed through the same depth treatment.
 *
 * Percentages come pre-computed from the service, so the visual and the legend
 * can never disagree.
 */

import { useTranslation } from 'react-i18next';
import { buildDonutSegments, buildGaugeArc } from '../dataScreenChart.ts';
import type { DataScreenShareItem } from '../dataScreenService.ts';
import { ScreenEmpty } from './ScreenFrame.tsx';

export function ScreenDonut({
  items,
  centerLabel,
  centerValue,
  emptyMessage,
  legend = 'side',
}: {
  items: readonly DataScreenShareItem[];
  centerLabel?: string;
  centerValue?: string;
  emptyMessage: string;
  legend?: 'side' | 'bottom' | 'none';
}) {
  const segments = buildDonutSegments(items.map((item) => ({
    name: item.name,
    value: item.chartValue,
    color: item.color,
  })));
  if (segments.length === 0) {
    return <ScreenEmpty message={emptyMessage} />;
  }
  const size = legend === 'bottom' ? 150 : 178;
  return (
    <div className="screen-donut" data-legend={legend}>
      <div className="screen-donut__ring" style={{ width: `min(${size}px, ${legend === 'bottom' ? '96%' : '78%'})` }}>
        <svg aria-hidden="true" className="screen-donut__svg" viewBox="0 0 100 100">
          <defs>
            {/* Per-share shading: a lit upper edge falling into a deeper body
                tone. It must stay inside the share's own hue — darkening toward
                the panel colour would erase a 100% share into a solid disc. */}
            {segments.map((segment, index) => (
              <linearGradient
                id={`screen-donut-face-${index}`}
                key={`gradient-${index}`}
                x1="0"
                x2="0.65"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
                <stop offset="26%" stopColor={segment.color} stopOpacity="1" />
                <stop offset="100%" stopColor={segment.color} stopOpacity="0.78" />
              </linearGradient>
            ))}
            <radialGradient id="screen-donut-well" cx="50%" cy="42%" r="52%">
              <stop offset="0%" stopColor="#0b1728" stopOpacity="1" />
              <stop offset="100%" stopColor="#050a13" stopOpacity="1" />
            </radialGradient>
          </defs>

          {/* Recessed well the ring sits over; its radius matches the hole so no
              seam shows where the extruded underside meets the centre. */}
          <circle cx="50" cy="50" fill="url(#screen-donut-well)" r="31" />

          {/* Extruded underside: the same arcs offset downward read as thickness. */}
          <g className="screen-donut__depth" transform="translate(0 3.6)">
            {segments.map((segment, index) => (
              <path d={segment.path} fill={segment.color} key={`depth-${index}`} opacity="0.42" />
            ))}
          </g>

          {segments.map((segment, index) => (
            <path
              d={segment.path}
              fill={`url(#screen-donut-face-${index})`}
              key={`segment-${index}`}
            >
              <title>{`${segment.label}: ${segment.percent.toFixed(1)}%`}</title>
            </path>
          ))}

          {/* Specular rim on the outer edge sells the torus curvature. */}
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="49"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeLinecap="round"
            strokeDasharray="34 200"
            strokeWidth="0.9"
          />
          <circle cx="50" cy="50" fill="none" r="31" stroke="rgba(6, 12, 22, 0.85)" strokeWidth="0.8" />
        </svg>
        {centerValue || centerLabel ? (
          <div className="screen-donut__center">
            {centerValue ? <strong>{centerValue}</strong> : null}
            {centerLabel ? <span>{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
      {legend === 'none' ? null : (
        <ul className="screen-donut__legend">
          {items.map((item) => (
            <li className="screen-donut__legend-item" key={item.name}>
              <span aria-hidden="true" className="screen-donut__swatch" style={{ background: item.color }} />
              <span className="screen-donut__legend-name" title={item.name}>{item.name}</span>
              <span className="screen-donut__legend-bar">
                <span style={{ background: item.color, width: `${Math.max(item.percent, 2)}%` }} />
              </span>
              <span className="screen-donut__legend-percent">{item.percent.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScreenGauge({
  ratio,
  value,
  caption,
  color,
  sweep = 250,
}: {
  ratio: number;
  value: string;
  caption: string;
  color: string;
  sweep?: number;
}) {
  const { t } = useTranslation();
  const { track, value: valuePath } = buildGaugeArc(ratio, 42, 7, 145, sweep);
  const gradientId = `gauge-${color.replace('#', '')}`;
  return (
    <div aria-label={`${caption}: ${value}`} className="screen-gauge" role="img">
      <svg aria-hidden="true" className="screen-gauge__svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={track} fill="rgba(148, 163, 184, 0.14)" />
        <g transform="translate(0 2.2)" opacity="0.35">
          <path d={track} fill={color} />
          {valuePath ? <path d={valuePath} fill={color} /> : null}
        </g>
        <path d={track} fill="rgba(148, 163, 184, 0.14)" />
        {valuePath ? <path d={valuePath} fill={`url(#${gradientId})`} /> : null}
      </svg>
      <div className="screen-gauge__center">
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>
      <span className="sr-only">{t('admin.dataCenter.screen.gauge.ratio', 'Share')}</span>
    </div>
  );
}
