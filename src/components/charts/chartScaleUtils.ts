export function catBandTick(i: number, total: number): boolean {
  if (total <= 14) return true;
  const step = Math.ceil(total / 14);
  return i % step === 0;
}

export function valFormat(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  if (abs >= 100) return `${Math.round(v)}`;
  return `${Math.round(v * 10) / 10}`;
}
