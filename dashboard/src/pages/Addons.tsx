import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download04Icon,
  Loading03Icon,
  PackageIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { api, type CatalogAddon } from "@/api/client";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { addonConfigFileParam } from "@/lib/addon-config";
import { cn } from "@/lib/utils";

export default function Addons() {
  const { hasPermission } = useAuth();
  const canInstall = hasPermission("settings.update");
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogAddon[]>([]);
  const [repository, setRepository] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const catalogRes = await api.getAddonsCatalog();
      if (catalogRes.data) {
        setCatalog(catalogRes.data.addons);
        setRepository(catalogRes.data.repository);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load addons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInstall(addon: CatalogAddon) {
    if (!canInstall) return;
    setInstalling(addon.id);
    setNotice("");
    setError("");
    try {
      const res = await api.installAddon(addon.id);
      setNotice(res.message || `${addon.name} installed.`);
      await load();

      const configFile = addon.configFiles[0];
      if (configFile) {
        navigate(`/configs?file=${addonConfigFileParam(configFile)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Addons</h1>
          <p className="text-muted-foreground">
            Install addons from the{" "}
            <a
              href={repository || "https://emeraldsrv.dev"}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Emerald Services Marketplace
            </a>
            . Enable addons under{" "}
            <Link
              to="/configs?file=supportbot"
              className="text-primary underline-offset-4 hover:underline"
            >
              Bot config → General → Addons
            </Link>
            . Installed addon configs appear in the left sidebar under{" "}
            <strong className="font-medium text-foreground">Addons</strong>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <Icon
            icon={Loading03Icon}
            size={16}
            className={cn("mr-1.5", loading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert className="border-primary/30 bg-primary/10 text-primary">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Marketplace
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((addon) => (
              <Card key={addon.id} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon
                        icon={PackageIcon}
                        size={20}
                        className="text-primary"
                      />
                      {addon.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="shrink-0 uppercase tracking-widest text-[10px]">
                        {addon.price === 0 || !addon.price ? "Free" : `$${addon.price}`}
                      </Badge>
                      {addon.installed ? (
                        <Badge variant="secondary" className="shrink-0 gap-1">
                          <Icon icon={Tick02Icon} size={14} />
                          Installed
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription>{addon.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {addon.is_external ? (
                    <p>Available on: <span className="font-medium text-foreground">{addon.external_store || "External Store"}</span></p>
                  ) : null}
                  {addon.configFiles && addon.configFiles.length > 0 ? (
                    <p>
                      Config:{" "}
                      {addon.configFiles.map((file, i) => (
                        <span key={file}>
                          {i > 0 ? ", " : null}
                          <Link
                            to={`/configs?file=${addonConfigFileParam(file)}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {file}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  {addon.is_external ? (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={addon.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Store
                      </a>
                    </Button>
                  ) : null}
                  {addon.installed && addon.configFiles && addon.configFiles[0] ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        to={`/configs?file=${addonConfigFileParam(addon.configFiles[0])}`}
                      >
                        Edit config
                      </Link>
                    </Button>
                  ) : null}
                  {addon.installed ? (
                    <Button size="sm" disabled variant="secondary">
                      Installed
                    </Button>
                  ) : !addon.is_external ? (
                    <Button
                      size="sm"
                      disabled={!canInstall || installing === addon.id}
                      onClick={() => handleInstall(addon)}
                    >
                      <Icon icon={Download04Icon} size={14} className="mr-1" />
                      {installing === addon.id ? "Installing…" : "Install"}
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
