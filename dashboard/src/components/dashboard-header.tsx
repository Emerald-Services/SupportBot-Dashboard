import {
  ArrowDown01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { DashboardSearch } from "@/components/dashboard-search";
import { useBotStats } from "@/context/BotStatsContext";
import { Icon } from "@/components/icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayDiscordName, useAuth } from "@/context/AuthContext";

export function DashboardHeader() {
  const { stats } = useBotStats();
  const {
    user,
    logout,
    availableGroups,
    isImpersonating,
    impersonatedGroup,
    impersonateGroup,
    stopImpersonation,
    hasPermission,
  } = useAuth();
  const canImpersonate = user?.isOwner || hasPermission("users.manage");

  const botName = stats?.bot.username ?? "SupportBot";
  const accountName = user ? displayDiscordName(user) : botName;
  const accountAvatar = user?.avatar ?? stats?.bot.avatar;
  const inviteUrl = stats?.bot.inviteUrl;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      {/* Impersonation Preview Mode Banner */}
      {isImpersonating && impersonatedGroup && (
        <div className="relative z-50 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide uppercase border border-amber-500/30">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              Preview Mode
            </span>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span className="text-muted-foreground">Viewing dashboard as:</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary/80 border border-border/80">
                <span
                  className="size-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: impersonatedGroup.color || "#10B981" }}
                />
                <span className="font-semibold text-xs text-foreground">
                  {impersonatedGroup.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {availableGroups.length > 1 && (
              <Select
                value={impersonatedGroup.id}
                onValueChange={(val) => impersonateGroup(val)}
              >
                <SelectTrigger className="h-7 text-xs bg-background/80 border-amber-500/30 text-amber-200 focus:ring-amber-500/40 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: g.color || "#10B981" }}
                        />
                        <span>{g.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs bg-card border-amber-500/40 text-amber-300 hover:bg-amber-500/20 hover:text-white transition-all shadow-sm"
              onClick={stopImpersonation}
            >
              Exit Preview Mode
            </Button>
          </div>
        </div>
      )}

      <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground md:hidden" />

        <p className="hidden shrink-0 text-sm font-medium text-muted-foreground lg:block">
          {dateLabel}
        </p>

        <DashboardSearch className="min-w-0 flex-1" />

        <div className="ml-auto flex items-center gap-2">
          {inviteUrl ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-9 text-muted-foreground sm:inline-flex"
              asChild
            >
              <a
                href={inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Invite bot to a server"
                title="Invite bot to a server"
              >
                <Icon icon={PlusSignIcon} size={18} />
              </a>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-9 text-muted-foreground sm:inline-flex"
              disabled
              aria-label="Invite bot to a server"
              title="Invite link available when the bot is online"
            >
              <Icon icon={PlusSignIcon} size={18} />
            </Button>
          )}
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 rounded-full px-2 hover:bg-secondary"
              >
                <Avatar className="size-7">
                  <AvatarImage src={accountAvatar} alt={accountName} />
                  <AvatarFallback className="bg-primary/20 text-xs text-primary">
                    {accountName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate text-sm font-medium sm:inline">
                  {accountName}
                </span>
                <Icon icon={ArrowDown01Icon} size={16} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.username}
                  {user.id ? ` · ${user.id}` : ""}
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void logout();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
