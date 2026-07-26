import { useEffect, useRef, useState } from "react";
import { ImageUpload01Icon } from "@hugeicons/core-free-icons";
import { api } from "@/api/client";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranding } from "@/context/BrandingContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

interface DashboardBrandingSettingsProps {
  canEdit: boolean;
}

export function DashboardDangerZone({ canEdit }: DashboardBrandingSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  async function resetDashboard() {
    if (!canEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await api.resetDashboard();
      setMessage(res.message || "Dashboard reset successfully.");
      setTimeout(() => {
        window.location.href = "/setup";
      }, 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed");
      setSaving(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reset the dashboard to factory settings. This clears the configuration and returns you to the initial setup screen.
      </p>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive">
            Reset Dashboard
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will reset the dashboard to setup mode.
              You will need to reconnect the Discord OAuth and reconfigure the dashboard owners.
            </DialogDescription>
          </DialogHeader>
          {message && <p className="text-sm font-medium text-destructive">{message}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void resetDashboard()} disabled={saving}>
              {saving ? "Resetting..." : "Yes, reset dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DashboardBrandingSettings({ canEdit }: DashboardBrandingSettingsProps) {
  const { branding, setBrandingLocal } = useBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(branding.title);
  const [pageTitle, setPageTitle] = useState(branding.pageTitle);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTitle(branding.title);
    setPageTitle(branding.pageTitle);
  }, [branding.title, branding.pageTitle]);

  const faviconPreview =
    branding.hasFavicon && branding.faviconUrl
      ? `${branding.faviconUrl}${branding.updatedAt ? `?v=${branding.updatedAt}` : ""}`
      : null;

  async function saveText() {
    if (!canEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await api.updateBranding({ title, pageTitle });
      if (res.data) setBrandingLocal(res.data);
      setMessage(res.message || "Branding saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onFaviconSelected(file: File | null) {
    if (!canEdit || !file) return;
    setUploading(true);
    setMessage("");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await api.uploadBrandingFavicon(dataUrl);
      if (res.data) setBrandingLocal(res.data);
      setMessage(res.message || "Favicon uploaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeFavicon() {
    if (!canEdit) return;
    setUploading(true);
    setMessage("");
    try {
      const res = await api.removeBrandingFavicon();
      if (res.data) setBrandingLocal(res.data);
      setMessage(res.message || "Favicon removed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(false);
    }
  }

  const textDirty =
    title.trim() !== branding.title || pageTitle.trim() !== branding.pageTitle;

  return (
    <div className="space-y-8">
      {/* Text Branding */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">Branding Text</p>
          <p className="text-xs text-muted-foreground">
            Sidebar title and browser tab title — saved on the server for everyone using this dashboard.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand-title">Sidebar title</Label>
            <Input
              id="brand-title"
              value={title}
              disabled={!canEdit}
              maxLength={64}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border bg-secondary/30"
              placeholder="SupportBot"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-page-title">Browser tab title</Label>
            <Input
              id="brand-page-title"
              value={pageTitle}
              disabled={!canEdit}
              maxLength={80}
              onChange={(e) => setPageTitle(e.target.value)}
              className="border-border bg-secondary/30"
              placeholder="SupportBot Dashboard"
            />
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={saving || !textDirty}
              onClick={() => void saveText()}
            >
              {saving ? "Saving…" : "Save titles"}
            </Button>
            {message && textDirty ? (
              <span className="text-xs text-muted-foreground">{message}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Favicon Branding */}
      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <p className="text-sm font-medium">Favicon</p>
          <p className="text-xs text-muted-foreground">
            PNG, ICO, SVG, JPEG, or WebP — max 512 KB. Shown in the browser tab and beside the sidebar title.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/30">
            {faviconPreview ? (
              <img
                src={faviconPreview}
                alt="Favicon preview"
                className="size-full object-contain p-2"
              />
            ) : (
              <Icon
                icon={ImageUpload01Icon}
                size={24}
                className="text-muted-foreground/50"
              />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,.ico"
            className="hidden"
            disabled={!canEdit || uploading}
            onChange={(e) => void onFaviconSelected(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-col gap-2">
            {canEdit ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload Favicon"}
                </Button>
                {branding.hasFavicon ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={uploading}
                    onClick={() => void removeFavicon()}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">View only</span>
            )}
            {!textDirty && message ? (
              <span className="text-xs text-muted-foreground">{message}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
