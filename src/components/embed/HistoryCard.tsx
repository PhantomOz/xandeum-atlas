import type { ExportHistoryResponse } from "@/lib/export-fetch";
import { formatNumber, formatPercent } from "@/lib/number-format";

interface HistoryCardProps {
  history: ExportHistoryResponse;
}

export function HistoryCard({ history }: HistoryCardProps) {
  const { points, interval } = history.data;
  const latest = points[points.length - 1];
  const deltaNodes = latest && points.length > 1 ? latest.totalNodes - points[0].totalNodes : 0;
  const deltaLabel = deltaNodes >= 0 ? `+${deltaNodes}` : `${deltaNodes}`;

  return (
    <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-slate-900/40 p-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Xandeum Atlas</p>
          <h1 className="text-2xl font-semibold">Trend: {interval}</h1>
        </div>
        <p className="text-xs text-slate-400">{points.length} samples · Version {history.version}</p>
      </header>
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
          <Sparkline points={points} />
        </div>
        {latest ? (
          <dl className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.35em] text-slate-500">Current nodes</dt>
              <dd className="mt-1 text-2xl font-semibold text-white">{formatNumber(latest.totalNodes)}</dd>
              <p className={`text-xs ${deltaNodes >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{deltaLabel} vs first point</p>
            </div>
            <div className="mt-4">
              <dt className="text-xs uppercase tracking-[0.35em] text-slate-500">Healthy share</dt>
              <dd className="mt-1 text-xl text-emerald-200">{formatPercent((latest.healthy / Math.max(latest.totalNodes, 1)) * 100)}</dd>
            </div>
            <div className="mt-4">
              <dt className="text-xs uppercase tracking-[0.35em] text-slate-500">Critical share</dt>
              <dd className="mt-1 text-xl text-rose-200">{formatPercent((latest.critical / Math.max(latest.totalNodes, 1)) * 100)}</dd>
            </div>
          </dl>
        ) : null}
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.parent?.postMessage({ type: "xandeum-embed-resize", height: document.body.scrollHeight }, "*");`,
        }}
      />
    </section>
  );
}

interface SparklineProps {
  points: ExportHistoryResponse["data"]["points"];
}

function Sparkline({ points }: SparklineProps) {
  if (!points.length) {
    return <p className="text-xs text-slate-400">No data</p>;
  }
  const totals = points.map((point) => point.totalNodes);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const height = 120;
  const width = 320;
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const normalized = (point.totalNodes - min) / range;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const gradientId = "sparklineGradient";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Total nodes trend" className="h-32 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.8)" />
          <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
        </linearGradient>
      </defs>
      <path d={`${path}`} fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="3" strokeLinecap="round" />
      <path
        d={`${path} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#${gradientId})`}
        stroke="none"
        opacity={0.4}
      />
    </svg>
  );
}
