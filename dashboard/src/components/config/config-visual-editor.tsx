import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircleIcon, FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { api, maskConfigSecrets } from "@/api/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { getSchema, type ConfigSchema } from "@/lib/config-schemas";
import { getByPath, setByPath } from "@/lib/config-utils";
import { mergeSchemaWithData } from "@/lib/merge-config-schema";
import { useAuth } from "@/context/AuthContext";
import { notifyConfigSave } from "@/lib/notify-config-save";
import { Textarea } from "@/components/ui/textarea";
import Editor from "@monaco-editor/react";
import { ConfigFieldInput } from "./config-field";
import { CommandsEditor } from "./commands-editor";

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

export function ConfigVisualEditor({ configFile }: ConfigVisualEditorProps) {
  const { canEditConfig } = useAuth();
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
  const [rawYaml, setRawYaml] = useState("");
  const [rawOriginal, setRawOriginal] = useState("");

  const baseSchema = getSchema(configFile);

  const effectiveSchema = useMemo(() => {
    if (!baseSchema || baseSchema === "commands" || !data) return baseSchema;
    return mergeSchemaWithData(baseSchema, data);
  }, [baseSchema, data]);

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
        effectiveSchema.map((section) => (
          <Card key={section.title} className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description ? (
                <CardDescription>{section.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
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
            </CardContent>
          </Card>
        ))
      ) : null}
    </div>
  );
}
