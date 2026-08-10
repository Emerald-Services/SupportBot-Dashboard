import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Add01Icon,
  Delete02Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons";
import { api, type StoredDashboardUser } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  CONFIG_FILE_LABELS,
  CONFIG_FILES,
  defaultPermissionsForRole,
  displayDiscordName,
  ROLE_HINTS,
  ROLE_LABELS,
  type DashboardGroup,
  type DashboardPermissions,
  type DashboardRole,
} from "@/lib/permissions";

const ASSIGNABLE_ROLES: DashboardRole[] = [
  "admin",
  "moderator",
  "editor",
  "viewer",
  "custom",
];

type EditorState = {
  mode: "add" | "edit";
  id: string;
  username: string;
  globalName: string;
  role: DashboardRole;
  enabled: boolean;
  permissions: DashboardPermissions;
  yamlOwner: boolean;
};

function emptyEditor(): EditorState {
  return {
    mode: "add",
    id: "",
    username: "",
    globalName: "",
    role: "viewer",
    enabled: true,
    permissions: defaultPermissionsForRole("viewer"),
    yamlOwner: false,
  };
}

function PermissionEditor({
  permissions,
  onChange,
  disabled,
}: {
  permissions: DashboardPermissions;
  onChange: (next: DashboardPermissions) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<DashboardPermissions>) =>
    onChange({ ...permissions, ...patch });

  const MODULE_ITEMS: {
    key: "overview" | "tickets" | "logs" | "transcripts";
    title: string;
    description: string;
  }[] = [
    {
      key: "overview",
      title: "Dashboard Overview",
      description: "Access to system metrics, bot health status, and main dashboard stats.",
    },
    {
      key: "tickets",
      title: "Support Tickets",
      description: "View open support tickets, live web chat, send staff replies, and close tickets.",
    },
    {
      key: "transcripts",
      title: "Ticket Transcripts",
      description: "Access saved ticket HTML transcripts and configure public transcript options.",
    },
    {
      key: "logs",
      title: "Console Terminal Logs",
      description: "View real-time bot terminal output, system logs, and runtime error traces.",
    },
  ];

  const CONFIG_ITEMS: [string, string, string][] = [
    ["supportbot", "Bot config", "Main bot token, prefix, channels, categories, and core settings."],
    ["ticket-panel", "Ticket panel", "Ticket home embed, button labels, dropdown options, and panel styling."],
    ["commands", "Commands", "Enable/disable slash commands, descriptions, and custom names."],
    ["messages", "Messages", "Custom bot response messages, welcome embeds, and embed colors."],
    ["supportbot-ai", "AI assistant", "Configure AI support rules, model API keys, and auto-response channels."],
  ];

  return (
    <div className="space-y-6">
      {/* Category 1: General & Modules */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          General & Modules Access
        </h4>
        <div className="grid gap-2.5">
          {MODULE_ITEMS.map(({ key, title, description }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{description}</p>
              </div>
              <Switch
                checked={permissions[key] ?? (key === "tickets" ? permissions.overview : false)}
                disabled={disabled}
                onCheckedChange={(checked) => set({ [key]: checked })}
                className="shrink-0"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Category 2: Administration & System Settings */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Administration & Settings
        </h4>
        <div className="grid gap-2.5">
          {/* Settings View */}
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Settings (View)</p>
              <p className="text-xs text-muted-foreground leading-snug">
                View system branding, OAuth configurations, and system health details.
              </p>
            </div>
            <Switch
              checked={permissions.settings.view}
              disabled={disabled}
              onCheckedChange={(view) => set({ settings: { ...permissions.settings, view } })}
              className="shrink-0"
            />
          </label>

          {/* Settings Install Updates */}
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Settings (Install Updates)</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Perform 1-click bot system updates and trigger bot server restarts.
              </p>
            </div>
            <Switch
              checked={permissions.settings.update}
              disabled={disabled}
              onCheckedChange={(update) => set({ settings: { ...permissions.settings, update } })}
              className="shrink-0"
            />
          </label>

          {/* Users View */}
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Users & Groups (View)</p>
              <p className="text-xs text-muted-foreground leading-snug">
                View dashboard staff accounts and permission group listings.
              </p>
            </div>
            <Switch
              checked={permissions.users.view}
              disabled={disabled}
              onCheckedChange={(view) => set({ users: { ...permissions.users, view } })}
              className="shrink-0"
            />
          </label>

          {/* Users Manage */}
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Users & Groups (Manage)</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Create, edit, assign, and delete staff accounts and permission groups.
              </p>
            </div>
            <Switch
              checked={permissions.users.manage}
              disabled={disabled}
              onCheckedChange={(manage) => set({ users: { ...permissions.users, manage } })}
              className="shrink-0"
            />
          </label>
        </div>
      </div>

      {/* Category 3: Configuration Files Access */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configuration Files Access
        </h4>
        <div className="grid gap-2.5">
          {CONFIG_ITEMS.map(([file, title, description]) => {
            const cur = permissions.configs?.[file as keyof typeof permissions.configs] ?? {
              view: false,
              edit: false,
            };
            return (
              <div
                key={file}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                    <span>View</span>
                    <Switch
                      checked={cur.view}
                      disabled={disabled}
                      onCheckedChange={(view) =>
                        set({
                          configs: {
                            ...permissions.configs,
                            [file]: { ...cur, view },
                          },
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                    <span>Edit</span>
                    <Switch
                      checked={cur.edit}
                      disabled={disabled}
                      onCheckedChange={(edit) =>
                        set({
                          configs: {
                            ...permissions.configs,
                            [file]: { ...cur, edit, view: edit ? true : cur.view },
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {/* Raw YAML Code Editor */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-semibold text-foreground">Raw YAML Code Editor</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Access the raw YAML code editor tab to view or edit full raw configuration files.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                <span>Access</span>
                <Switch
                  checked={permissions.rawYaml ?? false}
                  disabled={disabled}
                  onCheckedChange={(rawYaml) => set({ rawYaml })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function accessSummary(u: StoredDashboardUser) {
  if (u.permissions.users.manage) return "Full + user management";
  if (u.permissions.settings.update) return "Configs + settings updates";
  if (Object.values(u.permissions.configs).some((c) => c.edit)) {
    return "Can edit configs";
  }
  return "View only";
}

export default function Users() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManage = hasPermission("users.manage");

  const [users, setUsers] = useState<StoredDashboardUser[]>([]);
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [uRes, gRes] = await Promise.all([
        api.listDashboardUsers(),
        api.listGroups().catch(() => ({ data: { groups: [] } })),
      ]);
      if (uRes.data) setUsers(uRes.data.users);
      if (gRes.data) setGroups(gRes.data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.yamlOwner !== b.yamlOwner) return a.yamlOwner ? -1 : 1;
        return (a.username || a.id).localeCompare(b.username || b.id);
      }),
    [users],
  );

  function openAdd() {
    setEditor(emptyEditor());
  }

  function openEdit(u: StoredDashboardUser) {
    setEditor({
      mode: "edit",
      id: u.id,
      username: u.username || "",
      globalName: u.globalName || "",
      role: u.yamlOwner ? "owner" : u.role,
      enabled: u.enabled,
      permissions:
        u.role === "custom"
          ? u.permissions
          : defaultPermissionsForRole(u.role),
      yamlOwner: u.yamlOwner,
    });
  }

  function setRole(role: DashboardRole) {
    if (!editor) return;
    setEditor({
      ...editor,
      role,
      permissions: defaultPermissionsForRole(role, editor.permissions),
    });
  }

  async function saveEditor() {
    if (!editor || !canManage) return;
    setSaving(true);
    setError("");
    try {
      if (editor.mode === "add") {
        await api.addDashboardUser({
          id: editor.id.trim(),
          role: editor.role,
          username: editor.username || undefined,
          globalName: editor.globalName || undefined,
          enabled: editor.enabled,
          permissions:
            editor.role === "custom" ? editor.permissions : undefined,
        });
      } else {
        await api.updateDashboardUser(editor.id, {
          role: editor.yamlOwner ? undefined : editor.role,
          enabled: editor.enabled,
          username: editor.username || undefined,
          globalName: editor.globalName || undefined,
          permissions:
            editor.role === "custom" ? editor.permissions : undefined,
        });
      }
      setEditor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(id: string) {
    if (!canManage) return;
    if (!window.confirm("Remove this user from the dashboard?")) return;
    setError("");
    try {
      await api.removeDashboardUser(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Control who can sign in and what they can view or edit. Owners in{" "}
            <code className="rounded bg-primary/10 px-1 text-xs text-primary">
              api.yml
            </code>{" "}
            always have full access.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openAdd}>
            <Icon icon={Add01Icon} size={16} className="mr-2" />
            Add user
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Group</th>
                    <th className="px-4 py-2.5">Access Summary</th>
                    <th className="px-4 py-2.5">Status</th>
                    {canManage && <th className="px-4 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedUsers.map((u) => {
                    const matchedGroup = groups.find(
                      (g) => g.id === u.groupId || g.id === u.role
                    );
                    const groupColor = matchedGroup?.color || "#10B981";
                    const groupName = matchedGroup?.name || ROLE_LABELS[u.yamlOwner ? "owner" : (u.role as keyof typeof ROLE_LABELS)] || u.role;

                    return (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-secondary/25"
                      >
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-7">
                              <AvatarImage src={u.avatar} alt={u.username} />
                              <AvatarFallback className="text-[10px]">
                                {(u.username || u.id).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <p className="truncate font-semibold text-foreground text-xs">
                                {displayDiscordName(u)}
                                {u.id === currentUser?.id ? (
                                  <span className="text-[11px] text-primary font-normal ml-1">(you)</span>
                                ) : ""}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground font-mono">
                                {u.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: groupColor }}
                            />
                            <span className="font-medium text-xs text-foreground">
                              {groupName}
                            </span>
                            {u.yamlOwner && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                Config Owner
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                          {accessSummary(u)}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {u.enabled ? (
                            <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              Disabled
                            </Badge>
                          )}
                        </td>

                        {canManage && (
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(u)}
                              >
                                <Icon icon={Edit02Icon} size={13} />
                                Edit
                              </Button>
                              {!u.yamlOwner && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeUser(u.id)}
                                >
                                  <Icon icon={Delete02Icon} size={13} />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "add" ? "Add dashboard user" : "Edit user"}
            </DialogTitle>
            <DialogDescription>
              {editor?.yamlOwner
                ? "This user is an owner in api.yml. Role and removal are managed in the config file."
                : ROLE_HINTS[editor?.role ?? "viewer"]}
            </DialogDescription>
          </DialogHeader>

          {editor ? (
            <div className="space-y-4">
              {editor.mode === "add" ? (
                <div className="space-y-2">
                  <Label htmlFor="discord-id">Discord user ID</Label>
                  <Input
                    id="discord-id"
                    value={editor.id}
                    onChange={(e) =>
                      setEditor({ ...editor, id: e.target.value })
                    }
                    placeholder="829112572816130058"
                  />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display name (optional)</Label>
                  <Input
                    value={editor.globalName}
                    onChange={(e) =>
                      setEditor({ ...editor, globalName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username (optional)</Label>
                  <Input
                    value={editor.username}
                    onChange={(e) =>
                      setEditor({ ...editor, username: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Permission Group</Label>
                <Select
                  value={editor.role}
                  disabled={editor.yamlOwner}
                  onValueChange={(v) => {
                    const matchedGroup = groups.find((g) => g.id === v);
                    if (matchedGroup) {
                      setEditor({
                        ...editor,
                        role: v,
                        permissions: matchedGroup.permissions,
                      });
                    } else {
                      setRole(v as DashboardRole);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editor.yamlOwner ? (
                      <SelectItem value="owner">Owner</SelectItem>
                    ) : groups.length > 0 ? (
                      groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: group.color || "#10B981" }}
                            />
                            <span>{group.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm">Account enabled</span>
                <Switch
                  checked={editor.enabled}
                  disabled={editor.yamlOwner}
                  onCheckedChange={(enabled) =>
                    setEditor({ ...editor, enabled })
                  }
                />
              </label>

              {editor.role === "custom" && !editor.yamlOwner ? (
                <PermissionEditor
                  permissions={editor.permissions}
                  onChange={(permissions) =>
                    setEditor({ ...editor, permissions })
                  }
                />
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                saving ||
                !canManage ||
                (editor?.mode === "add" &&
                  !/^\d{17,20}$/.test(editor.id.trim()))
              }
              onClick={() => void saveEditor()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
