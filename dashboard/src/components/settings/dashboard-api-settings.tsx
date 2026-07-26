import { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";

export function DashboardApiSettings() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings.update");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    api.getConfigJson("api")
      .then((res) => {
        if (res.data) setConfig(res.data);
      })
      .catch(() => setMessage("Failed to load API config"))
      .finally(() => setLoading(false));
  }, []);

  async function saveConfig() {
    if (!canEdit || !config) return;
    setSaving(true);
    setMessage("");
    try {
      // Create a flat update payload for updateConfigFields
      const updates = {
        "api:API.Port": config.API?.Port,
        "api:API.EmeraldAPIKey": config.API?.EmeraldAPIKey,
        "api:API.TrustProxy": config.API?.TrustProxy,
        "api:API.OAuth.Enabled": config.API?.OAuth?.Enabled,
        "api:API.OAuth.ClientId": config.API?.OAuth?.ClientId,
        "api:API.OAuth.ClientSecret": config.API?.OAuth?.ClientSecret,
        "api:API.OAuth.RedirectUri": config.API?.OAuth?.RedirectUri,
      };

      await api.updateConfigFields(updates);
      setMessage("API settings saved and backend restarted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-secondary/20 rounded-md" />;
  if (!config) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">Core API Settings</p>
          <p className="text-xs text-muted-foreground">
            Configure the internal API that powers this dashboard.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>API Port</Label>
            <Input
              type="number"
              value={config.API?.Port || ""}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, API: { ...config.API, Port: parseInt(e.target.value) || 3000 }})}
              className="border-border bg-secondary/30"
            />
          </div>
          <div className="space-y-2">
            <Label>Emerald API Key</Label>
            <Input
              type="password"
              value={config.API?.EmeraldAPIKey || ""}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, API: { ...config.API, EmeraldAPIKey: e.target.value }})}
              className="border-border bg-secondary/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Switch
            checked={config.API?.TrustProxy || false}
            disabled={!canEdit}
            onCheckedChange={(c) => setConfig({ ...config, API: { ...config.API, TrustProxy: c }})}
          />
          <Label className="text-sm">Trust Proxy (Enable if using Cloudflare/Nginx)</Label>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <p className="text-sm font-medium">OAuth Authentication</p>
          <p className="text-xs text-muted-foreground">
            Discord application credentials for dashboard login.
          </p>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Switch
            checked={config.API?.OAuth?.Enabled || false}
            disabled={!canEdit}
            onCheckedChange={(c) => setConfig({ ...config, API: { ...config.API, OAuth: { ...config.API?.OAuth, Enabled: c } }})}
          />
          <Label className="text-sm">Enable OAuth</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              value={config.API?.OAuth?.ClientId || ""}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, API: { ...config.API, OAuth: { ...config.API?.OAuth, ClientId: e.target.value } }})}
              className="border-border bg-secondary/30"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={config.API?.OAuth?.ClientSecret || ""}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, API: { ...config.API, OAuth: { ...config.API?.OAuth, ClientSecret: e.target.value } }})}
              className="border-border bg-secondary/30"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Redirect URI</Label>
            <Input
              value={config.API?.OAuth?.RedirectUri || ""}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, API: { ...config.API, OAuth: { ...config.API?.OAuth, RedirectUri: e.target.value } }})}
              className="border-border bg-secondary/30"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Must match the OAuth2 callback URL registered in the Discord Developer Portal exactly.
            </p>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="flex items-center gap-2 border-t border-border pt-6">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void saveConfig()}
          >
            {saving ? "Saving…" : "Save API Config"}
          </Button>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
