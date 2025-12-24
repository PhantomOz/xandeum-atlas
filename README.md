## Xandeum pNode Atlas

Live analytics for the Xandeum pNode network. The dashboard ingests gossip data directly from pNodes via pRPC (`get-pods-with-stats`) and visualises health, storage utilisation, release adoption, and node-level telemetry.

Repository: https://github.com/PhantomOz/xandeum-atlas

### Features

- Seed-aware pRPC client with automatic retry + caching
- Aggregated metrics (uptime, storage, status mix, release histogram)
- Searchable/filterable node directory with CSV/JSON export
- Version distribution + storage band insights + top storage providers
- Auto-refresh (30s) with manual override
- In-app seed override panel to target any custom gossip scouts
- Slide-over inspector per node with raw JSON export
- Rolling history capture with trend chart (stored locally under `data/pnode-history.json`)
- Multi-tenant alert webhooks with UI + API so hosted users can subscribe to their own triggers

### Getting Started

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000 to view the dashboard.

### Environment

Optional `.env.local` (values shown are defaults):

```
PNODE_SEEDS=173.212.220.65,161.97.97.41,192.190.136.36,192.190.136.38,207.244.255.1,192.190.136.28,192.190.136.29,173.212.203.145
PNODE_RPC_PORT=6000
PNODE_CACHE_TTL=25000           # ms
PNODE_REQUEST_TIMEOUT=7000      # ms
PNODE_STALE_SECONDS=1800        # mark nodes stale after 30 min
PNODE_HISTORY_LIMIT=288         # max snapshots to persist for trends
DATA_ROOT=./data                # override when persisting to a local volume
KV_REST_API_URL=                # set with KV token to persist trends/alerts off-disk
KV_REST_API_TOKEN=
KV_NAMESPACE=atlas
```

You can point the app at custom seeds (IP or hostnames) either via the `.env` above or through the "Discovery list" control in the UI (comma-separated). The server-side fetcher will try `get-pods-with-stats`, fall back to `get-pods`, deduplicate nodes by pubkey, and cache the snapshot for `PNODE_CACHE_TTL` ms per discovery list.

Set both `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Upstash / Vercel KV credentials) on serverless hosts so history + alert configs persist between deployments. When those variables are absent, Atlas writes the JSON stores to `DATA_ROOT`, which should live on a durable volume (Docker bind mount, persistent disk, etc.).

### Alert Webhooks

Managed deployments expose `/alerts`, a self-serve console where downstream users paste their access token and curate their own webhooks + triggers. Each token maps to an isolated namespace persisted in Vercel KV when `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set (or to `DATA_ROOT/user-alert-webhooks.json` when you run on your own volume). If you still maintain the legacy single-tenant file (`data/alert-webhooks.json`), those entries are read-only and show up under the special `__legacy__` tenant.

#### Access model

- Generate an access token (any string matching `[a-zA-Z0-9._:-]{3,64}`) and share it with the customer who should manage their alerts.
- The `/alerts` UI stores that token locally and calls the API with an `x-alert-user` header so only that tenant’s configs are touched.
- Webhook payloads include `tenantId` so your receivers can route downstream notifications.

#### API surface

All endpoints require `x-alert-user: <token>`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/alerts/webhooks` | List webhooks for the current tenant. |
| `POST` | `/api/alerts/webhooks` | Create a webhook (body must match the schema below). |
| `PUT` | `/api/alerts/webhooks/:id` | Replace the webhook with the given id. |
| `DELETE` | `/api/alerts/webhooks/:id` | Remove that webhook. |

Schema snippet:

```json
{
	"id": "pagerduty",
	"label": "PagerDuty",
	"url": "https://hooks.example.com/xandeum",
	"secret": "optional-shared-secret",
	"isEnabled": true,
	"triggers": [
		{ "type": "healthyPercentBelow", "percent": 70, "cooldownMinutes": 15 },
		{ "type": "totalNodesDrop", "percent": 10 }
	]
}
```

Supported trigger types:

- `totalNodesDrop` – fires when total nodes decreased by at least `percent` versus the previous snapshot.
- `healthyPercentBelow` – fires when the healthy node share falls below `percent`.
- `criticalPercentAbove` – fires when the critical share exceeds `percent`.
- `avgUsagePercentAbove` – fires when average storage usage rises above `percent`.

Each trigger inherits the default 30-minute cooldown unless `cooldownMinutes` is set. Deliveries POST `{ webhookId, tenantId, triggerType, reason, generatedAt, current, previous }` with an `x-alert-secret` header when `secret` is supplied.

> Tip: On Vercel, wire Atlas to Upstash/Vercel KV via `KV_REST_API_URL` + `KV_REST_API_TOKEN`; on self-hosted targets, point `DATA_ROOT` at a persistent path so `user-alert-webhooks.json`, `alert-log.json`, and `pnode-history.json` survive restarts.

### Scripts

- `pnpm dev` – run the Next.js dev server
- `pnpm build && pnpm start` – production build + serve
- `pnpm lint` – lint the codebase

### Deployment

Any Node 18+ target works (Vercel, Netlify, self-hosted). Ensure outbound access to your chosen pNode seeds over HTTP/6000 and configure the environment variables above. For serverless targets, provide `KV_REST_API_URL`/`KV_REST_API_TOKEN` so history and alert data live in KV. For self-hosted targets, set `DATA_ROOT` to a mounted volume if you prefer the JSON-file persistence.

### Export API

The dashboard now exposes curated analytics under `/api/export/*` for downstream dashboards and partner apps:

- `GET /api/export/summary` – cached snapshot metrics (totals, health mix, storage usage, latest release).
- `GET /api/export/history?interval=6h&points=72` – downsampled history suitable for charts.
- `GET /api/export/nodes?status=healthy&limit=100` – paginated node feed for deeper integrations.

Add `EXPORT_API_TOKEN=shared-secret` to require callers to send `X-Atlas-Token` (or `?atlasToken=`). Responses ship with `Cache-Control: public, s-maxage=60` (history/summary) or `s-maxage=300` (node feed) so you can front them with a CDN. For complete schemas and versioning guarantees, see [docs/export-api.md](docs/export-api.md).

### Embeddable widgets

Hosted consumers can drop iframe-based cards anywhere:

```html
<iframe
	src="https://atlas.example.com/embed/summary?token=SHARED_TOKEN"
	width="420"
	height="340"
	loading="lazy"
	style="border:0;border-radius:24px;overflow:hidden;"
></iframe>
```

Each embed broadcasts `postMessage({ type: "xandeum-embed-resize", height })`; add a single listener to auto-resize the iframe:

```html
<script>
	window.addEventListener("message", (event) => {
		if (event.data?.type !== "xandeum-embed-resize") return;
		document.querySelectorAll("iframe[src*='/embed/']").forEach((frame) => {
			frame.style.height = `${event.data.height}px`;
		});
	});
</script>
```

Widgets live at `/embed/summary` and `/embed/history`; both accept the optional `token`, `interval`, and `points` parameters to mirror the Export API. Use them to syndicate Atlas metrics without giving users access to the full dashboard UI.


### Developer Signature

Built by [@SuperDevFavour](https://x.com/SuperDevFavour)
