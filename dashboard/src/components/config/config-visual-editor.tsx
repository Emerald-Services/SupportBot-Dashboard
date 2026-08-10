import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircleIcon, FloppyDiskIcon, Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { api, maskConfigSecrets } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getSchema, type ConfigSchema } from "@/lib/config-schemas";
import { getByPath, setByPath } from "@/lib/config-utils";
import { mergeSchemaWithData } from "@/lib/merge-config-schema";
import { useAuth } from "@/context/AuthContext";
import { notifyConfigSave } from "@/lib/notify-config-save";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import Editor from "@monaco-editor/react";
import { ConfigFieldInput } from "./config-field";
import { CommandsEditor } from "./commands-editor";

import { hasPermission } from "@/lib/permissions";

type EditorMode = "visual" | "yaml";

interface ConfigVisualEditorProps {
  configFile: string;
}

function maskSecretsInData(
  file: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let next = structuredClone(data);
  if (file === "supportbot") {
    const token = getByPath(next, "General.Token");
    if (token && token !== "BOT_TOKEN") {
      next = setByPath(next, "General.Token", "BOT_TOKEN");
    }
  }
  if (file === "supportbot-ai") {
    const key = getByPath(next, "General.Model_API_Key");
    if (key && key !== "MODEL_API_KEY") {
      next = setByPath(next, "General.Model_API_Key", "MODEL_API_KEY");
    }
  }
  return next;
}

function buildUpdates(
  file: string,
  schema: ConfigSchema,
  data: Record<string, unknown>,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const section of schema) {
    for (const field of section.fields) {
      const val = getByPath(data, field.path);
      const orig = getByPath(original, field.path);
      if (field.type === "secret") {
        if (
          val === "BOT_TOKEN" ||
          val === "MODEL_API_KEY" ||
          val === "" ||
          val === undefined
        ) {
          continue;
        }
      }
      if (JSON.stringify(val) !== JSON.stringify(orig)) {
        updates[`${file}:${field.path}`] = val;
      }
    }
  }
  return updates;
}

interface GroupedFields {
  standalone: ConfigField[];
  groups: { key: string; name: string; fields: ConfigField[] }[];
}

