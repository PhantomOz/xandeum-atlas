import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import type { ReactNode } from "react";

interface DeploymentStep {
  title: string;
  details: ReactNode[];
}

const deploymentSteps: DeploymentStep[] = [
  {
    title: "Prepare environment",
    details: [
      (
        <span key="clone-repo">
          Clone
          {" "}
          <Link href="https://github.com/PhantomOz/xandeum-atlas" className="text-emerald-300 underline" target="_blank" rel="noreferrer">
            PhantomOz/xandeum-atlas
          </Link>
          {" "}
          and copy `.env.example` → `.env.local`.
        </span>
      ),
      "Ensure Node 18+, pnpm, and access to your pNode seeds over HTTP/6000.",
      "Decide on persistence: configure `KV_REST_API_URL`/`KV_REST_API_TOKEN` (Upstash/Vercel KV) or ensure `DATA_ROOT` points at a writable volume.",
    ],
  },
  {
    title: "Configure runtime",
    details: [
      "Populate `PNODE_SEEDS`, `PNODE_CACHE_TTL`, and optional `PNODE_HISTORY_LIMIT`.",
      "Set `EXPORT_API_TOKEN` if you want to gate the public analytics API.",
      "Provide `EXPORT_API_BASE_URL` when fronting the app behind a proxy or custom domain.",
      "Optional: tweak `KV_NAMESPACE` or `DATA_ROOT` if you manage multiple Atlas deployments.",
    ],
  },
  {
    title: "Build & deploy",
    details: [
      "Run `pnpm install`, `pnpm lint`, and `pnpm build`.",
      "Deploy the `.next` output or let your hosting provider run `pnpm build && pnpm start`.",
      "Confirm KV credentials or mounted `DATA_ROOT` so history + alert configs persist across deploys.",
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
    body: "Everything begins on the landing page—auto-refreshed insight into the network with controls to tailor what you see.",
    details: [
      "Summary grid – real-time totals, health mix, usage, and release adoption. Hover tiles for exact counts.",
      "Seed controls – switch discovery lists, force refreshes, or reset to defaults without page reloads.",
      "Trend switcher – choose capacity, utilization, or health views; history limit selector updates the sparkline instantly.",
      "Storage leaders + table – dive into top providers, search by pubkey/IP, and export CSV/JSON for offline audits.",
      "Saved views & sharing – pin any filter/sort combo, rename inline, and copy the share link so teammates land on the same slice of data.",
    ],
  },
  {
    title: "Alert studio (/alerts)",
    body: "Give every downstream team autonomy over their incident pipeline without touching the server.",
    details: [
      "Access token – create or paste a tenant ID; it becomes the `x-alert-user` header for all API calls.",
      "Tenants are simply user-scoped namespaces keyed by that token, so downstream teams never see each other's webhooks or cooldowns.",
      "Webhook builder – define ID, label, status, target URL, optional secret header, and up to six triggers.",
      "Trigger types – total node drops, healthy share dips, critical spikes, or avg usage overages, each with per-trigger cooldowns.",
      "Change management – edit inline, delete with confirmation, and the UI stores draft state so you can iterate safely.",
    ],
  },
  {
    title: "Export API",
    body: "Syndicate the same metrics the UI uses via JSON endpoints suitable for CLI scripts, notebooks, or partner dashboards.",
    details: [
      "`/api/export/summary` – cached snapshot with totals, capacity, and release info.",
      "`/api/export/history?interval=6h&points=72` – downsampled time series; pick the cadence and resolution you need.",
      "`/api/export/nodes?status=healthy&limit=100` – paginated node feed for in-depth analytics.",
      "Security – set `EXPORT_API_TOKEN` to require `X-Atlas-Token`; all responses ship with CDN-friendly cache headers.",
    ],
  },
  {
    title: "Embeddable cards",
    body: "Drop fully styled cards anywhere—status pages, documentation, or investor updates—without exposing the full Atlas UI.",
    details: [
      "Summary embed – `/embed/summary?token=…` mirrors the dashboard hero while staying iframe-friendly.",
      "History embed – `/embed/history?interval=24h` renders a gradient sparkline with current deltas.",
      "Auto-resize – every card posts `xandeum-embed-resize`; add a single `message` listener to adjust iframe height.",
      "Brand-safe – gradients, type, and rounding match the main experience, so embeds feel native on any page.",
    ],
  },
];

const personaFlows = [
  {
    title: "Operator deploy flow",
    persona: "Platform engineer",
    steps: [
      { label: "Plan", description: "Pick persistence (KV creds or /data volume) and confirm pRPC seed reachability." },
      { label: "Configure", description: "Set env vars (`PNODE_SEEDS`, `EXPORT_API_TOKEN`, alert storage paths)." },
      { label: "Ship", description: "`pnpm build && pnpm start` on your host, fronted by CDN/Load Balancer." },
      { label: "Observe", description: "Watch `/api/export/*` metrics, rotate alert secrets, schedule backups." },
    ],
  },
  {
    title: "Data consumer flow",
    persona: "Analyst / partner",
    steps: [
      { label: "Discover", description: "Preview `/embed/summary` to gauge health at a glance." },
      { label: "Connect", description: "Call `/api/export/summary` or `/history` with provided token." },
      { label: "Automate", description: "Pipe JSON into notebooks, BI tools, or scheduled reports." },
      { label: "Embed", description: "Drop iframes into Confluence/Statuspage and listen for resize events." },
    ],
  },
  {
    title: "Alert + incident flow",
    persona: "On-call team",
    steps: [
      { label: "Enroll", description: "Visit `/alerts`, claim tenant token, and add Slack/PagerDuty webhook." },
      { label: "Tune", description: "Set triggers (healthy < 70%, critical > 20%, nodes drop 10%)." },
      { label: "Respond", description: "Receive POST payloads with current/previous metrics + reason." },
      { label: "Review", description: "Use `/history` chart + summary tiles to verify recovery." },
    ],
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
          <GuideNavigation />
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <Link href="/docs/export-api" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Export API Docs
            </Link>
            <Link href="/embed/summary" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.35em]">
              Demo Embed
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2" id="deploy">
          <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">For Developers</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Deployment blueprint</h2>
            <p className="mt-2 text-sm text-slate-300">Skim the headers or expand a step only when you need the gritty detail—GitBook style.</p>
            <div className="mt-6 space-y-4">
              {deploymentSteps.map((step, index) => (
                <details key={step.title} className="rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-4" open={index === 0}>
                  <summary className="cursor-pointer text-lg font-semibold text-white">
                    <span className="text-xs uppercase tracking-[0.4em] text-slate-500">Step {index + 1}</span>
                    <br />
                    {step.title}
                  </summary>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {step.details.map((detail, detailIndex) => (
                      <li key={`${step.title}-${detailIndex}`}>{detail}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6" id="use">
            <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">For Users</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Analytics quickstart</h2>
            <p className="mt-2 text-sm text-slate-300">Each feature panel expands into the exact controls and outcomes it offers.</p>
            <div className="mt-6 space-y-3">
              {usageHighlights.map((item) => (
                <details key={item.title} className="rounded-2xl border border-white/5 bg-slate-900/40 px-4 py-4">
                  <summary className="cursor-pointer text-lg font-semibold text-white">{item.title}</summary>
                  <p className="mt-2 text-sm text-slate-300">{item.body}</p>
                  {item.details ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {item.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </details>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Need a webhook?</p>
              <p className="mt-2">Head to <Link href="/alerts" className="text-emerald-300 underline">/alerts</Link>, claim a token, and create triggers that ship directly to Slack, PagerDuty, or your custom incident pipeline.</p>
            </div>
          </article>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6" id="journeys">
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">User journey diagrams</p>
          <p className="mt-2 text-sm text-slate-300">
            Each swimlane below maps a persona to the exact touchpoints they will use in the Atlas, making it easy to brief stakeholders or onboard new teams.
          </p>
          <div className="mt-6 space-y-6">
            {personaFlows.map((flow) => (
              <FlowDiagram key={flow.title} title={flow.title} persona={flow.persona} steps={flow.steps} />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6" id="checklist">
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
                "Back storage with KV or a mounted /data volume",
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

function GuideNavigation() {
  const links = [
    { href: "#deploy", label: "Deploy" },
    { href: "#use", label: "Use" },
    { href: "#journeys", label: "Journeys" },
    { href: "#checklist", label: "Checklist" },
  ];
  return (
    <nav className="mt-5 flex flex-wrap gap-2 text-xs">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.4em] text-slate-200 hover:border-emerald-400">
          {link.label}
        </a>
      ))}
    </nav>
  );
}

interface FlowDiagramProps {
  title: string;
  persona: string;
  steps: { label: string; description: string }[];
}

function FlowDiagram({ title, persona, steps }: FlowDiagramProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">{persona}</p>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <span className="text-xs text-slate-400">{steps.length} touchpoints</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        {steps.map((step, index) => (
          <div key={`${title}-${step.label}`} className="relative flex-1 min-w-[160px]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Step {index + 1}</p>
              <h4 className="mt-1 text-sm font-semibold text-white">{step.label}</h4>
              <p className="mt-1 text-xs text-slate-300">{step.description}</p>
            </div>
            {index < steps.length - 1 ? (
              <div className="absolute right-[-18px] top-1/2 hidden h-0.5 w-9 -translate-y-1/2 bg-gradient-to-r from-emerald-400/70 to-transparent sm:block" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
