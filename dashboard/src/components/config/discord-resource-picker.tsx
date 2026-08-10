import { useEffect, useMemo, useState } from "react";
import { Search01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { api, type GuildResources } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export type DiscordResourceKind = "channel" | "role" | "category";

interface DiscordResourcePickerProps {
  id: string;
  label: string;
  description?: string;
  kind: DiscordResourceKind;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}

export function DiscordResourcePicker({
  id,
  label,
  description,
  kind,
  value,
  onChange,
  readOnly,
}: DiscordResourcePickerProps) {
  const [resources, setResources] = useState<GuildResources | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGuildResources()
      .then((res) => {
        if (cancelled) return;
        if (res.data) {
          setResources(res.data);
          setLoadError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Could not load server list",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    if (!resources) return [];
    if (kind === "role") return resources.roles;
    if (kind === "category") return resources.categories;
    return resources.channels;
  }, [resources, kind]);

  const current = String(value ?? "");
  const matched = options.find((o) => o.id === current);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) => opt.name.toLowerCase().includes(q) || opt.id.includes(q),
    );
  }, [options, search]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {resources ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={readOnly || loading}
              className="w-full justify-between border-border bg-secondary/30 text-left font-normal h-10 px-3 hover:bg-secondary/50"
            >
              <span className="truncate">
                {matched ? (
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground truncate">{matched.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">{matched.id}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {loading
                      ? "Loading server list…"
                      : `Select ${kind} from ${resources.guildName}…`}
                  </span>
                )}
              </span>
              <Icon icon={UnfoldMoreIcon} size={16} className="shrink-0 opacity-50 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 bg-popover border-border shadow-2xl rounded-xl flex flex-col gap-2 z-50">
            <div className="relative flex items-center">
              <Icon icon={Search01Icon} size={14} className="absolute left-2.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${kind}s by name or ID…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs border-border bg-secondary/20 focus-visible:ring-1"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-56 space-y-1 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  No {kind}s found matching "{search}"
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left",
                      opt.id === current
                        ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                        : "hover:bg-secondary/60 text-foreground"
                    )}
                  >
                    <span className="truncate mr-2 font-medium">{opt.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {opt.id}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}

      <Input
        value={current}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          kind === "role"
            ? "Role ID (ROLE_ID)"
            : kind === "category"
              ? "Category ID"
              : "Channel ID"
        }
        className="border-border bg-secondary/30 font-mono text-xs"
      />

      {loadError ? (
        <p className="text-xs text-amber-500">{loadError}</p>
      ) : null}
      {!loadError && !resources && !loading ? (
        <p className="text-xs text-muted-foreground">
          Set General.GuildId and invite the bot to pick from a list.
        </p>
      ) : null}
    </div>
  );
}
