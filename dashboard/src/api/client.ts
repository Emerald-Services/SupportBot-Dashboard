import type {
  DashboardPermissions,
  DashboardRole,
  DashboardUser,
  StoredDashboardUser,
} from "@/lib/permissions";

export type { DashboardUser, DashboardPermissions, StoredDashboardUser, DashboardRole };

const REQUEST_TIMEOUT_MS = 25_000;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Request timed out. The API may still be starting or the bot is restarting — try again.",
      );
    }
    throw new Error(
      err instanceof Error
        ? err.message
        : "Could not reach the API. Is the bot process running?",
    );
  } finally {
    window.clearTimeout(timeout);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return body as T;
}

export type LogType = "Output" | "Warn" | "Error";

export interface LogEntry {
  type: LogType;
  timestamp: string | null;
  message: string;
}

export interface LogsPayload {
  entries: LogEntry[];
  cursor: Record<string, number>;
}

export interface BotRestartResult {
  success: boolean;
  error?: string;
  commands?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  restartRequired?: boolean;
  reloaded?: string[];
  botRestart?: BotRestartResult;
}

export interface CatalogAddon {
  id: string;
  name: string;
  slug?: string;
  description: string;
  repositoryUrl: string;
  price?: number;
  is_external?: number;
  external_store?: string;
  jsFiles: string[];
  configFiles: string[];
  fileCount?: number;
  installed?: boolean;
}

export interface UpdateCheckResult {
  id: string;
  name: string;
  current: string;
  latest: string;
  updateAvailable: boolean;
  repository: string;
  branch: string;
  zipUrl: string;
}

export type NotificationType = "bot" | "update" | "info" | "error";

export interface DashboardNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  createdAt: number;
  read: boolean;
}

export interface NotificationsPayload {
  items: DashboardNotification[];
  unreadCount: number;
}

export type ModuleSetupStatus = "todo" | "progress" | "done";

export interface ModuleStatusInfo {
  status: ModuleSetupStatus;
  subtitle: string;
  passed?: number;
  total?: number;
}

export interface GuildSummary {
  id: string;
  name: string;
  memberCount: number | null;
  icon: string | null;
}

export type GuildHealthStatus =
  | "ok"
  | "missing_config"
  | "not_in_guild"
  | "extra_guilds"
  | "offline";

export interface GuildHealth {
  status: GuildHealthStatus;
  configuredGuildId: string | null;
  message: string | null;
  configuredGuild: GuildSummary | null;
  extraGuilds: GuildSummary[];
}

export type DashboardAlertSeverity = "error" | "warning" | "info";

export interface DashboardAlertPayload {
  id: string;
  severity: DashboardAlertSeverity;
  category: string;
  title: string;
  message: string;
  action?: { label: string; href: string };
  meta?: Record<string, unknown>;
}

export interface GuildEmojiResource {
  id: string;
  name: string;
  animated: boolean;
  url: string | null;
}

export interface GuildResources {
  guildId: string;
  guildName: string;
  roles: { id: string; name: string; color: string | null }[];
  channels: { id: string; name: string; type: number }[];
  categories: { id: string; name: string }[];
  emojis: GuildEmojiResource[];
}

export interface BotStats {
  bot: {
    username: string;
    id: string;
    avatar: string;
    inviteUrl?: string;
    version: string;
    ping: number;
    uptime: number;
  };
  servers: number;
  users: number;
  tickets: { total: number; open: number; closed: number };
  modules?: Record<string, ModuleStatusInfo>;
  hosting: {
    ram_used: string;
    ram_total: string;
    ram_percent: number;
    cpu_load: string;
    uptime: string;
  };
}

export function maskConfigSecrets(content: string, filename: string): string {
  if (filename !== "supportbot") return content;
  return content.replace(
    /^(\s*Token:\s*)["'][^"']*["']/m,
    '$1"BOT_TOKEN"',
  );
}

