import { SwaggerExplorer } from "@/components/docs/SwaggerExplorer";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const statHighlights = [
  { label: "Base route", value: "/api/export/*" },
  { label: "Auth header", value: "X-Atlas-Token" },
  { label: "Spec", value: "OpenAPI 3.0" },
];

const quickstartExamples = [
  {
    label: "Summary heartbeat",
    command: "curl -H 'X-Atlas-Token: your-token' https://atlas.yourdomain.com/api/export/summary",
  },
  {
    label: "History density",
    command: "curl 'https://atlas.yourdomain.com/api/export/history?interval=6h&points=48' -H 'X-Atlas-Token: your-token'",
  },
  {
    label: "Node drilldown",
    command: "curl 'https://atlas.yourdomain.com/api/export/nodes?status=healthy&limit=50' -H 'X-Atlas-Token: your-token'",
  },
];

const useCases = [
  {
    title: "Capacity monitors",
    body: "Pull the history endpoint every 15 minutes, feed it into Prometheus or Grafana, and alert when utilization crosses your guardrails.",
  },
  {
    title: "Incident postmortems",
    body: "Pair webhook payloads with the export snapshots to reconstruct exactly when healthy / critical mixes flipped.",
  },
  {
    title: "Partner portals",
    body: "Embed the summary endpoint in a status site or customer console; cache responses for 60s and forward the same atlas token downstream.",
  },
];

export default function ExportApiDocsPage() {
  const specUrl = "/api-docs/export-api.json";

  return (
    <AppShell>
      <div className="space-y-10">
        <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-900/40 via-slate-950/70 to-slate-950/90 px-8 py-10 shadow-[0_35px_140px_rgba(0,0,0,0.55)]">
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Programmable telemetry</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Export API Playground</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Drive notebooks, partner dashboards, or CI checks using the exact endpoints that power Atlas. This Swagger surface lets you test calls, swap tokens on the
            fly, and inspect response contracts without leaving the browser.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {statHighlights.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <Link href={specUrl} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Download JSON
            </Link>
            <Link href="/guide#checklist" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Deployment Checklist
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900/40 via-slate-950/80 to-black/60 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Live testing surface</p>
              <p className="mt-2 text-sm text-slate-300">
                Expand any operation to send a live request against your deployment. Toggle try-it-out, paste your tenant token into the auth header, and capture sample payloads for integration tests.
              </p>
            </div>
            <SwaggerExplorer apiUrl={specUrl} />
          </div>
          <aside className="space-y-5">
            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Authentication</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Bring your atlas token</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Mint a tenant token from <Link href="/alerts" className="text-emerald-300 underline">/alerts</Link>; it maps to the <span className="font-mono text-white">X-Atlas-Token</span> header.</li>
                <li>Prefer query params? Append <span className="font-mono text-white">?atlasToken=</span> for low-trust demos.</li>
                <li>Atlas never stores secrets in-browser; rotate tokens anytime without redeploying.</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">cURL quickstart</p>
              <div className="mt-3 space-y-3">
                {quickstartExamples.map((example) => (
                  <div key={example.label} className="rounded-2xl border border-white/5 bg-slate-900/60 p-3">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{example.label}</p>
                    <pre className="mt-2 overflow-x-auto text-xs text-emerald-200">
                      <code>{example.command}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Cache hints</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><span className="font-mono text-white">/summary</span> + <span className="font-mono text-white">/history</span> ship with <span className="font-mono text-white">s-maxage=60</span>.</li>
                <li><span className="font-mono text-white">/nodes</span> is heavier; default cache is 300s with paging cursors.</li>
                <li>Front this route with your CDN and forward only the auth header for deterministic caching.</li>
              </ul>
            </article>
          </aside>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Playbook ideas</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="rounded-2xl border border-white/5 bg-slate-900/50 p-4">
                <h3 className="text-lg font-semibold text-white">{useCase.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{useCase.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
