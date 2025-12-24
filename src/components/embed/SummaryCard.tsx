import type { ExportSummaryResponse } from "@/lib/export-fetch";
import { formatNumber, formatPercent } from "@/lib/number-format";

interface SummaryCardProps {
  summary: ExportSummaryResponse;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const { data } = summary;
  const lastUpdated = new Date(summary.generatedAt).toLocaleString();

  return (
    <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-slate-900/40 p-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Xandeum Atlas</p>
          <h1 className="text-2xl font-semibold">Network Snapshot</h1>
        </div>
        <p className="text-xs text-slate-400">Updated {lastUpdated}</p>
      </header>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Metric label="Total nodes" value={formatNumber(data.totalNodes)} accent="text-white" />
        <Metric label="Healthy" value={formatNumber(data.healthy)} accent="text-emerald-300" subtitle={percentOf(data.healthy, data.totalNodes)} />
        <Metric label="Warning" value={formatNumber(data.warning)} accent="text-amber-300" subtitle={percentOf(data.warning, data.totalNodes)} />
        <Metric label="Critical" value={formatNumber(data.critical)} accent="text-rose-300" subtitle={percentOf(data.critical, data.totalNodes)} />
        <Metric label="Avg usage" value={formatPercent(data.avgUsagePercent)} />
        <Metric label="Capacity" value={`${data.usedTb.toFixed(1)} / ${data.committedTb.toFixed(1)} TB`} />
      </dl>
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <span>Latest release: {data.latestVersion}</span>
        <span>Stale nodes: {data.stale}</span>
        <span>Version {summary.version}</span>
      </footer>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.parent?.postMessage({ type: "xandeum-embed-resize", height: document.body.scrollHeight }, "*");`,
        }}
      />
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string;
  subtitle?: string;
  accent?: string;
}

function Metric({ label, value, subtitle, accent }: MetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent ?? "text-white"}`}>{value}</p>
      {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function percentOf(part: number, total: number) {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}
