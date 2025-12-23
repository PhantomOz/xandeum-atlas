const BYTE_UNITS = [
  { unit: "B", value: 1 },
  { unit: "KB", value: 1024 },
  { unit: "MB", value: 1024 ** 2 },
  { unit: "GB", value: 1024 ** 3 },
  { unit: "TB", value: 1024 ** 4 },
  { unit: "PB", value: 1024 ** 5 },
];

export function formatBytes(value: number, precision = 1): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const unit = [...BYTE_UNITS].reverse().find((entry) => value >= entry.value) ?? BYTE_UNITS[0];
  const amount = value / unit.value;
  return `${amount.toFixed(precision)} ${unit.unit}`;
}

export function formatPercent(value: number, precision = 2): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(precision)}%`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "now";
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatRelativeTimeFromSeconds(lastSeenSeconds: number, now = Date.now() / 1000): string {
  if (!Number.isFinite(lastSeenSeconds)) {
    return "unknown";
  }
  const deltaSeconds = Math.round(lastSeenSeconds - now);
  const absSeconds = Math.abs(deltaSeconds);

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(deltaSeconds, "second");
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), "minute");
  }
  if (absSeconds < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), "hour");
  }
  return formatter.format(Math.round(deltaSeconds / 86400), "day");
}

export function abbreviateKey(value: string, size = 4): string {
  if (!value) return "unknown";
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}
