import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { api, type LogEntry, type LogType } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLogTime } from "@/lib/format-log-time";
import { cn } from "@/lib/utils";
import { useRealtimeStream, type StreamLogEntry } from "@/hooks/useRealtimeStream";

const LOG_FILTERS: { id: LogType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Output", label: "Output" },
  { id: "Warn", label: "Warn" },
  { id: "Error", label: "Error" },
];

const ALL_TYPES: LogType[] = ["Output", "Warn", "Error"];

const TYPE_STYLES: Record<LogType, string> = {
  Output: "text-foreground/90",
  Warn: "text-amber-400",
  Error: "text-rose-400",
};

const TYPE_BADGE: Record<LogType, string> = {
  Output: "bg-muted text-muted-foreground",
  Warn: "bg-amber-500/15 text-amber-400",
  Error: "bg-rose-500/15 text-rose-400",
};

const MAX_LINES = 2000;
const POLL_MS = 2000;

function entryKey(entry: LogEntry, index: number) {
  return `${entry.type}-${entry.timestamp ?? "na"}-${index}-${entry.message.slice(0, 32)}`;
}

function mergeEntries(prev: LogEntry[], batch: LogEntry[], reset: boolean) {
  const base = reset ? [] : prev;
  const seen = new Set(base.map((e, i) => entryKey(e, i)));
  const added: LogEntry[] = [];

  for (let i = 0; i < batch.length; i++) {
    const key = entryKey(batch[i], i);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(batch[i]);
  }

  const merged = [...base, ...added];
  return merged.length > MAX_LINES
    ? merged.slice(merged.length - MAX_LINES)
    : merged;
}

export default function Logs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<LogType | "all">("all");
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(true);
  const [logFiles, setLogFiles] = useState<string>("");

  const cursorRef = useRef<Record<string, number> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const typesForApi = useMemo(
    (): LogType[] => (filter === "all" ? ALL_TYPES : [filter]),
    [filter],
  );

  const handleLogStream = useCallback(
    (log: StreamLogEntry) => {
      if (pausedRef.current) return;
      if (filter !== "all" && log.type !== filter) return;

      setEntries((prev) => {
        const next = [...prev, log];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
      setLive(true);
    },
    [filter]
  );

  useRealtimeStream({
    onLog: handleLogStream,
  });

  const fetchBatch = useCallback(
    async (reset: boolean) => {
      const res = await api.getLogs({
        types: typesForApi,
        cursor: reset ? undefined : cursorRef.current ?? undefined,
        tail: reset ? 500 : 0,
      });

      const batch = res.data?.entries ?? [];
      cursorRef.current = res.data?.cursor ?? {};

      setEntries((prev) => mergeEntries(prev, batch, reset));
      return batch.length;
    },
    [typesForApi],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    cursorRef.current = null;
    try {
      const meta = await api.getLogsMeta();
      const files = meta.data?.files ?? [];
      const active = files
        .filter((f) => f.file)
        .map((f) => `${f.type}: ${f.file}`)
        .join(" · ");
      setLogFiles(active || "No log files yet — output appears when the bot runs.");

      await fetchBatch(true);
      setLive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [fetchBatch]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (paused || loading) return;

    const id = window.setInterval(async () => {
      if (pausedRef.current) return;
      try {
        await fetchBatch(false);
        setLive(true);
        setError("");
      } catch (err) {
        setLive(false);
        setError(err instanceof Error ? err.message : "Live update failed");
      }
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, [paused, loading, fetchBatch]);

  useEffect(() => {
    if (!autoScroll || paused) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, autoScroll, paused]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.message.toLowerCase().includes(q) ||
        (e.timestamp?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, filter, search]);

  return (
    <div className="flex h-[calc(100svh-8rem)] min-h-[480px] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            Live bot output — updates every 2 seconds
          </p>
          {logFiles ? (
            <p className="mt-1 text-xs text-muted-foreground">{logFiles}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              live && !paused
                ? "animate-pulse bg-emerald-500"
                : "bg-muted-foreground",
            )}
          />
          <span className="text-xs text-muted-foreground">
            {paused ? "Paused" : live ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
        <CardHeader className="shrink-0 space-y-4 border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-medium">
              Console
              {!loading ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {filtered.length} line{filtered.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
                <Label htmlFor="auto-scroll" className="text-xs font-normal">
                  Auto-scroll
                </Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaused((p) => !p)}
              >
                <Icon
                  icon={paused ? PlayIcon : PauseIcon}
                  size={16}
                  className="mr-1.5"
                />
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEntries([]);
                  void loadInitial();
                }}
                disabled={loading}
              >
                <Icon icon={RefreshIcon} size={16} className="mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/50 p-1">
              {LOG_FILTERS.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  variant={filter === f.id ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Icon
                icon={Search01Icon}
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Filter lines…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="h-full max-h-[calc(100svh-18rem)] overflow-y-auto bg-[#0d0d12] p-4 font-mono text-[13px] leading-relaxed"
            >
              {filtered.length === 0 ? (
                <p className="text-muted-foreground">
                  No log lines yet. Start the bot and activity will appear here
                  (also written to the Logs folder on disk).
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((entry, i) => (
                    <li
                      key={entryKey(entry, i)}
                      className="flex gap-2 rounded px-1 py-0.5 hover:bg-white/[0.03]"
                    >
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatLogTime(entry.timestamp)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0 text-[10px] font-semibold uppercase",
                          TYPE_BADGE[entry.type],
                        )}
                      >
                        {entry.type}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 whitespace-pre-wrap break-words",
                          TYPE_STYLES[entry.type],
                        )}
                      >
                        {entry.message || " "}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
