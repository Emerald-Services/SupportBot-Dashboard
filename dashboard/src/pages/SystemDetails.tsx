import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import {
  api,
  formatUptime,
  type GuildHealth,
  type GuildHealthStatus,
} from "@/api/client";
import { useBotStats } from "@/context/BotStatsContext";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { plugins } from "@/lib/plugins";
import {
  getPluginModuleMeta,
  STATUS_BADGE,
} from "@/lib/module-status-labels";

import { useRealtimeStream, type StreamMetrics } from "@/hooks/useRealtimeStream";
import { Badge } from "@/components/ui/badge";

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`text-sm font-medium text-foreground ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

const GUILD_STATUS_LABEL: Record<GuildHealthStatus, string> = {
  ok: "Healthy",
  missing_config: "Guild ID not set",
  not_in_guild: "Not in configured server",
  extra_guilds: "Extra servers joined",
  offline: "Bot offline",
};

function guildStatusClass(status: GuildHealthStatus) {
  if (status === "ok") return "text-emerald-500";
  if (status === "offline") return "text-destructive";
  return "text-amber-500";
}

export default function SystemDetails() {
  const { stats, loading, error, refresh } = useBotStats();
  const [guildHealth, setGuildHealth] = useState<GuildHealth | null>(null);
  const [apiHealth, setApiHealth] = useState<{
    dashboard: boolean;
    botReady: boolean;
    oauthEnabled?: boolean;
    setupComplete?: boolean;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<StreamMetrics | null>(null);

  const { connected } = useRealtimeStream({
    onMetrics: (metrics) => {
      setLiveMetrics(metrics);
    },
  });

  const loadExtra = useCallback(async () => {
    const [guildRes, healthRes] = await Promise.all([
      api.getGuildStatus().catch(() => null),
      api.health().catch(() => null),
    ]);
    if (guildRes?.data) setGuildHealth(guildRes.data);
    if (healthRes?.success && healthRes.data) {
      setApiHealth({
        dashboard: healthRes.data.dashboard,
        botReady: healthRes.data.botReady,
        oauthEnabled: healthRes.data.oauthEnabled,
        setupComplete: (healthRes.data as { setupComplete?: boolean }).setupComplete,
      });
    }
  }, []);

  useEffect(() => {
    void loadExtra();
  }, [loadExtra]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadExtra()]);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Could not load system details."}</AlertDescription>
      </Alert>
    );
  }

  const pingGood = stats.bot.ping < 200;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground">
            <Link to="/">
              <Icon icon={ArrowLeft01Icon} size={16} className="mr-1.5" />
              Back to dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System details</h1>
            <p className="text-muted-foreground">
              Live bot, host, and dashboard status — refreshed every 30 seconds.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
        >
          <Icon icon={RefreshIcon} size={16} className="mr-2" />
          {refreshing ? "Refreshing…" : "Refresh now"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Discord bot</CardTitle>
            <CardDescription>Connection and identity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={stats.bot.avatar} alt={stats.bot.username} />
                <AvatarFallback>SB</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{stats.bot.username}</p>
                <p className="font-mono text-xs text-muted-foreground">{stats.bot.id}</p>
              </div>
            </div>
            <dl>
              <DetailRow label="Version" value={`v${stats.bot.version}`} mono />
              <DetailRow
                label="Gateway latency"
                value={
                  <span className={pingGood ? "text-emerald-500" : "text-amber-500"}>
                    {stats.bot.ping} ms
                  </span>
                }
              />
              <DetailRow
                label="Process uptime"
                value={formatUptime(stats.bot.uptime)}
              />
              <DetailRow
                label="Connected servers"
                value={stats.servers.toLocaleString()}
              />
              <DetailRow
                label="Members tracked"
                value={stats.users.toLocaleString()}
              />
              {stats.bot.inviteUrl ? (
                <DetailRow
                  label="Invite link"
                  value={
                    <a
                      href={stats.bot.inviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open in Discord
                    </a>
                  }
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Host machine</CardTitle>
              <CardDescription>Server resources running this instance</CardDescription>
            </div>
            <Badge variant={connected ? "default" : "outline"} className="text-xs">
              <span
                className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-500 animate-pulse" : "bg-muted"
                }`}
              />
              {connected ? "Live Stream" : "Polling"}
            </Badge>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow
                label="Memory used"
                value={
                  liveMetrics
                    ? `${(liveMetrics.ram_used_mb / 1024).toFixed(2)} GB / ${(
                        liveMetrics.ram_total_mb / 1024
                      ).toFixed(2)} GB`
                    : `${stats.hosting.ram_used} / ${stats.hosting.ram_total}`
                }
              />
              <DetailRow
                label="Memory usage"
                value={
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        (liveMetrics ? liveMetrics.ram_percent : stats.hosting.ram_percent) > 85
                          ? "text-amber-500 font-bold"
                          : "text-foreground font-medium"
                      }
                    >
                      {liveMetrics ? liveMetrics.ram_percent : stats.hosting.ram_percent}%
                    </span>
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${
                            liveMetrics ? liveMetrics.ram_percent : stats.hosting.ram_percent
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                }
              />
              <DetailRow
                label="CPU load (1 min avg)"
                value={liveMetrics ? String(liveMetrics.cpu_load) : stats.hosting.cpu_load}
                mono
              />
              <DetailRow label="Host uptime" value={stats.hosting.uptime} />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Tickets</CardTitle>
            <CardDescription>Database snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="Total tickets" value={stats.tickets.total} />
              <DetailRow
                label="Open"
                value={
                  <span className="text-primary">{stats.tickets.open}</span>
                }
              />
              <DetailRow label="Closed" value={stats.tickets.closed} />
              <DetailRow
                label="Transcripts"
                value={
                  <Link
                    to="/transcripts"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Browse archive
                  </Link>
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Guild health</CardTitle>
            <CardDescription>Configured server and membership</CardDescription>
          </CardHeader>
          <CardContent>
            {guildHealth ? (
              <dl>
                <DetailRow
                  label="Status"
                  value={
                    <span className={guildStatusClass(guildHealth.status)}>
                      {GUILD_STATUS_LABEL[guildHealth.status]}
                    </span>
                  }
                />
                <DetailRow
                  label="Configured guild ID"
                  value={guildHealth.configuredGuildId || "Not set"}
                  mono
                />
                {guildHealth.configuredGuild ? (
                  <DetailRow
                    label="Configured server"
                    value={`${guildHealth.configuredGuild.name} (${guildHealth.configuredGuild.memberCount?.toLocaleString() ?? "?"} members)`}
                  />
                ) : null}
                {guildHealth.message ? (
                  <div className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                    {guildHealth.message}
                  </div>
                ) : null}
                {guildHealth.extraGuilds.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Extra servers
                    </p>
                    <ul className="space-y-1 text-sm">
                      {guildHealth.extraGuilds.map((g) => (
                        <li key={g.id} className="font-mono text-xs">
                          {g.name} · {g.id}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </dl>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Dashboard services</CardTitle>
          <CardDescription>API and authentication</CardDescription>
        </CardHeader>
        <CardContent>
          {apiHealth ? (
            <dl className="max-w-xl">
              <DetailRow
                label="Dashboard UI"
                value={apiHealth.dashboard ? "Available" : "Missing build"}
              />
              <DetailRow
                label="Bot connection"
                value={apiHealth.botReady ? "Online" : "Starting or offline"}
              />
              <DetailRow
                label="Discord OAuth"
                value={apiHealth.oauthEnabled ? "Configured" : "Not configured"}
              />
              <DetailRow
                label="Initial setup"
                value={apiHealth.setupComplete ? "Complete" : "Incomplete"}
              />
              <DetailRow
                label="Software updates"
                value={
                  <Link
                    to="/settings"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open settings
                  </Link>
                }
              />
              <DetailRow
                label="Logs"
                value={
                  <Link
                    to="/logs"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    View log files
                  </Link>
                }
              />
            </dl>
          ) : (
            <Skeleton className="h-32 w-full max-w-xl" />
          )}
        </CardContent>
      </Card>

      {stats.modules ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Module setup status</CardTitle>
            <CardDescription>Which features are configured and active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {plugins.map((plugin) => {
                const meta = getPluginModuleMeta(plugin.id, stats.modules);
                return (
                  <Link
                    key={plugin.id}
                    to={plugin.href}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{plugin.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {meta.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {STATUS_BADGE[meta.status]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
