"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { ArrowUpDown, Check, Copy, Download, Filter, Info, Link2, PenSquare, Plus, X } from "lucide-react";
import type { PNode } from "@/types/pnode";
import { abbreviateKey, formatDuration, formatPercent, formatRelativeTimeFromSeconds } from "@/lib/format";
import { PNodeDrawer } from "./PNodeDrawer";

interface PNodeTableProps {
  nodes: PNode[];
  lastUpdated: string;
  shareQuery?: Record<string, string | undefined>;
}

type SortKey = "health" | "uptime" | "usage" | "lastSeen";
type StatusFilterOption = PNode["status"];
type ExposureFilter = "all" | "public" | "private";

const STATUS_OPTIONS: StatusFilterOption[] = ["healthy", "warning", "critical"];
const STORAGE_KEY = "pnodes:directoryState";
const SAVED_VIEWS_KEY = "pnodes:directorySavedViews";
const MAX_SAVED_VIEWS = 8;
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PERSISTED_STATE: ExplorerPersistedState = {
  search: "",
  statuses: [...STATUS_OPTIONS],
  exposure: "all",
  versions: [],
  minUsage: "",
  maxUsage: "",
  sortKey: "health",
  sortDir: "desc",
  pageSize: PAGE_SIZE_OPTIONS[0],
  page: 1,
};

interface ExplorerPersistedState {
  search: string;
  statuses: StatusFilterOption[];
  exposure: ExposureFilter;
  versions: string[];
  minUsage: string;
  maxUsage: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  pageSize: number;
  page: number;
}

interface SavedExplorerView {
  id: string;
  name: string;
  createdAt: number;
  state: ExplorerPersistedState;
}

interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

