import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const deploymentSteps = [
  {
    title: "Prepare environment",
    details: [
      "Clone the repo and copy `.env.example` → `.env.local`.",
      "Ensure Node 18+, pnpm, and access to your pNode seeds over HTTP/6000.",
      "Provision persistent storage for `data/pnode-history.json`, `data/user-alert-webhooks.json`, and `data/alert-log.json`.",
    ],
  },
  {
    title: "Configure runtime",
    details: [
      "Populate `PNODE_SEEDS`, `PNODE_CACHE_TTL`, and optional `PNODE_HISTORY_LIMIT`.",
      "Set `EXPORT_API_TOKEN` if you want to gate the public analytics API.",
      "Provide `EXPORT_API_BASE_URL` when fronting the app behind a proxy or custom domain.",
    ],
  },
  {
    title: "Build & deploy",
    details: [
      "Run `pnpm install`, `pnpm lint`, and `pnpm build`.",
      "Deploy the `.next` output or let your hosting provider run `pnpm build && pnpm start`.",
      "Mount `/data` (or equivalent) to durable storage so history + alert configs persist.",
    ],
  },
  {
    title: "Operate",
    details: [
      "Use `/alerts` to mint tenant tokens and let downstream teams manage webhooks.",
      "Monitor logs for `/api/export/*` usage; scale horizontally by fronting with a CDN.",
      "Schedule backups of your data directory if you are not using an external store.",
    ],
  },
];

const usageHighlights = [
  {
    title: "Live dashboard",
    body: "Visit the home page for the full pNode Atlas experience—search, filtering, inline history, and top storage leaders.",
  },
  {
    title: "Alert studio",
    body: "Access `/alerts`, claim your access token, and create webhooks with trigger-level cooldowns. Each tenant can maintain their own endpoints without shell access.",
  },
  {
    title: "Export API",
    body: "Use `/api/export/summary`, `/api/export/history`, and `/api/export/nodes` to pull curated metrics. Attach `X-Atlas-Token` when the host enables it.",
  },
  {
    title: "Embeddable cards",
    body: "Drop `<iframe src='/embed/summary'>` or `/embed/history` into your site. Listen for `xandeum-embed-resize` messages to auto-adjust height.",
  },
];

export default function GuidePage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-emerald-900/40 via-slate-950/60 to-slate-950/80 px-8 py-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Playbooks</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Deploy & Use Xandeum Atlas</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Everything developers need to ship the analytics stack to production—and the quickstart for end users who just want to tap into alerts, exports, or
            embeddable widgets.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <Link href="/docs/export-api" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Export API Docs
            </Link>
            <Link href="/embed/summary" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Demo Embed
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">For Developers</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Deployment blueprint</h2>
            <div className="mt-6 space-y-5">
              {deploymentSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {step.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">For Users</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Analytics quickstart</h2>
            <div className="mt-6 space-y-4">
              {usageHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-4">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Need a webhook?</p>
              <p className="mt-2">Head to <Link href="/alerts" className="text-emerald-300 underline">/alerts</Link>, claim a token, and create triggers that ship directly to Slack, PagerDuty, or your custom incident pipeline.</p>
            </div>
          </article>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">API & Embed Checklist</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <ChecklistCard
              title="Secure exports"
              items={[
                "Optional `EXPORT_API_TOKEN` for authenticated access",
                "CDN-friendly caching headers on all responses",
                "Versioned payloads (see docs/export-api.md)",
              ]}
            />
            <ChecklistCard
              title="Embed friendly"
              items={[
                "Minimal iframe footprint with gradient styling",
                "postMessage height updates for auto-resize",
                "Query params for token, interval, and sampling",
              ]}
            />
            <ChecklistCard
              title="Operational hygiene"
              items={[
                "Mount /data to durable storage",
                "Schedule backups or externalize history store",
                "Monitor `/api/export/*` and `/alerts` logs",
              ]}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

interface ChecklistCardProps {
  title: string;
  items: string[];
}

function ChecklistCard({ title, items }: ChecklistCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-1 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
