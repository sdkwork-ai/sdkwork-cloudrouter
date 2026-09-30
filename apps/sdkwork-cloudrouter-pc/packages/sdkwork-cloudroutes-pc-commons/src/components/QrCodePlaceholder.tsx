import { useTranslation } from 'react-i18next';

/**
 * Deterministic stand-in drawn when an operator has switched a QR slot on but has not
 * uploaded an image yet. It renders the visual grammar of a real QR code (three finder
 * patterns, timing lines, pseudo-random data modules) without encoding anything, so the
 * footer keeps a balanced layout instead of collapsing to a gap.
 *
 * The module pattern is derived from the coordinates only, which keeps server and client
 * markup identical and avoids pulling in a QR encoder for a purely decorative element.
 */
const MODULE_COUNT = 21;

const FINDER_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, MODULE_COUNT - 7],
  [MODULE_COUNT - 7, 0],
];

/** Finder patterns plus their mandatory 1-module quiet separators. */
const RESERVED_ZONES: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 8, 8],
  [0, MODULE_COUNT - 8, 8, MODULE_COUNT],
  [MODULE_COUNT - 8, 0, MODULE_COUNT, 8],
];

function isReserved(row: number, col: number): boolean {
  return RESERVED_ZONES.some(
    ([top, left, bottom, right]) => row >= top && row < bottom && col >= left && col < right,
  );
}

function finderLocalCoordinates(row: number, col: number): readonly [number, number] | null {
  for (const [rowOffset, colOffset] of FINDER_CORNERS) {
    if (row >= rowOffset && row < rowOffset + 7 && col >= colOffset && col < colOffset + 7) {
      return [row - rowOffset, col - colOffset];
    }
  }
  return null;
}

function isDarkModule(row: number, col: number): boolean {
  const finder = finderLocalCoordinates(row, col);
  if (finder) {
    const [localRow, localCol] = finder;
    const isRing = localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6;
    const isCore = localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4;
    return isRing || isCore;
  }
  if (isReserved(row, col)) {
    return false;
  }
  // Timing patterns run along row 6 and column 6 between the finder zones.
  if (row === 6 || col === 6) {
    return (row + col) % 2 === 0;
  }
  // Deterministic data-module fill: stable across renders, no encoder required.
  const hash = (row * 31 + col * 17 + ((row * col) % 7) * 13) % 5;
  return hash === 0 || hash === 2;
}

const DARK_MODULES: ReadonlyArray<readonly [number, number]> = Array.from(
  { length: MODULE_COUNT * MODULE_COUNT },
  (_, index) => [Math.floor(index / MODULE_COUNT), index % MODULE_COUNT] as const,
).filter(([row, col]) => isDarkModule(row, col));

const VIEW_BOX_SIZE = MODULE_COUNT * 4;

export function QrCodePlaceholder({ label }: { label: string }) {
  const { t } = useTranslation();

  return (
    <div
      className="relative h-28 w-28 overflow-hidden rounded-lg bg-white"
      data-cloudrouter-qr-placeholder
      title={label}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full"
        focusable="false"
        role="presentation"
        viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      >
        <rect fill="#ffffff" height={VIEW_BOX_SIZE} width={VIEW_BOX_SIZE} />
        {DARK_MODULES.map(([row, col]) => (
          <rect
            fill="#cbd5e1"
            height={4}
            key={`${row}-${col}`}
            width={4}
            x={col * 4}
            y={row * 4}
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-white/85 px-1.5 py-1 text-center text-[10px] font-medium leading-tight text-slate-500">
        {t('footer.qrcode.notConfigured', { defaultValue: 'Not configured yet' })}
      </div>
    </div>
  );
}
