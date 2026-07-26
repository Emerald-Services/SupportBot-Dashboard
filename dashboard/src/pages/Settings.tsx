import { useCallback, useEffect, useState } from "react";
import {
  Download04Icon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { api, type UpdateCheckResult } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
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
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_ACCENT_HEX,
  getStoredAccentHex,
  resetAccentTheme,
  saveAccentTheme,
} from "@/lib/accent-theme";
import { normalizeHex } from "@/lib/normalize-hex";
import { DashboardBrandingSettings } from "@/components/settings/dashboard-branding-settings";
import { DashboardApiSettings } from "@/components/settings/dashboard-api-settings";

export default function Settings() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("settings.update");
  const [checks, setChecks] = useState<UpdateCheckResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accentHex, setAccentHex] = useState(
    () => getStoredAccentHex() ?? DEFAULT_ACCENT_HEX,
  );
  const [accentSaved, setAccentSaved] = useState("");

  const loadCheck = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.checkForUpdates();
      if (res.data) setChecks(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check for updates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCheck();
  }, [loadCheck]);

  async function handleUpdate(check: UpdateCheckResult) {
    if (!check.updateAvailable) return;
    setUpdating(true);
    setError("");
    setNotice("");
    try {
      const res = await api.runUpdate(check.id, check.latest, check.zipUrl);
      setNotice(
        res.message ||
          "Update installed. Restart your server (stop and run npm start again) to finish applying changes.",
      );
      await loadCheck();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Application updates and maintenance — config files are edited under each module in the sidebar.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Dashboard appearance</CardTitle>
          <CardDescription>
            Customise branding for all users, and pick an accent colour for this
            browser only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DashboardBrandingSettings canEdit={canUpdate} />

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">Accent colour</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Buttons, links, and highlights — saved in this browser only.
            </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="accent-colour">Accent colour</Label>
              <div className="flex items-center gap-2">
                <ColorPicker
                  value={accentHex}
                  onChange={(hex) => {
                    setAccentHex(hex);
                    saveAccentTheme(hex);
                    setAccentSaved("Accent updated.");
                  }}
                />
                <Input
                  id="accent-colour"
                  value={accentHex}
                  onChange={(e) => setAccentHex(e.target.value)}
                  onBlur={() => {
                    const next = normalizeHex(accentHex, DEFAULT_ACCENT_HEX);
                    setAccentHex(next);
                    saveAccentTheme(next);
                    setAccentSaved("Accent updated.");
                  }}
                  className="w-32 border-border bg-secondary/30 font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetAccentTheme();
                setAccentHex(DEFAULT_ACCENT_HEX);
                setAccentSaved("Reset to default purple.");
              }}
            >
              Reset to default
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
            >
              Primary button
            </span>
            <span className="rounded-md bg-primary/15 px-3 py-1.5 text-primary">
              Highlight
            </span>
            <span className="rounded-md bg-accent px-3 py-1.5 text-accent-foreground">
              Accent surface
            </span>
          </div>
          {accentSaved ? (
            <p className="text-xs text-muted-foreground">{accentSaved}</p>
          ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">API Configuration</CardTitle>
          <CardDescription>
            Configure the internal API settings, Emerald API key, and OAuth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardApiSettings />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Software updates</CardTitle>
          <CardDescription>
            Manage updates for the bot and dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : checks && checks.length > 0 ? (
            <div className="space-y-4">
              {checks.map((check) => (
                <div key={check.id} className="space-y-3 rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      <a
                        href={check.repository}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {check.name}
                      </a>{" "}
                      ({check.branch} branch)
                    </p>
                    <div className="flex gap-x-4 text-sm">
                      <p>
                        <span className="text-muted-foreground">Installed: </span>
                        <span className="font-mono font-medium">v{check.current}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Latest: </span>
                        <span className="font-mono font-medium">v{check.latest}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {check.updateAvailable ? (
                      <p className="text-sm text-amber-500">
                        A newer version is available. Update downloads files while keeping your Configs and Data.
                      </p>
                    ) : (
                      <p className="text-sm text-emerald-500">You are on the latest release.</p>
                    )}

                    {check.updateAvailable && canUpdate ? (
                      <Button type="button" size="sm" onClick={() => void handleUpdate(check)} disabled={updating}>
                        {updating ? (
                          <Icon
                            icon={Loading03Icon}
                            size={16}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <Icon icon={Download04Icon} size={16} className="mr-2" />
                        )}
                        {updating ? "Installing…" : "Update now"}
                      </Button>
                    ) : null}
                    
                    {check.updateAvailable && !canUpdate ? (
                      <p className="text-xs text-muted-foreground">
                        You cannot install updates with your role.
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {notice ? (
            <Alert>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={loadCheck}
              disabled={loading || updating}
            >
              <Icon icon={RefreshIcon} size={16} className="mr-2" />
              Check again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
