import { useSearchParams, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { AddonConfigEditor } from "@/components/addons/addon-config-editor";
import { ConfigVisualEditor } from "@/components/config/config-visual-editor";
import { useAuth } from "@/context/AuthContext";
import { useAddonConfigs } from "@/hooks/use-addon-configs";
import {
  addonConfigFileParam,
  addonConfigLabel,
  parseConfigFileParam,
} from "@/lib/addon-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { firstAllowedPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const CONFIG_FILES = api.listConfigs();

const FILE_TITLES: Record<(typeof CONFIG_FILES)[number], string> = {
  supportbot: "Bot config",
  "ticket-panel": "Ticket panel",
  commands: "Commands",
  messages: "Messages",
  "supportbot-ai": "AI assistant",
};

export default function Configs() {
  const { permissions, canViewConfig } = useAuth();
  const { files: addonConfigFiles } = useAddonConfigs();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileParam = searchParams.get("file");

  const canViewAddons = canViewConfig("supportbot");

  const allowedMainFiles = useMemo(
    () => CONFIG_FILES.filter((file) => canViewConfig(file)),
    [canViewConfig],
  );

  const allowedAddonFiles = useMemo(
    () => (canViewAddons ? addonConfigFiles : []),
    [canViewAddons, addonConfigFiles],
  );

  const allFileKeys = useMemo(
    () => [
      ...allowedMainFiles,
      ...allowedAddonFiles.map((f) => addonConfigFileParam(f)),
    ],
    [allowedMainFiles, allowedAddonFiles],
  );

  const defaultFile = allFileKeys[0] ?? "";

  const [active, setActive] = useState(() => {
    if (fileParam && allFileKeys.includes(fileParam)) return fileParam;
    return defaultFile;
  });

  useEffect(() => {
    if (fileParam && allFileKeys.includes(fileParam)) {
      setActive(fileParam);
    } else if (!allFileKeys.includes(active)) {
      setActive(defaultFile);
      if (defaultFile) setSearchParams({ file: defaultFile });
    }
  }, [fileParam, allFileKeys, active, defaultFile, setSearchParams]);

  if (allFileKeys.length === 0) {
    return <Navigate to={firstAllowedPath(permissions)} replace />;
  }

  function selectFile(file: string) {
    setActive(file);
    setSearchParams({ file });
  }

  const activeParsed = parseConfigFileParam(active);
  const isAddonActive = activeParsed?.type === "addon";
  const activeAddonFilename = isAddonActive ? activeParsed.file : null;

  const pageTitle = isAddonActive
    ? addonConfigLabel(activeAddonFilename!)
    : FILE_TITLES[active as (typeof CONFIG_FILES)[number]] ?? "Configuration";

  const canEdit = isAddonActive
    ? Boolean(permissions?.configs.supportbot?.edit)
    : permissions
      ? Boolean(
          permissions.configs[active as (typeof CONFIG_FILES)[number]]?.edit,
        )
      : false;

  const fileDescription = isAddonActive
    ? activeAddonFilename
    : `${active}.yml`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {canEdit
            ? `Edit ${fileDescription} — changes apply to the running bot without restarting the dashboard.`
            : `Viewing ${fileDescription} — you do not have permission to save changes.`}
        </p>
      </div>

      <div className="mt-6">
        {isAddonActive && activeAddonFilename ? (
          <AddonConfigEditor
            key={activeAddonFilename}
            filename={activeAddonFilename}
          />
        ) : (
          <ConfigVisualEditor key={active} configFile={active} />
        )}
      </div>
    </div>
  );
}
