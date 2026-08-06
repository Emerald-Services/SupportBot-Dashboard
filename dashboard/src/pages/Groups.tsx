import React, { useEffect, useState } from "react";
import {
  Add01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  Shield01Icon,
  UserMultiple02Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import type { DashboardGroup, DashboardPermissions } from "@/lib/permissions";
import { defaultPermissionsForRole } from "@/lib/permissions";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ColorPicker } from "@/components/ui/color-picker";

const COLOR_PRESETS = [
  { name: "Emerald", hex: "#10B981" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Red", hex: "#EF4444" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Gray", hex: "#6B7280" },
];

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

  const PERM_ITEMS: {
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
      title: "Tickets",
      description: "View open support tickets, live web chat, send staff replies, and close tickets.",
    },
    {
      key: "transcripts",
      title: "Transcripts",
      description: "Access saved ticket HTML transcripts and configure public transcript options.",
    },
    {
      key: "logs",
      title: "Console Logs",
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
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          General Capabilities
        </h4>
        <div className="grid gap-2.5">
          {PERM_ITEMS.map(({ key, title, description }) => (
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
        </div>
      </div>
    </div>
  );
}

export function Groups() {
  const { impersonateGroup, impersonatedGroup, stopImpersonation } = useAuth();
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"add" | "edit">("add");
  const [saving, setSaving] = useState(false);

  // Form State
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10B981");
  const [discordRoleId, setDiscordRoleId] = useState("");
  const [permissions, setPermissions] = useState<DashboardPermissions>(
    defaultPermissionsForRole("viewer")
  );

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listGroups();
      setGroups(res.data?.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const openAddDialog = () => {
    setEditMode("add");
    setGroupId("");
    setName("");
    setDescription("");
    setColor("#10B981");
    setDiscordRoleId("");
    setPermissions(defaultPermissionsForRole("viewer"));
    setDialogOpen(true);
  };

  const openEditDialog = (group: DashboardGroup) => {
    setEditMode("edit");
    setGroupId(group.id);
    setName(group.name);
    setDescription(group.description || "");
    setColor(group.color || "#10B981");
    setDiscordRoleId(group.discordRoleId || "");
    setPermissions(group.permissions || defaultPermissionsForRole("viewer"));
    setDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editMode === "add") {
        await api.createGroup({
          name: name.trim(),
          description: description.trim(),
          color,
          discordRoleId: discordRoleId.trim() || null,
          permissions,
        });
        setSuccessMsg(`Group "${name}" created successfully.`);
      } else {
        await api.updateGroup(groupId, {
          name: name.trim(),
          description: description.trim(),
          color,
          discordRoleId: discordRoleId.trim() || null,
          permissions,
        });
        setSuccessMsg(`Group "${name}" updated successfully.`);
      }
      setDialogOpen(false);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: DashboardGroup) => {
    if (group.isSystem) return;
    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      return;
    }

    try {
      await api.deleteGroup(group.id);
      setSuccessMsg(`Group "${group.name}" deleted.`);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permission Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom permission groups, assign staff members, and optionally sync with Discord Role IDs.
          </p>
        </div>
        <Button onClick={openAddDialog} className="shrink-0 gap-2 bg-primary">
          <Icon icon={Add01Icon} size={18} />
          Create Group
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
          <AlertDescription className="flex items-center justify-between">
            <span>{successMsg}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setSuccessMsg(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Group Table View */}
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ) : groups.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No permission groups found. Click "Create Group" to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5">Group</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Discord Role ID</th>
                    <th className="px-4 py-2.5">Enabled Permissions</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="transition-colors hover:bg-secondary/25"
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: group.color || "#10B981" }}
                          />
                          <span className="text-foreground font-semibold text-xs">{group.name}</span>
                          {group.isSystem && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/80">
                              <Icon icon={Shield01Icon} size={10} />
                              System
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                        {group.description || "—"}
                      </td>

                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {group.discordRoleId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded border border-border/50">
                            <Icon icon={Shield01Icon} size={12} className="text-primary" />
                            {group.discordRoleId}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {group.permissions?.overview && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              Overview
                            </span>
                          )}
                          {(group.permissions?.tickets ?? group.permissions?.overview) && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Tickets
                            </span>
                          )}
                          {group.permissions?.transcripts && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Transcripts
                            </span>
                          )}
                          {group.permissions?.logs && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Logs
                            </span>
                          )}
                          {group.permissions?.users?.manage && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              User Mgmt
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-2 text-xs gap-1 ${
                              impersonatedGroup?.id === group.id
                                ? "text-amber-400 font-bold bg-amber-500/15 border border-amber-500/30"
                                : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            }`}
                            onClick={() =>
                              impersonatedGroup?.id === group.id
                                ? stopImpersonation()
                                : impersonateGroup(group.id)
                            }
                          >
                            <Icon icon={Shield01Icon} size={13} />
                            {impersonatedGroup?.id === group.id ? "Active Preview" : "View as Group"}
                          </Button>

                          {!group.isSystem && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditDialog(group)}
                              >
                                <Icon icon={PencilEdit01Icon} size={13} />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteGroup(group)}
                              >
                                <Icon icon={Delete02Icon} size={13} />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode === "add" ? "Create Permission Group" : `Edit Group: ${name}`}
            </DialogTitle>
            <DialogDescription>
              Configure group metadata, custom color badge, Discord role sync, and permission rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Support Staff"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-color">Color Badge</Label>
                <div className="flex items-center gap-3">
                  <ColorPicker value={color} onChange={setColor} />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#10B981"
                    className="w-28 font-mono text-sm uppercase"
                  />
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        className="size-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => setColor(preset.hex)}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-desc">Description</Label>
              <Input
                id="group-desc"
                placeholder="Brief description of what members in this group can access..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord-role-id">Discord Role ID (Optional Auto-Sync)</Label>
              <Input
                id="discord-role-id"
                placeholder="e.g. 123456789012345678"
                value={discordRoleId}
                onChange={(e) => setDiscordRoleId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If provided, Discord users with this Role ID will automatically inherit this group upon login.
              </p>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-3">Group Permission Matrix</h4>
              <PermissionEditor
                permissions={permissions}
                onChange={setPermissions}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveGroup} disabled={saving} className="bg-primary">
              {saving ? "Saving..." : editMode === "add" ? "Create Group" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
