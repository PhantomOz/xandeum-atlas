# Public Analytics API Surface

This document captures the initial contract for exposing Xandeum Atlas metrics to downstream dashboards and embeddable widgets.

## Goals

- Provide a stable JSON API for curated metrics, rolling history, and optional node-level data.
- Keep endpoints cache-friendly so they can be fronted by a CDN.
- Offer optional lightweight access control (shared token header) without blocking public read-only usage.
- Serve the same data to internal embeds to avoid duplicated pipelines.

## Versioning

- Each response includes `version` (semantic date `YYYY.MM.DD`) and `generatedAt` ISO timestamp.
- Breaking schema changes increment the version and add `deprecatedAt` to the prior response for one deployment cycle.
- Route paths remain stable; clients rely on the version field for compatibility checks.

## Authentication & Caching

- Endpoints are public by default.
- Optional `X-Atlas-Token` header/`atlasToken` query param enforces a shared secret if configured via `process.env.EXPORT_API_TOKEN`.
- Responses use `Cache-Control: public, s-maxage=60` (summary/history) and `s-maxage=300` (node feed) to enable CDN caching.
- Future enhancements: rate-limit middleware keyed on token or IP.

## Endpoints

### `GET /api/export/summary`

High-level metrics snapshot derived from `getPnodeSnapshot()` cache.

```json
{
  "version": "2025.12.24",
  "generatedAt": "2025-12-24T10:05:00Z",
  "data": {
    "totalNodes": 412,
    "publicNodes": 260,
    "healthy": 300,
    "warning": 72,
    "critical": 40,
    "avgUsagePercent": 47.8,
    "committedTb": 165.4,
    "usedTb": 78.2,
    "latestVersion": "0.19.4",
    "stale": 15
  }
}
```

- Query params: none in v1 (future: `fields`, `seed`).
- Backend: call `getPnodeSnapshot({ forceRefresh: false })` to reuse cache.

### `GET /api/export/history`

Downsampled time series sourced from `pnode-history.json`.

Query params:

- `interval` (optional): `1h` (default), `6h`, `24h` – controls rolling window size.
- `points` (optional): number of samples to return (default 48, max 168).

Response:

```json
{
  "version": "2025.12.24",
  "generatedAt": "2025-12-24T10:05:00Z",
  "data": {
    "interval": "6h",
    "points": [
      { "timestamp": "2025-12-23T12:00:00Z", "totalNodes": 420, "healthy": 315, "critical": 38, "avgUsagePercent": 46.2 },
      { "timestamp": "2025-12-23T18:00:00Z", "totalNodes": 418, "healthy": 312, "critical": 40, "avgUsagePercent": 46.5 }
    ]
  }
}
```

Implementation notes:

- Use moving average within the chosen interval bucket.
- Ensure the most recent point aligns with the last snapshot entry.

### `GET /api/export/nodes`

Optional deeper feed for teams who need node-level data.

Query params:

- `status`: `healthy|warning|critical|all` (default `all`).
- `limit`: max records (default 50, max 500).
- `cursor`: pagination token (opaque string derived from last `pubkey`).

Response:

```json
{
  "version": "2025.12.24",
  "generatedAt": "2025-12-24T10:05:00Z",
  "data": {
    "nodes": [
      {
        "pubkey": "7B4J...",
        "status": "healthy",
        "uptimeHours": 240,
        "storageUsagePercent": 32.4,
        "isPublic": true,
        "lastSeen": "2025-12-24T09:59:00Z"
      }
    ],
    "nextCursor": "7B4J..."
  }
}
```

Implementation notes:

- Pull from the cached snapshot to avoid hitting seeds repeatedly.
- Pagination is best-effort and resets whenever the snapshot refreshes.
- Consider gating this endpoint behind `X-Atlas-Token` if data volume becomes sensitive.

## Embeddable Widgets

- Widgets live under `/embed/*` (e.g., `/embed/summary`, `/embed/history`).
- They server-render cards using the same API responses to ensure consistency.
- Each page posts its height to `window.parent` for automatic iframe resizing.
- A `<script>` helper snippet can inject `<iframe>` + resize listener for third-party sites.

## Next Steps

1. Implement `/api/export/summary` and `/api/export/history` according to this contract.
2. Evaluate whether the node feed should ship in v1 or remain undocumented until demand is confirmed.
3. Build `/embed/summary` + `/embed/history` pages that consume the new APIs.
4. Update README with usage instructions and security considerations.