export function PNodeTable({ nodes, lastUpdated, shareQuery }: PNodeTableProps) {
  const [search, setSearch] = useState(DEFAULT_PERSISTED_STATE.search);
  const [statusFilters, setStatusFilters] = useState<StatusFilterOption[]>(DEFAULT_PERSISTED_STATE.statuses);
  const [exposureFilter, setExposureFilter] = useState<ExposureFilter>(DEFAULT_PERSISTED_STATE.exposure);
  const [selectedVersions, setSelectedVersions] = useState<string[]>(DEFAULT_PERSISTED_STATE.versions);
  const [minUsage, setMinUsage] = useState(DEFAULT_PERSISTED_STATE.minUsage);
  const [maxUsage, setMaxUsage] = useState(DEFAULT_PERSISTED_STATE.maxUsage);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_PERSISTED_STATE.sortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(DEFAULT_PERSISTED_STATE.sortDir);
  const [selectedNode, setSelectedNode] = useState<PNode | null>(null);
  const [page, setPage] = useState(DEFAULT_PERSISTED_STATE.page);
  const [pageSize, setPageSize] = useState(DEFAULT_PERSISTED_STATE.pageSize);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedExplorerView[]>([]);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  const snapshotExplorerState = useCallback((): ExplorerPersistedState => ({
    search,
    statuses: Array.from(new Set(statusFilters)),
    exposure: exposureFilter,
    versions: Array.from(new Set(selectedVersions)),
    minUsage,
    maxUsage,
    sortKey,
    sortDir,
    pageSize,
    page,
  }), [search, statusFilters, exposureFilter, selectedVersions, minUsage, maxUsage, sortKey, sortDir, pageSize, page]);

  useEffect(() => {
    if (typeof window === "undefined" || hydratedRef.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    let persisted = normalizeExplorerState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ExplorerPersistedState>;
        persisted = normalizeExplorerState(parsed);
      }
    } catch (error) {
      console.warn("Unable to load persisted explorer state", error);
    }

    const queryOverrides: Partial<ExplorerPersistedState> = {};
    const queryStatuses = params.get("status");
    if (queryStatuses) {
      queryOverrides.statuses = parseStatusList(queryStatuses.split(","));
    }
    const querySearch = params.get("q");
    if (querySearch) {
      queryOverrides.search = querySearch;
    }
    const queryExposure = params.get("exposure");
    if (queryExposure === "public" || queryExposure === "private" || queryExposure === "all") {
      queryOverrides.exposure = queryExposure;
    }
    const queryVersions = params.get("versions");
    if (queryVersions) {
      queryOverrides.versions = queryVersions.split(",").filter(Boolean);
    }
    const queryMin = params.get("minUsage");
    if (queryMin !== null) {
      queryOverrides.minUsage = queryMin;
    }
    const queryMax = params.get("maxUsage");
    if (queryMax !== null) {
      queryOverrides.maxUsage = queryMax;
    }
    const querySort = params.get("sort");
    if (querySort && ["health", "uptime", "usage", "lastSeen"].includes(querySort)) {
      queryOverrides.sortKey = querySort as SortKey;
    }
    const queryOrder = params.get("order");
    if (queryOrder === "asc" || queryOrder === "desc") {
      queryOverrides.sortDir = queryOrder;
    }
    const queryPageSize = params.get("pageSize");
    if (queryPageSize && PAGE_SIZE_OPTIONS.includes(Number(queryPageSize))) {
      queryOverrides.pageSize = Number(queryPageSize);
    }
    const queryPage = params.get("page");
    if (queryPage) {
      const parsedPage = Number(queryPage);
      if (Number.isFinite(parsedPage) && parsedPage > 0) {
        queryOverrides.page = parsedPage;
      }
    }

    persisted = normalizeExplorerState({ ...persisted, ...queryOverrides });

    let savedViewPayload: SavedExplorerView[] | undefined;
    try {
      const rawViews = window.localStorage.getItem(SAVED_VIEWS_KEY);
      if (rawViews) {
        const parsedViews = JSON.parse(rawViews);
        if (Array.isArray(parsedViews)) {
          savedViewPayload = parsedViews
            .map((view) => normalizeSavedView(view))
            .filter((view): view is SavedExplorerView => Boolean(view));
        }
      }
    } catch (error) {
      console.warn("Unable to load saved explorer views", error);
    }

    startTransition(() => {
      setSearch(persisted.search);
      setStatusFilters(persisted.statuses);
      setExposureFilter(persisted.exposure);
      setSelectedVersions(persisted.versions);
      setMinUsage(persisted.minUsage);
      setMaxUsage(persisted.maxUsage);
      setSortKey(persisted.sortKey);
      setSortDir(persisted.sortDir);
      setPageSize(persisted.pageSize);
      setPage(persisted.page);
      if (savedViewPayload !== undefined) {
        setSavedViews(savedViewPayload);
      }
    });

    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  const versions = useMemo(() => Array.from(new Set(nodes.map((node) => node.version))).sort(), [nodes]);

  const shareQueryEntries = useMemo(() => {
    if (!shareQuery) return [] as Array<[string, string]>;
    return Object.entries(shareQuery).filter(([, value]) => typeof value === "string" && value.length) as Array<[string, string]>;
  }, [shareQuery]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) {
      return;
    }
    const state = snapshotExplorerState();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to persist explorer state", error);
    }

    const params = new URLSearchParams();
    if (state.search.trim()) params.set("q", state.search.trim());
    if (state.statuses.length && state.statuses.length !== STATUS_OPTIONS.length) {
      params.set("status", state.statuses.join(","));
    }
    if (state.exposure !== "all") params.set("exposure", state.exposure);
    if (state.versions.length) params.set("versions", state.versions.join(","));
    if (state.minUsage) params.set("minUsage", state.minUsage);
    if (state.maxUsage) params.set("maxUsage", state.maxUsage);
    if (state.sortKey !== DEFAULT_PERSISTED_STATE.sortKey) params.set("sort", state.sortKey);
    if (state.sortDir !== DEFAULT_PERSISTED_STATE.sortDir) params.set("order", state.sortDir);
    if (state.pageSize !== DEFAULT_PERSISTED_STATE.pageSize) params.set("pageSize", String(state.pageSize));
    if (state.page > 1) params.set("page", String(state.page));

    shareQueryEntries.forEach(([key, value]) => params.set(key, value));

    const query = params.toString();
    const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [snapshotExplorerState, shareQueryEntries]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydratedRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
    } catch (error) {
      console.warn("Unable to persist saved explorer views", error);
    }
  }, [savedViews]);

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const resetStatuses = () => {
    setStatusFilters([...STATUS_OPTIONS]);
    setPage(1);
  };

  const clearExposureFilter = () => {
    setExposureFilter("all");
    setPage(1);
  };

  const clearVersions = () => {
    setSelectedVersions([]);
    setPage(1);
  };

  const clearMinUsage = () => {
    setMinUsage("");
    setPage(1);
  };

  const clearMaxUsage = () => {
    setMaxUsage("");
    setPage(1);
  };

  const activeFilterChips: ActiveFilterChip[] = [];
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    activeFilterChips.push({
      key: "search",
      label: `Search: "${truncateLabel(trimmedSearch)}"`,
      onClear: handleClearSearch,
    });
  }
  if (statusFilters.length && statusFilters.length !== STATUS_OPTIONS.length) {
    activeFilterChips.push({
      key: "statuses",
      label: `Status: ${formatFilterList(statusFilters.map(capitalizeWord))}`,
      onClear: resetStatuses,
    });
  }
  if (exposureFilter !== "all") {
    activeFilterChips.push({
      key: "exposure",
      label: `Exposure: ${capitalizeWord(exposureFilter)}`,
      onClear: clearExposureFilter,
    });
  }
  if (selectedVersions.length) {
    activeFilterChips.push({
      key: "versions",
      label: `Versions: ${formatFilterList(selectedVersions)}`,
      onClear: clearVersions,
    });
  }
  if (minUsage.trim()) {
    activeFilterChips.push({
      key: "min-usage",
      label: `Min usage ≥ ${minUsage}%`,
      onClear: clearMinUsage,
    });
  }
  if (maxUsage.trim()) {
    activeFilterChips.push({
      key: "max-usage",
      label: `Max usage ≤ ${maxUsage}%`,
      onClear: clearMaxUsage,
    });
  }

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    const minUsageValue = parsePercentInput(minUsage);
    const maxUsageValue = parsePercentInput(maxUsage);
    const selectedStatusSet = new Set(statusFilters);
    const selectedVersionSet = new Set(selectedVersions);

    return nodes
      .filter((node) => {
        if (statusFilters.length && !selectedStatusSet.has(node.status)) return false;
        if (exposureFilter === "public" && !node.isPublic) return false;
        if (exposureFilter === "private" && node.isPublic) return false;
        if (selectedVersions.length && !selectedVersionSet.has(node.version)) return false;
        if (minUsageValue !== null && node.storageUsagePercent < minUsageValue) return false;
        if (maxUsageValue !== null && node.storageUsagePercent > maxUsageValue) return false;
        if (!lowered) return true;
        return (
          node.pubkey.toLowerCase().includes(lowered) ||
          node.address?.toLowerCase().includes(lowered) ||
          node.ip?.includes(lowered)
        );
      })
      .sort((a, b) => {
        const direction = sortDir === "asc" ? 1 : -1;
        switch (sortKey) {
          case "uptime":
            return (a.uptimeSeconds - b.uptimeSeconds) * direction;
          case "usage":
            return (a.storageUsagePercent - b.storageUsagePercent) * direction;
          case "lastSeen":
            return (a.lastSeenSeconds - b.lastSeenSeconds) * direction;
          case "health":
          default:
            return (a.healthScore - b.healthScore) * direction;
        }
      });
  }, [nodes, search, statusFilters, exposureFilter, selectedVersions, minUsage, maxUsage, sortDir, sortKey]);

  const totalRows = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedNodes = filtered.slice(pageStart, pageStart + pageSize);
  const showingFrom = totalRows === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + pageSize, totalRows);
  const canPrev = currentPage > 1;
  const canNext = currentPage < pageCount;

  const handleCopy = async (value: string, id: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Unable to copy value", error);
    }
  };

  const handleCopyClick = (event: MouseEvent, value: string, id: string) => {
    event.stopPropagation();
    handleCopy(value, id);
  };

  const toggleStatus = (value: StatusFilterOption) => {
    setStatusFilters((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
    setPage(1);
  };

  const toggleVersion = (version: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(version)) {
        return prev.filter((item) => item !== version);
      }
      return [...prev, version];
    });
    setPage(1);
  };

  const handleUsageChange = (type: "min" | "max", value: string) => {
    if (type === "min") {
      setMinUsage(value);
    } else {
      setMaxUsage(value);
    }
    setPage(1);
  };

  const handleShareLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
      shareTimeoutRef.current = setTimeout(() => setShareCopied(false), 2000);
    } catch (error) {
      console.error("Unable to copy share link", error);
    }
  };


  const resetAllFilters = () => {
    setSearch("");
    setStatusFilters([...STATUS_OPTIONS]);
    setExposureFilter("all");
    setSelectedVersions([]);
    setMinUsage("");
    setMaxUsage("");
    setPage(1);
  };

  const handleSaveView = () => {
    const trimmed = saveViewName.trim();
    if (!trimmed) return;
    const view: SavedExplorerView = {
      id: createSavedViewId(),
      name: trimmed,
      createdAt: Date.now(),
      state: snapshotExplorerState(),
    };
    setSavedViews((prev) => {
      const withoutDuplicate = prev.filter((item) => item.name.toLowerCase() !== trimmed.toLowerCase());
      return [view, ...withoutDuplicate].slice(0, MAX_SAVED_VIEWS);
    });
    setSaveViewName("");
  };

  const applySavedView = (viewId: string) => {
    const target = savedViews.find((view) => view.id === viewId);
    if (!target) return;
    const next = normalizeExplorerState(target.state);
    setSearch(next.search);
    setStatusFilters(next.statuses);
    setExposureFilter(next.exposure);
    setSelectedVersions(next.versions);
    setMinUsage(next.minUsage);
    setMaxUsage(next.maxUsage);
    setSortKey(next.sortKey);
    setSortDir(next.sortDir);
    setPageSize(next.pageSize);
    setPage(next.page);
  };

  const removeSavedView = (viewId: string) => {
    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
  };

  const renameSavedView = (viewId: string) => {
    if (typeof window === "undefined") return;
    const target = savedViews.find((view) => view.id === viewId);
    if (!target) return;
    const nextName = window.prompt("Rename saved view", target.name);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === target.name) return;
    setSavedViews((prev) => {
      const lower = trimmed.toLowerCase();
      const deduped = prev.filter((view) => view.id === viewId || view.name.toLowerCase() !== lower);
      return deduped.map((view) => (view.id === viewId ? { ...view, name: trimmed } : view));
    });
  };

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const openDrawer = (node: PNode) => {
    setSelectedNode(node);
  };

  const closeDrawer = () => setSelectedNode(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xandeum-pnodes-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = ["pubkey", "address", "version", "isPublic", "health", "uptime_seconds", "usage_percent", "last_seen_seconds"];
    const rows = filtered.map((node) => [
      node.pubkey,
      node.address ?? "",
      node.version,
      node.isPublic ? "public" : "private",
      node.healthScore,
      node.uptimeSeconds,
      node.storageUsagePercent.toFixed(6),
      node.lastSeenSeconds,
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xandeum-pnodes-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 shadow-2xl shadow-black/30">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Explorer</p>
          <h3 className="text-2xl font-semibold text-white">pNode Directory</h3>
          <p className="text-xs text-slate-500">Last synced {new Date(lastUpdated).toLocaleTimeString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/30">
            <Download className="h-4 w-4" /> JSON
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/30">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </header>

      <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
            <Filter className="h-4 w-4 text-slate-500" />
            <input
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Search pubkey or address"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
            value={exposureFilter}
            onChange={(event) => {
              setExposureFilter(event.target.value as ExposureFilter);
              setPage(1);
            }}
          >
            <option value="all">Exposure: All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={minUsage}
            onChange={(event) => handleUsageChange("min", event.target.value)}
            placeholder="Min usage %"
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={maxUsage}
            onChange={(event) => handleUsageChange("max", event.target.value)}
            placeholder="Max usage %"
            className="rounded-2xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
          />
        </div>

        {activeFilterChips.length ? (
          <div className="space-y-2 rounded-2xl border border-white/5 bg-slate-950/30 px-4 py-3 text-xs text-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Active filters</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <span key={chip.key} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[13px]">
                    {chip.label}
                    <button type="button" onClick={chip.onClear} className="text-slate-400 transition hover:text-white" aria-label={`Remove ${chip.label}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              Reset all filters
            </button>
          </div>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</span>
            <button
              type="button"
              onClick={resetStatuses}
              className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-white"
            >
              Reset
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const active = statusFilters.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleStatus(option)}
                  className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${active ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-slate-300 hover:border-white/30"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Versions</span>
            <button
              type="button"
              onClick={clearVersions}
              className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          {versions.length === 0 ? (
            <p className="text-sm text-slate-500">No versions reported yet</p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {versions.map((version) => {
                  const checked = selectedVersions.includes(version);
                  return (
                    <label
                      key={version}
                      className={`cursor-pointer rounded-2xl border px-3 py-2 text-sm text-slate-200 transition ${checked ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 hover:border-white/30"}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleVersion(version)}
                      />
                      <span>{version}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-950/30 px-4 py-3 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
          <p>
            {totalRows === 0 ? "No nodes match the current filters" : `Showing ${showingFrom}-${showingTo} of ${totalRows} nodes`}
          </p>
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Rows per page
            <select
              className="rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-100"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/30 p-4 text-sm text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Saved views & sharing</span>
              <InlineInfoTooltip text="Bookmark frequent explorer filters and share deep links that reopen to the exact same state." />
            </div>
            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 hover:border-white/30"
            >
              <Link2 className={`h-4 w-4 ${shareCopied ? "text-emerald-300" : "text-slate-400"}`} />
              {shareCopied ? "Link copied" : "Share view"}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Name this view"
              value={saveViewName}
              onChange={(event) => setSaveViewName(event.target.value)}
            />
            <button
              type="button"
              onClick={handleSaveView}
              disabled={!saveViewName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm uppercase tracking-[0.2em] text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Save
            </button>
          </div>
          {savedViews.length ? (
            <div className="flex flex-wrap gap-2">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => applySavedView(view.id)}
                    className="text-slate-100 hover:text-white"
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => renameSavedView(view.id)}
                    aria-label={`Rename ${view.name}`}
                    className="text-slate-500 transition hover:text-slate-200"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedView(view.id)}
                    aria-label={`Delete ${view.name}`}
                    className="text-slate-500 transition hover:text-rose-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">No saved views yet</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[2.2fr_repeat(6,minmax(120px,1fr))] gap-4 border-b border-white/5 pb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Node</span>
            <SortButton label="Health" active={sortKey === "health"} onSort={() => handleSortChange("health")} />
            <span>Exposure</span>
            <SortButton label="Version" />
            <SortButton label="Storage" active={sortKey === "usage"} onSort={() => handleSortChange("usage")} />
            <SortButton label="Uptime" active={sortKey === "uptime"} onSort={() => handleSortChange("uptime")} />
            <SortButton label="Last Seen" active={sortKey === "lastSeen"} onSort={() => handleSortChange("lastSeen")} />
          </div>
          <div className="divide-y divide-white/5">
            {paginatedNodes.map((node) => (
              <article
                key={node.pubkey}
                role="button"
                tabIndex={0}
                onClick={() => openDrawer(node)}
                onKeyUp={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openDrawer(node);
                  }
                }}
                className="grid cursor-pointer grid-cols-[2.2fr_repeat(6,minmax(120px,1fr))] items-center gap-4 py-4 text-sm text-slate-100 transition hover:bg-white/5 focus:outline focus:outline-emerald-400/40"
              >
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={(event) => handleCopyClick(event, node.pubkey, `pubkey-${node.pubkey}`)}
                    className="group flex items-center gap-2 text-left focus:outline-none"
                    aria-label="Copy public key"
                  >
                    <span className="font-mono text-base text-white">{abbreviateKey(node.pubkey, 6)}</span>
                    <span className="text-xs text-slate-500">
                      {copiedId === `pubkey-${node.pubkey}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-white" />
                      )}
                    </span>
                  </button>
                  {node.address ? (
                    <button
                      type="button"
                      onClick={(event) => handleCopyClick(event, node.address ?? "", `address-${node.pubkey}`)}
                      className="group inline-flex items-center gap-2 text-left text-xs text-slate-500 focus:outline-none"
                      aria-label="Copy node address"
                    >
                      <span>{node.address}</span>
                      {copiedId === `address-${node.pubkey}` ? (
                        <Check className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-500 transition group-hover:text-white" />
                      )}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">private</p>
                  )}
                </div>
                <HealthBadge score={node.healthScore} status={node.status} />
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{node.isPublic ? "Public" : "Private"}</span>
                <span>{node.version}</span>
                <div>
                  <p>{formatPercent(node.storageUsagePercent, 3)}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${node.status === "critical" ? "bg-rose-500" : node.status === "warning" ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(node.storageUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <span>{formatDuration(node.uptimeSeconds)}</span>
                <span>{formatRelativeTimeFromSeconds(node.lastSeenSeconds)}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-white/5 pt-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>
          Page {currentPage} of {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(currentPage - 1, 1))}
            disabled={!canPrev}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.min(currentPage + 1, pageCount))}
            disabled={!canNext}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      <PNodeDrawer node={selectedNode} onClose={closeDrawer} />
    </section>
  );
}

function SortButton({ label, active, onSort }: { label: string; active?: boolean; onSort?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={`inline-flex items-center gap-1 text-left ${active ? "text-white" : "text-slate-400"}`}
    >
      {label}
      {onSort ? <ArrowUpDown className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

function HealthBadge({ score, status }: { score: number; status: PNode["status"] }) {
  const palette =
    status === "critical"
      ? "bg-rose-500/10 text-rose-200"
      : status === "warning"
        ? "bg-amber-500/10 text-amber-200"
        : "bg-emerald-500/10 text-emerald-200";

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold ${palette}`}>
      {score}
    </span>
  );
}

function InlineInfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="rounded-full border border-transparent p-1 text-slate-500 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        aria-label={text}
      >
        <Info className="h-3 w-3" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-60 -translate-x-1/2 -translate-y-[140%] rounded-2xl border border-white/10 bg-slate-950/95 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-100 shadow-2xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

function parseStatusList(values: string[]): StatusFilterOption[] {
  const sanitized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is StatusFilterOption => STATUS_OPTIONS.includes(value as StatusFilterOption));
  return sanitized.length ? Array.from(new Set(sanitized)) : [...STATUS_OPTIONS];
}

function parsePercentInput(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, 0), 100);
}

function normalizeExplorerState(partial?: Partial<ExplorerPersistedState>): ExplorerPersistedState {
  const next: ExplorerPersistedState = { ...DEFAULT_PERSISTED_STATE };
  if (!partial) {
    return next;
  }
  if (typeof partial.search === "string") {
    next.search = partial.search;
  }
  if (Array.isArray(partial.statuses)) {
    next.statuses = parseStatusList(partial.statuses);
  }
  if (partial.exposure === "all" || partial.exposure === "public" || partial.exposure === "private") {
    next.exposure = partial.exposure;
  }
  if (Array.isArray(partial.versions)) {
    next.versions = partial.versions.filter(Boolean);
  }
  if (typeof partial.minUsage === "string") {
    next.minUsage = partial.minUsage;
  }
  if (typeof partial.maxUsage === "string") {
    next.maxUsage = partial.maxUsage;
  }
  if (partial.sortKey && ["health", "uptime", "usage", "lastSeen"].includes(partial.sortKey)) {
    next.sortKey = partial.sortKey as SortKey;
  }
  if (partial.sortDir === "asc" || partial.sortDir === "desc") {
    next.sortDir = partial.sortDir;
  }
  if (typeof partial.pageSize === "number" && PAGE_SIZE_OPTIONS.includes(partial.pageSize)) {
    next.pageSize = partial.pageSize;
  }
  if (typeof partial.page === "number" && partial.page > 0) {
    next.page = Math.floor(partial.page);
  }
  return next;
}

function normalizeSavedView(entry: unknown): SavedExplorerView | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Partial<SavedExplorerView>;
  const name = typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : "Saved view";
  const id = typeof candidate.id === "string" ? candidate.id : createSavedViewId();
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const state = normalizeExplorerState(candidate.state as Partial<ExplorerPersistedState>);
  return { id, name, createdAt, state };
}

function createSavedViewId(): string {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatFilterList(values: string[], limit = 3): string {
  if (values.length <= limit) {
    return values.join(", ");
  }
  const visible = values.slice(0, limit).join(", ");
  return `${visible} +${values.length - limit}`;
}

function truncateLabel(value: string, maxLength = 32): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
