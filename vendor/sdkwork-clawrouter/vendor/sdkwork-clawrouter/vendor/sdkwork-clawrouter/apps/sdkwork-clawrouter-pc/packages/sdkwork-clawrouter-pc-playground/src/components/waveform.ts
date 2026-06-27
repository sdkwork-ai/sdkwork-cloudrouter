export function getDeterministicWaveBarStyle(index: number, min = 20, spread = 70) {
  const phase = Math.sin((index + 1) * 1.73) + Math.cos((index + 3) * 0.91);
  const normalized = (phase + 2) / 4;
  const height = Math.round(min + normalized * spread);
  const opacity = Number((0.5 + normalized * 0.4).toFixed(2));

  return {
    height: `${height}%`,
    opacity,
  };
}
