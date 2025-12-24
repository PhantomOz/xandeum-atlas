export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value ?? 0);
}

export function formatPercent(value: number): string {
  return `${(value ?? 0).toFixed(1)}%`;
}
