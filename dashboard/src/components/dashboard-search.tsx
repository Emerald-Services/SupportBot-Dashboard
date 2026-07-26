import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  groupSearchResults,
  searchDashboard,
  type SearchItem,
} from "@/lib/search-index";

export function DashboardSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const results = useMemo(() => searchDashboard(query, 14), [query]);
  const groups = useMemo(() => groupSearchResults(results), [results]);
  const showPanel = open && query.trim().length > 0;

  const updatePanelRect = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!showPanel) {
      setPanelRect(null);
      return;
    }
    updatePanelRect();
    window.addEventListener("resize", updatePanelRect);
    window.addEventListener("scroll", updatePanelRect, true);
    return () => {
      window.removeEventListener("resize", updatePanelRect);
      window.removeEventListener("scroll", updatePanelRect, true);
    };
  }, [showPanel, query]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function selectItem(item: SearchItem) {
    navigate(item.href);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-sm", className)}>
      <Icon
        icon={Search01Icon}
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }
        }}
        placeholder="Search modules, configs…"
        className="h-9 border-border bg-secondary/50 pl-9"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="dashboard-search-results"
        aria-autocomplete="list"
      />
      <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>

      {showPanel && panelRect
        ? createPortal(
            <div
              ref={panelRef}
              id="dashboard-search-results"
              className="overflow-hidden rounded-xl border border-border bg-popover shadow-lg shadow-black/20"
              style={{
                position: "fixed",
                top: panelRect.top,
                left: panelRect.left,
                width: panelRect.width,
                zIndex: 9999,
              }}
              role="listbox"
            >
              <Command shouldFilter={false} className="bg-transparent">
            <CommandList className="max-h-[min(360px,50vh)]">
              {results.length === 0 ? (
                <CommandEmpty className="py-8 text-muted-foreground">
                  No results for &ldquo;{query.trim()}&rdquo;
                </CommandEmpty>
              ) : (
                groups.map((group) => (
                  <CommandGroup key={group.category} heading={group.label}>
                    {group.items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => selectItem(item)}
                        className="cursor-pointer gap-3 rounded-lg py-2.5 aria-selected:bg-accent"
                      >
                        {item.icon ? (
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <Icon icon={item.icon} size={16} />
                          </span>
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              )}
            </CommandList>
          </Command>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
