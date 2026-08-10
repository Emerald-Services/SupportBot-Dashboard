export const CONFIG_FILES = [
  "supportbot",
  "ticket-panel",
  "commands",
  "messages",
  "supportbot-ai",
] as const;

export type ConfigFile = (typeof CONFIG_FILES)[number];

export type DashboardRole =
  | "owner"
  | "admin"
  | "moderator"
  | "editor"
  | "viewer"
  | "custom";

export interface ConfigFilePermission {
  view: boolean;
  edit: boolean;
}

export interface DashboardPermissions {
  overview: boolean;
  tickets: boolean;
  logs: boolean;
  transcripts: boolean;
  rawYaml?: boolean;
  settings: { view: boolean; update: boolean };
  configs: Record<ConfigFile, ConfigFilePermission>;
  users: { view: boolean; manage: boolean };
}

export interface DashboardUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string;
  role: string;
  groupId?: string;
  isOwner: boolean;
  permissions: DashboardPermissions;
}

export interface StoredDashboardUser extends DashboardUser {
  enabled: boolean;
  yamlOwner: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DashboardGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  discordRoleId: string | null;
  isSystem: boolean;
  permissions: DashboardPermissions;
  createdAt?: number;
  updatedAt?: number;
}

export const ROLE_LABELS: Record<DashboardRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  editor: "Editor",
  viewer: "Viewer",
  custom: "Custom",
};

export const ROLE_HINTS: Record<DashboardRole, string> = {
  owner: "Full access to everything",
  admin: "Full access including user management",
  moderator: "View dashboard, logs, transcripts, and configs",
  editor: "Edit configuration files",
  viewer: "View-only access",
  custom: "Permissions you configure below",
};

export const CONFIG_FILE_LABELS: Record<ConfigFile, string> = {
  supportbot: "Bot config",
  "ticket-panel": "Ticket panel",
  commands: "Commands",
  messages: "Messages",
  "supportbot-ai": "AI assistant",
};

export function hasPermission(
  permissions: DashboardPermissions | null | undefined,
  key: string,
): boolean {
  if (!permissions) return false;

  if (key === "overview") return permissions.overview;
  if (key === "tickets") return permissions.tickets ?? permissions.overview;
  if (key === "logs") return permissions.logs;
  if (key === "transcripts") return permissions.transcripts;
  if (key === "rawYaml" || key === "configs.raw_yaml" || key === "configs.rawYaml") {
    return Boolean(permissions.rawYaml ?? (permissions.configs as unknown as Record<string, boolean>)?.rawYaml ?? false);
  }
  if (key === "settings.view") return permissions.settings.view;
  if (key === "settings.update") return permissions.settings.update;
  if (key === "users.view") return permissions.users.view;
  if (key === "users.manage") return permissions.users.manage;

  const viewMatch = key.match(/^configs\.([a-z0-9-]+)\.view$/);
  if (viewMatch) {
    const file = viewMatch[1] as ConfigFile;
    return Boolean(permissions.configs[file]?.view);
  }

  const editMatch = key.match(/^configs\.([a-z0-9-]+)\.edit$/);
  if (editMatch) {
    const file = editMatch[1] as ConfigFile;
    return Boolean(permissions.configs[file]?.edit);
  }

  return false;
}

export function canViewConfig(
  permissions: DashboardPermissions | null | undefined,
  file: string,
): boolean {
  return hasPermission(permissions, `configs.${file}.view`);
}

export function canEditConfig(
  permissions: DashboardPermissions | null | undefined,
  file: string,
): boolean {
  return hasPermission(permissions, `configs.${file}.edit`);
}

export function canViewAnyConfig(
  permissions: DashboardPermissions | null | undefined,
): boolean {
  return CONFIG_FILES.some((file) => canViewConfig(permissions, file));
}

function configMap(view: boolean, edit: boolean): Record<ConfigFile, ConfigFilePermission> {
  return CONFIG_FILES.reduce(
    (acc, file) => {
      acc[file] = { view, edit };
      return acc;
    },
    {} as Record<ConfigFile, ConfigFilePermission>,
  );
}

export function fullPermissions(
  rawYaml: boolean = true,
  userManage: boolean = true,
): DashboardPermissions {
  return {
    overview: true,
    tickets: true,
    logs: true,
    transcripts: true,
    rawYaml,
    settings: { view: true, update: true },
    configs: configMap(true, true),
    users: { view: true, manage: userManage },
  };
}

export function defaultPermissionsForRole(
  role: DashboardRole,
  custom?: DashboardPermissions,
): DashboardPermissions {
  switch (role) {
    case "owner":
      return fullPermissions(true, true);
    case "admin":
      return fullPermissions(false, false);
    case "moderator":
      return {
        overview: true,
        tickets: true,
        logs: true,
        transcripts: true,
        rawYaml: false,
        settings: { view: true, update: false },
        configs: configMap(true, false),
        users: { view: false, manage: false },
      };
    case "editor":
      return {
        overview: true,
        tickets: true,
        logs: true,
        transcripts: false,
        rawYaml: false,
        settings: { view: true, update: false },
        configs: configMap(true, true),
        users: { view: false, manage: false },
      };
    case "viewer":
      return {
        overview: true,
        tickets: true,
        logs: true,
        transcripts: true,
        rawYaml: false,
        settings: { view: true, update: false },
        configs: configMap(true, false),
        users: { view: false, manage: false },
      };
    case "custom":
      return custom ?? defaultPermissionsForRole("viewer");
    default:
      return defaultPermissionsForRole("viewer");
  }
}

export function displayDiscordName(
  user: Pick<DashboardUser, "username" | "globalName">,
): string {
  return user.globalName || user.username;
}

export function firstAllowedPath(
  permissions: DashboardPermissions | null | undefined,
): string {
  if (hasPermission(permissions, "overview")) return "/";
  if (hasPermission(permissions, "logs")) return "/logs";
  if (canViewAnyConfig(permissions)) return "/configs?file=supportbot";
  if (hasPermission(permissions, "transcripts")) return "/transcripts";
  if (hasPermission(permissions, "settings.view")) return "/settings";
  if (hasPermission(permissions, "users.view")) return "/users";
  return "/login";
}