function getGroupedSectionFields(
  fields: ConfigField[],
  data: Record<string, unknown> | null
): GroupedFields {
  const subGroupMap = new Map<string, ConfigField[]>();
  const standalone: ConfigField[] = [];

  for (const field of fields) {
    const parts = field.path.split(".");
    if (parts.length >= 5 && parts[1] === "DepartmentSystem" && parts[2] === "Departments") {
      const groupKey = parts[3];
      const list = subGroupMap.get(groupKey) ?? [];
      list.push(field);
      subGroupMap.set(groupKey, list);
    } else if (parts.length >= 3) {
      const groupKey = parts[1];
      const list = subGroupMap.get(groupKey) ?? [];
      list.push(field);
      subGroupMap.set(groupKey, list);
    } else {
      standalone.push(field);
    }
  }

  if (subGroupMap.size === 0) {
    return { standalone: fields, groups: [] };
  }

  const groups = [...subGroupMap.entries()].map(([groupKey, groupFields]) => {
    const fieldOrder = [
      "enabled",
      "name",
      "description",
      "emoji",
      "category",
      "role",
      "channelprefix",
      "defaultpriority",
      "questions",
    ];

    groupFields.sort((a, b) => {
      const aKey = a.path.split(".").pop()?.toLowerCase() || "";
      const bKey = b.path.split(".").pop()?.toLowerCase() || "";
      const aIdx = fieldOrder.indexOf(aKey);
      const bIdx = fieldOrder.indexOf(bKey);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return aKey.localeCompare(bKey);
    });

    const nameField = groupFields.find(
      (f) => f.path.toLowerCase().endsWith(".name") || f.path.toLowerCase().endsWith(".title")
    );
    let displayName = "";
    if (nameField && data) {
      const val = getByPath(data, nameField.path);
      if (typeof val === "string" && val.trim()) {
        displayName = val.trim();
      }
    }

    if (!displayName) {
      displayName = groupKey
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return {
      key: groupKey,
      name: displayName,
      fields: groupFields,
    };
  });

  return { standalone, groups };
}

export function ConfigVisualEditor({ configFile }: ConfigVisualEditorProps) {
  const { permissions: effectivePermissions, canEditConfig } = useAuth();
  const canRawYaml = hasPermission(effectivePermissions, "configs.raw_yaml");
  const readOnly = !canEditConfig(configFile);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [original, setOriginal] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<EditorMode>("visual");

  useEffect(() => {
    if (!canRawYaml && mode === "yaml") {
      setMode("visual");
    }
  }, [canRawYaml, mode]);
  const [rawYaml, setRawYaml] = useState("");
  const [rawOriginal, setRawOriginal] = useState("");
  const [searchParams] = useSearchParams();
  const [activeSectionTitle, setActiveSectionTitle] = useState<string | null>(
    () => searchParams.get("tab") || null
  );

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptKey, setNewDeptKey] = useState("");
  const [newDeptName, setNewDeptName] = useState("");

  const handleCreateDepartment = () => {
    const key = newDeptKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!key || !data) return;
    const name = newDeptName.trim() || key;
    const prefix = `Ticket.DepartmentSystem.Departments.${key}`;
    const next = { ...data };
    setByPath(next, `${prefix}.Name`, name);
    setByPath(next, `${prefix}.Description`, `Open a ${name} ticket`);
    setByPath(next, `${prefix}.Emoji`, "🎫");
    setByPath(next, `${prefix}.Category`, "CATEGORY_ID");
    setByPath(next, `${prefix}.Role`, "ROLE_ID");
    setByPath(next, `${prefix}.ChannelPrefix`, `${key}-`);
    setByPath(next, `${prefix}.DefaultPriority`, "normal");
    setByPath(next, `${prefix}.Questions`, ["What do you need assistance with?"]);
    setData(next);
    setAddDeptOpen(false);
    setNewDeptKey("");
    setNewDeptName("");
  };

  const handleDeleteDepartment = (deptKey: string) => {
    if (!data) return;
    const prefix = `Ticket.DepartmentSystem.Departments.${deptKey}`;
    const next = JSON.parse(JSON.stringify(data));
    Object.keys(next).forEach((k) => {
      if (k.startsWith(prefix) || k === prefix) {
        delete next[k];
      }
    });
    if (next.Ticket && typeof next.Ticket === "object") {
      const deptSys = (next.Ticket as any).DepartmentSystem;
      if (deptSys && typeof deptSys === "object" && deptSys.Departments && typeof deptSys.Departments === "object") {
        delete deptSys.Departments[deptKey];
      }
    }
    setData(next);
  };

  const baseSchema = getSchema(configFile);

  const effectiveSchema = useMemo(() => {
    if (!baseSchema || baseSchema === "commands" || !data) return baseSchema;
    return mergeSchemaWithData(baseSchema, data);
  }, [baseSchema, data]);

  useEffect(() => {
    if (effectiveSchema && effectiveSchema !== "commands") {
      const tabParam = searchParams.get("tab");
      if (tabParam && effectiveSchema.find(s => s.title.toLowerCase() === tabParam.toLowerCase())) {
        const found = effectiveSchema.find(s => s.title.toLowerCase() === tabParam.toLowerCase());
        if (found && found.title !== activeSectionTitle) {
          setActiveSectionTitle(found.title);
        }
      } else if (!activeSectionTitle || !effectiveSchema.find(s => s.title === activeSectionTitle)) {
        setActiveSectionTitle(effectiveSchema[0]?.title || null);
      }
    }
  }, [effectiveSchema, activeSectionTitle, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.getConfigJson(configFile);
      const raw = (res.data ?? {}) as Record<string, unknown>;
      const masked = maskSecretsInData(configFile, raw);
      setData(masked);
      setOriginal(masked);

      const rawRes = await api.getConfigRaw(configFile);
      const content = rawRes.data ?? "";
      const maskedRaw = maskConfigSecrets(content, configFile);
      setRawYaml(maskedRaw);
      setRawOriginal(maskedRaw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, [configFile]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(path: string, value: unknown) {
    setData((prev) => (prev ? setByPath(prev, path, value) : prev));
  }

  async function handleSaveYaml() {
    if (readOnly || rawYaml === rawOriginal) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await notifyConfigSave(() =>
        api.saveConfigRaw(configFile, rawYaml),
      );
      setMessage(res.message || "Config saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (readOnly || !data || !original) return;
    if (mode === "yaml") {
      await handleSaveYaml();
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (baseSchema === "commands") {
        const updates: Record<string, unknown> = {};
        for (const key of Object.keys(data)) {
          if (JSON.stringify(data[key]) !== JSON.stringify(original[key])) {
            updates[`${configFile}:${key}`] = data[key];
          }
        }
        if (Object.keys(updates).length === 0) {
          setMessage("No changes to save.");
          return;
        }
        const res = await notifyConfigSave(() =>
          api.updateConfigFields(updates),
        );
        setMessage(res.message || "");
      } else if (effectiveSchema && effectiveSchema !== "commands") {
        const updates = buildUpdates(
          configFile,
          effectiveSchema,
          data,
          original,
        );
        if (Object.keys(updates).length === 0) {
          setMessage("No changes to save.");
          return;
        }
        const res = await notifyConfigSave(() =>
          api.updateConfigFields(updates),
        );
        setMessage(res.message || "");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (baseSchema === null) {
    return (
      <Alert>
        <AlertDescription>
          No visual editor available for this file.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Failed to load"}</AlertDescription>
      </Alert>
    );
  }

  const dirtyVisual =
    original && JSON.stringify(data) !== JSON.stringify(original);
  const dirtyYaml = rawYaml !== rawOriginal;
  const dirty = mode === "yaml" ? dirtyYaml : dirtyVisual;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canRawYaml ? (
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              type="button"
              variant={mode === "visual" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setMode("visual")}
            >
              Visual
            </Button>
            <Button
              type="button"
              variant={mode === "yaml" ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setMode("yaml")}
            >
              YAML
            </Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
        {dirty ? (
          <span className="text-xs text-amber-500">Unsaved changes</span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading || saving}
        >
          Reload
        </Button>
        {!readOnly ? (
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Icon icon={FloppyDiskIcon} size={16} className="mr-1.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">View only</span>
        )}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <Icon icon={AlertCircleIcon} size={18} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert className="border-primary/30 bg-primary/10 text-primary">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {mode === "yaml" ? (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Raw YAML</CardTitle>
            <CardDescription>
              Edit the full file. Use this for nested lists (e.g. welcome buttons)
              or any option not in Visual mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[min(520px,60vh)] overflow-hidden rounded-b-xl border-t border-border p-0">
            <Editor
              height="100%"
              language="yaml"
              theme="vs-dark"
              value={rawYaml}
              onChange={(value) => setRawYaml(value || "")}
              options={{
                readOnly: readOnly,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                tabSize: 2,
              }}
            />
          </CardContent>
        </Card>
      ) : baseSchema === "commands" ? (
        <CommandsEditor
          data={data}
          onChange={(next) => setData(next)}
        />
      ) : effectiveSchema && effectiveSchema !== "commands" ? (
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <nav className="flex flex-col gap-1">
            {effectiveSchema.map((section) => (
              <button
                key={section.title}
                onClick={() => setActiveSectionTitle(section.title)}
                className={cn(
                  "text-left px-3 py-2 text-sm rounded-md transition-colors",
                  activeSectionTitle === section.title
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {section.title}
              </button>
            ))}
          </nav>
          <div className="min-w-0">
            {effectiveSchema
              .filter((section) => section.title === activeSectionTitle)
              .map((section) => (
                <Card key={section.title} className="border-border bg-card">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      {section.description ? (
                        <CardDescription>{section.description}</CardDescription>
                      ) : null}
                    </div>
                    {section.title === "Ticket Departments" && !readOnly && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAddDeptOpen(true)}
                        className="gap-1.5 text-xs h-8 shrink-0"
                      >
                        <Icon icon={Add01Icon} size={14} /> Add Department
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(() => {
                      const { standalone, groups } = getGroupedSectionFields(section.fields, data);

                      return (
                        <>
                          {standalone.length > 0 && (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {standalone.map((field) => (
                                <div
                                  key={field.path}
                                  className={
                                    field.type === "textarea" || field.type === "stringList"
                                      ? "sm:col-span-2"
                                      : ""
                                  }
                                >
                                  <ConfigFieldInput
                                    field={field}
                                    value={getByPath(data, field.path)}
                                    readOnly={readOnly}
                                    onChange={(v) => patch(field.path, v)}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {groups.map((group) => (
                            <div
                              key={group.key}
                              className="rounded-xl border border-border bg-card/60 p-4 space-y-4 shadow-sm transition-all hover:border-primary/40"
                            >
                              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base text-foreground">
                                    {group.name}
                                  </span>
                                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                    {section.title === "Ticket Departments" ? `Ticket.${group.key}` : group.key}
                                  </span>
                                </div>
                                {section.title === "Ticket Departments" && group.key !== "DepartmentSystem" && !readOnly && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteDepartment(group.key)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    title="Delete Department"
                                  >
                                    <Icon icon={Delete02Icon} size={14} />
                                  </Button>
                                )}
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {group.fields.map((field) => (
                                  <div
                                    key={field.path}
                                    className={
                                      field.type === "textarea" || field.type === "stringList"
                                        ? "sm:col-span-2"
                                        : ""
                                    }
                                  >
                                    <ConfigFieldInput
                                      field={field}
                                      value={getByPath(data, field.path)}
                                      readOnly={readOnly}
                                      onChange={(v) => patch(field.path, v)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ) : null}

      {/* Add Department Modal */}
      <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base">Add Ticket Department</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new support department for ticket creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department Key (Internal ID)</Label>
              <Input
                placeholder="billing"
                value={newDeptKey}
                onChange={(e) => setNewDeptKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                className="text-xs font-mono border-border bg-secondary/30"
              />
              <p className="text-[11px] text-muted-foreground">e.g. <code>billing</code>, <code>technical</code>, <code>sales</code></p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department Display Name</Label>
              <Input
                placeholder="Billing & Sales Support"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="text-xs border-border bg-secondary/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddDeptOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateDepartment} disabled={!newDeptKey.trim()} className="text-xs bg-primary font-semibold">
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
