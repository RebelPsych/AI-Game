export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 1000) {
    return Math.floor(value).toLocaleString('en-US');
  }
  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}K`;
  }
  if (value < 1_000_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

export function formatRate(value: number): string {
  if (value <= 0) return '0/s';
  if (value < 10) return `${value.toFixed(1)}/s`;
  return `${formatNumber(value)}/s`;
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  if (value < 1000) {
    return `$${Math.floor(value).toLocaleString('en-US')}`;
  }
  if (value < 1_000_000) {
    return `$${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}K`;
  }
  return `$${(value / 1_000_000).toFixed(2)}M`;
}