export const api = {
  me: () => request<ApiResponse<DashboardUser>>("/api/auth/me"),

  logout: () =>
    request<ApiResponse<unknown>>("/api/auth/logout", { method: "POST" }),

  health: () =>
    request<
      ApiResponse<{
        dashboard: boolean;
        botReady: boolean;
        oauthEnabled?: boolean;
      }>
    >("/api/health"),

  stats: () => request<ApiResponse<BotStats>>("/api/stats"),

  getAlerts: () => request<ApiResponse<DashboardAlertPayload[]>>("/api/alerts"),

  getGuildStatus: () =>
    request<ApiResponse<GuildHealth>>("/api/guild/status"),

  getGuildResources: (refresh = false) =>
    request<ApiResponse<GuildResources>>(
      `/api/guild/resources${refresh ? "?refresh=1" : ""}`,
    ),

  leaveGuild: (guildId: string) =>
    request<ApiResponse<GuildHealth>>(`/api/guild/${guildId}/leave`, {
      method: "POST",
    }),

  listConfigs: () =>
    [
      "supportbot",
      "ticket-panel",
      "commands",
      "messages",
      "supportbot-ai",
    ] as const,

  getConfigRaw: (file: string) =>
    request<ApiResponse<string>>(`/api/configs/${file}`),

  saveConfigRaw: (filename: string, content: string) =>
    request<ApiResponse<unknown>>("/api/configs/raw", {
      method: "PUT",
      body: JSON.stringify({ filename, content }),
    }),

  getConfigJson: (file: string) =>
    request<ApiResponse<Record<string, unknown>>>(`/api/configs/json/${file}`),

  updateConfigFields: (updates: Record<string, unknown>) =>
    request<ApiResponse<unknown>>("/api/configs/update-fields/multi", {
      method: "POST",
      body: JSON.stringify(updates),
    }),

  checkForUpdates: () =>
    request<ApiResponse<UpdateCheckResult[]>>("/api/system/update-check"),

  runUpdate: (repoId: string, version: string, url: string) =>
    request<ApiResponse<unknown>>("/api/system/update", {
      method: "POST",
      body: JSON.stringify({ repoId, version, url }),
    }),

  reloadConfigs: (file?: string) =>
    request<ApiResponse<unknown>>("/api/system/reload-configs", {
      method: "POST",
      body: JSON.stringify(file ? { file } : {}),
    }),

  getLogsMeta: () =>
    request<
      ApiResponse<{
        types: LogType[];
        files: { type: LogType; date: string; file: string | null; size: number }[];
      }>
    >("/api/system/logs/meta"),

  getLogs: (params: {
    types?: LogType[];
    cursor?: Record<string, number>;
    tail?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.types?.length) q.set("types", params.types.join(","));
    if (params.cursor && Object.keys(params.cursor).length > 0) {
      q.set("cursor", JSON.stringify(params.cursor));
    }
    if (params.tail != null) q.set("tail", String(params.tail));
    const qs = q.toString();
    return request<ApiResponse<LogsPayload>>(
      `/api/system/logs${qs ? `?${qs}` : ""}`,
    );
  },

  listTranscripts: () =>
    request<
      ApiResponse<
        {
          id: string;
          filename: string;
          createdAt: string;
          size?: number;
          ticketName?: string | null;
        }[]
      >
    >("/api/system/transcripts"),

  listOpenTickets: () =>
    request<
      ApiResponse<{
        guildId: string;
        tickets: {
          ticket_id: string;
          user_id: string;
          subject: string;
          description: string;
          department: string;
          priority: string;
          created_at: number;
        }[];
      }>
    >("/api/system/tickets/open"),

  getTranscript: (id: string) =>
    request<ApiResponse<string>>(`/api/system/transcripts/${id}`),

  getTranscriptSettings: () =>
    request<
      ApiResponse<{
        autoDelete: { enabled: boolean; afterDays: number };
        publicAccess: { enabled: boolean };
        publicBasePath?: string;
      }>
    >("/api/system/transcript-settings"),

  updateTranscriptSettings: (body: {
    autoDelete?: { enabled?: boolean; afterDays?: number };
    publicAccess?: { enabled?: boolean };
  }) =>
    request<
      ApiResponse<{
        autoDelete: { enabled: boolean; afterDays: number };
        publicAccess: { enabled: boolean };
        publicBasePath?: string;
      }>
    >("/api/system/transcript-settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTranscript: (id: string) =>
    request<ApiResponse<unknown>>(`/api/system/transcripts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  purgeTranscripts: () =>
    request<
      ApiResponse<{ deleted: number; skipped: boolean }>
    >("/api/system/transcripts/purge", { method: "POST" }),

  getBranding: () =>
    request<
      ApiResponse<{
        title: string;
        pageTitle: string;
        hasFavicon: boolean;
        faviconUrl: string | null;
        updatedAt: number | null;
      }>
    >("/api/branding"),

  updateBranding: (body: { title?: string; pageTitle?: string }) =>
    request<
      ApiResponse<{
        title: string;
        pageTitle: string;
        hasFavicon: boolean;
        faviconUrl: string | null;
        updatedAt: number | null;
      }>
    >("/api/branding", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  uploadBrandingFavicon: (dataUrl: string) =>
    request<
      ApiResponse<{
        title: string;
        pageTitle: string;
        hasFavicon: boolean;
        faviconUrl: string | null;
        updatedAt: number | null;
      }>
    >("/api/branding/favicon", {
      method: "POST",
      body: JSON.stringify({ dataUrl }),
    }),

  removeBrandingFavicon: () =>
    request<
      ApiResponse<{
        title: string;
        pageTitle: string;
        hasFavicon: boolean;
        faviconUrl: string | null;
        updatedAt: number | null;
      }>
    >("/api/branding/favicon", { method: "DELETE" }),

  resetBranding: () =>
    request<
      ApiResponse<{
        title: string;
        pageTitle: string;
        hasFavicon: boolean;
        faviconUrl: string | null;
        updatedAt: number | null;
      }>
    >("/api/branding/reset", { method: "POST" }),

  getTranscriptTemplate: () =>
    request<ApiResponse<Record<string, unknown>>>(
      "/api/system/transcript-template",
    ),

  saveTranscriptTemplate: (data: Record<string, unknown>) =>
    request<ApiResponse<Record<string, unknown>>>(
      "/api/system/transcript-template",
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    ),

  previewTranscriptTemplate: async (
    data: Record<string, unknown>,
  ): Promise<string> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch("/api/system/transcript-template/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Preview failed (${res.status})`);
      }
      return await res.text();
    } finally {
      window.clearTimeout(timeout);
    }
  },

  getNotifications: () =>
    request<ApiResponse<NotificationsPayload>>("/api/notifications"),

  markNotificationsRead: (ids: string[] | "all") =>
    request<ApiResponse<{ unreadCount: number }>>("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  dismissNotification: (id: string) =>
    request<ApiResponse<{ unreadCount: number }>>(`/api/notifications/${id}`, {
      method: "DELETE",
    }),

  listDashboardUsers: () =>
    request<
      ApiResponse<{
        users: StoredDashboardUser[];
        roles: DashboardRole[];
        configFiles: string[];
      }>
    >("/api/dashboard-users"),

  addDashboardUser: (body: {
    id: string;
    role: DashboardRole;
    username?: string;
    globalName?: string;
    permissions?: DashboardPermissions;
    enabled?: boolean;
  }) =>
    request<ApiResponse<StoredDashboardUser>>("/api/dashboard-users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateDashboardUser: (
    id: string,
    body: {
      role?: DashboardRole;
      enabled?: boolean;
      username?: string;
      globalName?: string;
      permissions?: DashboardPermissions;
    },
  ) =>
    request<ApiResponse<StoredDashboardUser>>(`/api/dashboard-users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  removeDashboardUser: (id: string) =>
    request<ApiResponse<unknown>>(`/api/dashboard-users/${id}`, {
      method: "DELETE",
    }),

  getAddonsCatalog: () =>
    request<
      ApiResponse<{
        repository: string;
        addons: CatalogAddon[];
      }>
    >("/api/addons/catalog"),

  getAddonsInstalled: () =>
    request<
      ApiResponse<{
        installed: { id: string; name: string; jsFiles: string[]; configFiles: string[] }[];
        configs: string[];
      }>
    >("/api/addons/installed"),

  listAddonConfigs: () =>
    request<ApiResponse<string[]>>("/api/addons/configs"),

  installAddon: (name: string) =>
    request<ApiResponse<unknown>>("/api/addons/install", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getAddonConfigJson: (file: string) =>
    request<ApiResponse<Record<string, unknown>>>(
      `/api/addons/configs/json/${encodeURIComponent(file)}`,
    ),

  saveAddonConfig: (filename: string, data: Record<string, unknown>) =>
    request<ApiResponse<unknown>>("/api/addons/configs", {
      method: "PUT",
      body: JSON.stringify({ filename, data }),
    }),

  buildAddon: (payload: { name: string; description: string; permission: string; embed: any }) =>
    request<ApiResponse<{ success: boolean }>>("/api/addons/build", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSetupStatus: () =>
    request<ApiResponse<import("@/lib/setup-types").SetupStatus>>("/api/setup/status"),

  validateSetup: (body: Record<string, unknown>) =>
    request<ApiResponse<import("@/lib/setup-types").SetupValidateResponse>>(
      "/api/setup/validate",
      { method: "POST", body: JSON.stringify(body) },
    ),

  completeSetup: (body: Record<string, unknown>) =>
    request<
      ApiResponse<{ setupComplete: boolean; botRestart?: BotRestartResult }>
    >("/api/setup/complete", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function displayDiscordName(
  user: Pick<DashboardUser, "username" | "globalName">,
): string {
  return user.globalName || user.username;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
