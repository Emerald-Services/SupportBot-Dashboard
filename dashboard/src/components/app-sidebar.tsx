import { useEffect, useState } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  AiBrain01Icon,
  ArrowDown01Icon,
  BotIcon,
  CommandIcon,
  ComputerTerminal01Icon,
  DashboardSquare02Icon,
  File02Icon,
  Message01Icon,
  PlusSignIcon,
  PackageIcon,
  Settings02Icon,
  Shield01Icon,
  Ticket01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { NavLink, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { api, type GuildResources } from "@/api/client";
import { useBotStats } from "@/context/BotStatsContext";
import { useAddonConfigs } from "@/hooks/use-addon-configs";
import {
  addonConfigFileParam,
  addonConfigLabel,
} from "@/lib/addon-config";
import { canViewConfig, hasPermission } from "@/lib/permissions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const mainNav: {
  title: string;
  url: string;
  icon: IconSvgElement;
  end?: boolean;
  permission?: string;
}[] = [];

const sections: {
  label: string;
  items: { title: string; url: string; icon: IconSvgElement; permission?: string; end?: boolean }[];
}[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: DashboardSquare02Icon, end: true, permission: "overview" },
      { title: "Console", url: "/logs", icon: ComputerTerminal01Icon, permission: "logs" },
    ],
  },
  {
    label: "Access & Logs",
    items: [
      { title: "Users", url: "/users", icon: UserMultiple02Icon, permission: "users.view" },
      { title: "Groups", url: "/groups", icon: Shield01Icon, permission: "users.view" },
      { title: "Tickets", url: "/tickets", icon: Ticket01Icon, permission: "overview" },
      { title: "Transcripts", url: "/transcripts", icon: File02Icon, permission: "transcripts" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Bot Settings", url: "/configs?file=supportbot", icon: BotIcon },
      { title: "Ticket Panel", url: "/configs?file=ticket-panel", icon: Ticket01Icon },
      { title: "AI Assistant", url: "/configs?file=supportbot-ai", icon: AiBrain01Icon },
      { title: "Messages", url: "/configs?file=messages", icon: Message01Icon },
      { title: "Staff Roles", url: "/configs?file=supportbot&tab=Roles", icon: UserMultiple02Icon },
      { title: "Commands", url: "/configs?file=commands", icon: CommandIcon },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Addons", url: "/addons", icon: PackageIcon, permission: "settings.view" },
      { title: "Addon Builder", url: "/addons/builder", icon: CommandIcon, permission: "settings.update" },
      { title: "Dashboard Settings", url: "/settings", icon: Settings02Icon, permission: "settings.view" },
    ],
  },
];

function configFileFromUrl(url: string) {
  return new URL(url, "http://x").searchParams.get("file");
}

export function AppSidebar() {
  const { branding } = useBranding();
  const { permissions } = useAuth();
  const { stats } = useBotStats();
  const { files: addonConfigFiles } = useAddonConfigs();
  const [searchParams] = useSearchParams();
  const activeFile = searchParams.get("file");

  const addonSection =
    canViewConfig(permissions, "supportbot") && addonConfigFiles.length > 0
      ? {
          label: "Addons",
          items: addonConfigFiles.map((filename) => ({
            title: addonConfigLabel(filename),
            url: `/configs?file=${addonConfigFileParam(filename)}`,
            icon: PackageIcon,
            end: false,
          })),
        }
      : null;

  const visibleMainNav = mainNav.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  );

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.permission) {
          return hasPermission(permissions, item.permission);
        }
        const file = configFileFromUrl(item.url);
        if (file && item.url.includes("/configs")) {
          return canViewConfig(permissions, file);
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const allSections = addonSection
    ? [...visibleSections, addonSection]
    : visibleSections;

  const [guildResources, setGuildResources] = useState<GuildResources | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getGuildResources()
      .then((res) => {
        if (!cancelled && res.data) {
          setGuildResources(res.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const serverName =
    guildResources?.guildName ||
    (stats ? `${stats.servers} Server${stats.servers === 1 ? "" : "s"}` : "Connected Guild");
  const serverIcon = guildResources?.guildIcon;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-2 px-1">
          {branding.hasFavicon && branding.faviconUrl ? (
            <img
              src={`${branding.faviconUrl}${branding.updatedAt ? `?v=${branding.updatedAt}` : ""}`}
              alt=""
              className="size-7 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <span className="truncate text-lg font-bold tracking-tight">
            {branding.title}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-10 w-full justify-between border-border bg-secondary/40 px-3 font-normal hover:bg-secondary/60"
            >
              <span className="flex items-center gap-2 truncate min-w-0">
                {serverIcon ? (
                  <img
                    src={serverIcon}
                    alt=""
                    className="size-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {serverName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate text-xs font-semibold text-foreground">
                  {serverName}
                </span>
              </span>
              <Icon icon={ArrowDown01Icon} size={14} className="text-muted-foreground shrink-0 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
            <DropdownMenuItem disabled className="text-xs font-medium">
              Connected Guild: {serverName}
            </DropdownMenuItem>
            {stats ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {stats.users.toLocaleString()} members tracked
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(isActive && "bg-sidebar-accent font-medium")
                      }
                    >
                      <Icon icon={item.icon} size={18} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {allSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const file = configFileFromUrl(item.url);
                  const isConfigActive =
                    Boolean(file) &&
                    activeFile === file &&
                    item.url.includes("/configs");
                  return (
                    <SidebarMenuItem key={`${section.label}-${item.title}`}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.end}
                          className={({ isActive }) => cn(
                            (isActive || isConfigActive) && "bg-sidebar-accent font-medium",
                          )}
                        >
                          <Icon icon={item.icon} size={18} />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
