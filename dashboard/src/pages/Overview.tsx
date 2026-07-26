import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckmarkCircle02Icon,
  Ticket01Icon,
} from "@hugeicons/core-free-icons";
import { useBotStats } from "@/context/BotStatsContext";
import { Icon } from "@/components/icon";
import { ActiveModuleCard } from "@/components/overview/active-module-card";
import { DonutChart } from "@/components/overview/donut-chart";
import {
  ModuleStripCard,
  type ModuleStatus,
} from "@/components/overview/module-strip-card";
import { OverviewAside } from "@/components/overview/overview-aside";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { plugins, pluginTabs, type PluginCategory } from "@/lib/plugins";
import {
  getPluginModuleMeta,
  STATUS_BADGE,
} from "@/lib/module-status-labels";

type OverviewTab = PluginCategory | "all" | "open" | "closed";

function OverviewSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 min-w-[280px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="hidden h-[520px] w-80 shrink-0 rounded-2xl xl:block" />
    </div>
  );
}

export default function Overview() {
  const { stats, loading, error } = useBotStats();
  const [tab, setTab] = useState<OverviewTab>("all");

  const ticketPercent = useMemo(() => {
    if (!stats) return 0;
    const total = stats.tickets.total || 0;
    if (total === 0) return 100;
    return Math.round((stats.tickets.closed / total) * 100);
  }, [stats]);

  const filteredPlugins = useMemo(() => {
    if (tab === "open" || tab === "closed") {
      return plugins.filter((p) => p.category === "tickets");
    }
    if (tab === "all") return plugins;
    return plugins.filter((p) => p.category === tab);
  }, [tab]);

  if (loading) return <OverviewSkeleton />;

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "No stats available"}</AlertDescription>
      </Alert>
    );
  }

  const openCount = stats.tickets.open;
  const closedCount = stats.tickets.closed;
  const totalCount = stats.tickets.total;

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        {/* Hero row — mockup top cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden border-border bg-card">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="space-y-3">
                <p className="text-lg font-semibold leading-snug">
                  You have{" "}
                  <span className="text-primary">{openCount}</span> open ticket
                  {openCount === 1 ? "" : "s"}
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Review transcripts or tune your ticket panel so new requests
                  are handled smoothly.
                </p>
                <Button asChild size="sm" className="rounded-lg px-5">
                  <Link to="/transcripts">Review</Link>
                </Button>
              </div>
              <div
                className="relative mx-auto flex size-28 shrink-0 items-end justify-center sm:mx-0 sm:size-32"
                aria-hidden
              >
                <div className="absolute inset-0 rounded-2xl bg-secondary" />
                <span className="relative text-6xl">🎫</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border bg-primary text-primary-foreground">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">
                  Ticket summary
                </p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-white/70" />
                    <span className="text-white/90">{totalCount} total</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-white/70" />
                    <span className="text-white/90">{closedCount} closed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-white/70" />
                    <span className="text-white/90">{openCount} open</span>
                  </li>
                </ul>
              </div>
              <DonutChart percent={ticketPercent} size={120} />
            </CardContent>
          </Card>
        </div>

        {/* Module overview — horizontal strip cards */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold tracking-tight">Module overview</h2>
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as OverviewTab)}
            >
              <TabsList className="h-auto flex-wrap rounded-xl bg-secondary/60 p-1">
                <TabsTrigger
                  value="all"
                  className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="open"
                  className="rounded-lg text-xs data-[state=active]:bg-background"
                >
                  Open
                </TabsTrigger>
                <TabsTrigger
                  value="closed"
                  className="rounded-lg text-xs data-[state=active]:bg-background"
                >
                  Closed
                </TabsTrigger>
                {pluginTabs
                  .filter((t) => t.id !== "all")
                  .map((t) => (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      className="rounded-lg text-xs data-[state=active]:bg-background"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {(tab === "open"
              ? [
                  {
                    id: "open-queue",
                    title: "Open ticket queue",
                    subtitle: `${openCount} waiting`,
                    icon: Ticket01Icon,
                    href: "/tickets",
                    status: "done" as ModuleStatus,
                    meta: "View live tickets",
                  },
                ]
              : tab === "closed"
                ? [
                    {
                      id: "closed-archive",
                      title: "Closed tickets",
                      subtitle: `${closedCount} resolved`,
                      icon: CheckmarkCircle02Icon,
                      href: "/transcripts",
                      status: "done" as ModuleStatus,
                      meta: "Browse archive",
                    },
                  ]
                : filteredPlugins.map((p) => {
                    const meta = getPluginModuleMeta(
                      p.id,
                      stats.modules,
                      p.description,
                    );
                    return {
                      id: p.id,
                      title: p.title,
                      subtitle: meta.subtitle,
                      icon: p.icon,
                      href: p.href,
                      status: meta.status as ModuleStatus,
                      meta:
                        meta.status === "done"
                          ? "View settings"
                          : "Configure",
                    };
                  })
            ).map((item) => (
              <ModuleStripCard
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                href={item.href}
                status={item.status}
                meta={item.meta}
              />
            ))}
          </div>
        </section>

        {/* Active modules grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Active modules</h2>
            <Link
              to="/configs"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plugins.slice(0, 4).map((p) => {
              const meta = getPluginModuleMeta(p.id, stats.modules);
              return (
                <ActiveModuleCard
                  key={p.id}
                  title={p.title}
                  icon={p.icon}
                  href={p.href}
                  badge={STATUS_BADGE[meta.status]}
                  status={meta.status}
                />
              );
            })}
          </div>
        </section>
      </div>

      <OverviewAside stats={stats} />
    </div>
  );
}
