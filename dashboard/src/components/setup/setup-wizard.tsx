import type { IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BotIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Key01Icon,
  Link01Icon,
  SecurityLockIcon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldValidationResult, SetupFormValues } from "@/lib/setup-types";
import { cn } from "@/lib/utils";

export const SETUP_STEP_IDS = [
  "botToken",
  "secretKey",
  "oauth",
  "redirectUri",
  "owners",
  "emeraldApi",
] as const;

export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export const SETUP_STEPS: {
  id: SetupStepId;
  title: string;
  subtitle: string;
  icon: IconSvgElement;
}[] = [
  {
    id: "botToken",
    title: "Bot token",
    subtitle: "Connect your Discord bot",
    icon: BotIcon,
  },
  {
    id: "secretKey",
    title: "Session secret",
    subtitle: "Secure dashboard logins",
    icon: SecurityLockIcon,
  },
  {
    id: "oauth",
    title: "Discord OAuth",
    subtitle: "Sign in with Discord",
    icon: Key01Icon,
  },
  {
    id: "redirectUri",
    title: "Redirect URL",
    subtitle: "OAuth callback address",
    icon: Link01Icon,
  },
  {
    id: "owners",
    title: "Dashboard owners",
    subtitle: "Who can access this panel",
    icon: UserMultiple02Icon,
  },
  {
    id: "emeraldApi",
    title: "Emerald API",
    subtitle: "One-click addons",
    icon: Key01Icon,
  },
];

function validationKeyForStep(id: SetupStepId): string {
  if (id === "oauth") return "oauth";
  if (id === "owners") return "owners";
  return id;
}

export function SetupWizardShell({
  brandingTitle,
  faviconUrl,
  faviconVersion,
  hasFavicon,
  children,
}: {
  brandingTitle: string;
  faviconUrl?: string | null;
  faviconVersion?: number;
  hasFavicon: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-center gap-4">
          {hasFavicon && faviconUrl ? (
            <img
              src={`${faviconUrl}${faviconVersion ? `?v=${faviconVersion}` : ""}`}
              alt=""
              className="size-12 rounded-2xl border border-border object-contain"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-primary text-primary-foreground">
              <Icon icon={BotIcon} size={24} />
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              First-time setup
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {brandingTitle}
            </h1>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function SetupProgress({
  currentIndex,
  validation,
}: {
  currentIndex: number;
  validation: Record<string, FieldValidationResult>;
}) {
  const progress = ((currentIndex + 1) / SETUP_STEPS.length) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentIndex + 1} of {SETUP_STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <nav className="hidden space-y-1 md:block" aria-label="Setup steps">
        {SETUP_STEPS.map((step, index) => {
          const key = validationKeyForStep(step.id);
          const verified = validation[key]?.ok;
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                isCurrent && "border-primary bg-secondary",
                !isCurrent && "border-transparent",
                isPast && !isCurrent && "opacity-80",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  verified
                    ? "bg-emerald-500/15 text-emerald-500"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {verified ? (
                  <Icon icon={CheckmarkCircle02Icon} size={18} />
                ) : (
                  <Icon icon={step.icon} size={18} />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium leading-none",
                    isCurrent && "text-foreground",
                    !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{step.subtitle}</p>
              </div>
            </div>
          );
        })}
      </nav>

      <p className="hidden text-xs leading-relaxed text-muted-foreground md:block">
        Each step can be tested with Discord before you continue. You can move back
        anytime to change a value.
      </p>
    </div>
  );
}

export function SetupStepCard({
  step,
  children,
  footer,
}: {
  step: (typeof SETUP_STEPS)[number];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[min(520px,70vh)] flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-6 py-5 md:px-8">
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon icon={step.icon} size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          </div>
        </div>
        <div className="hidden md:block">
          <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{step.subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 py-6 md:px-8">{children}</div>
      {footer ? (
        <div className="border-t border-border px-6 py-4 md:px-8">{footer}</div>
      ) : null}
    </div>
  );
}

export function ValidationBanner({
  result,
}: {
  result?: FieldValidationResult;
}) {
  if (!result) return null;

  if (result.ok) {
    return (
      <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <AlertDescription className="space-y-2">
          {result.bot ? (
            <p>
              Connected as <strong>@{result.bot.username}</strong>
              {result.applicationId ? (
                <span className="text-emerald-600/80 dark:text-emerald-400/80">
                  {" "}
                  · App ID {result.applicationId}
                </span>
              ) : null}
            </p>
          ) : null}
          {result.users?.length ? (
            <ul className="space-y-1">
              {result.users.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                  {u.globalName || u.username}
                  <span className="font-mono text-xs opacity-80">{u.id}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {!result.bot && !result.users?.length ? (
            <p>{result.warning || "Verified successfully."}</p>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>{result.error}</AlertDescription>
    </Alert>
  );
}

export function BotTokenStep({
  values,
  setValues,
  validation,
  validating,
  onValidate,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
  validating: boolean;
  onValidate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Open the{" "}
        <a
          href="https://discord.com/developers/applications"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Discord Developer Portal
        </a>
        , select your application, go to <strong>Bot</strong>, and reset or copy
        the token.
      </p>
      <div className="space-y-2">
        <Label htmlFor="botToken">Bot token</Label>
        <Input
          id="botToken"
          type="password"
          autoComplete="off"
          value={values.botToken}
          onChange={(e) => setValues({ ...values, botToken: e.target.value })}
          placeholder="MTI…"
          className="h-11 font-mono text-sm"
        />
      </div>
      <ValidationBanner result={validation.botToken} />
      <div className="mt-auto">
        <Button
          type="button"
          variant="secondary"
          disabled={validating || !values.botToken}
          onClick={onValidate}
        >
          {validating ? "Checking with Discord…" : "Verify bot token"}
        </Button>
      </div>
    </div>
  );
}

export function SecretKeyStep({
  values,
  setValues,
  validation,
  validating,
  onValidate,
  onGenerate,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
  validating: boolean;
  onValidate: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        This random string signs your login cookies. Store it like a password — do
        not commit it to public repos.
      </p>
      <div className="space-y-2">
        <Label htmlFor="secretKey">Session secret</Label>
        <Input
          id="secretKey"
          type="password"
          autoComplete="off"
          value={values.secretKey}
          onChange={(e) => setValues({ ...values, secretKey: e.target.value })}
          className="h-11 font-mono text-sm"
        />
      </div>
      <ValidationBanner result={validation.secretKey} />
      <div className="mt-auto flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onGenerate}>
          Generate secure secret
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={validating || !values.secretKey}
          onClick={onValidate}
        >
          {validating ? "Checking…" : "Validate"}
        </Button>
      </div>
    </div>
  );
}

export function OAuthStep({
  values,
  setValues,
  validation,
  validating,
  onValidate,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
  validating: boolean;
  onValidate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Use the <strong>same application</strong> as your bot. Under OAuth2, copy
        the Client ID and Client Secret.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={values.clientId}
            onChange={(e) => setValues({ ...values, clientId: e.target.value })}
            className="h-11 font-mono text-sm"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientSecret">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            autoComplete="off"
            value={values.clientSecret}
            onChange={(e) =>
              setValues({ ...values, clientSecret: e.target.value })
            }
            className="h-11 font-mono text-sm"
          />
        </div>
      </div>
      <ValidationBanner result={validation.oauth} />
      <div className="mt-auto">
        <Button
          type="button"
          variant="secondary"
          disabled={validating || !values.clientId || !values.clientSecret}
          onClick={onValidate}
        >
          {validating ? "Checking with Discord…" : "Verify OAuth credentials"}
        </Button>
      </div>
    </div>
  );
}

export function RedirectStep({
  values,
  setValues,
  validation,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
}) {
  async function copyUri() {
    if (!values.redirectUri) return;
    try {
      await navigator.clipboard.writeText(values.redirectUri);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Add this exact URL under <strong>OAuth2 → Redirects</strong> in the
        Developer Portal. It must match character-for-character.
      </p>
      <div className="space-y-2">
        <Label htmlFor="redirectUri">Redirect URI</Label>
        <div className="flex gap-2">
          <Input
            id="redirectUri"
            value={values.redirectUri}
            onChange={(e) =>
              setValues({ ...values, redirectUri: e.target.value })
            }
            className="h-11 flex-1 font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => void copyUri()}
            title="Copy URL"
          >
            <Icon icon={Copy01Icon} size={18} />
          </Button>
        </div>
      </div>
      {validation.redirectUri && !validation.redirectUri.ok ? (
        <ValidationBanner result={validation.redirectUri} />
      ) : (
        <Alert className="border-border bg-secondary">
          <AlertDescription className="text-sm text-muted-foreground">
            We pre-filled this from your current dashboard URL. If you access the
            panel from a different domain later, update this and add the new URL in
            Discord too.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function OwnersStep({
  values,
  setValues,
  validation,
  validating,
  onValidate,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
  validating: boolean;
  onValidate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Enable <strong>Developer Mode</strong> in Discord (Settings → Advanced),
        then right-click your profile and <strong>Copy User ID</strong>. Add one ID
        per line.
      </p>
      <div className="space-y-2">
        <Label htmlFor="owners">Owner user IDs</Label>
        <Textarea
          id="owners"
          value={values.ownerUserIds}
          onChange={(e) => setValues({ ...values, ownerUserIds: e.target.value })}
          placeholder={"829112572816130058\n987654321098765432"}
          className="min-h-[120px] font-mono text-sm"
        />
      </div>
      <ValidationBanner result={validation.owners} />
      <div className="mt-auto">
        <Button
          type="button"
          variant="secondary"
          disabled={validating || !values.ownerUserIds.trim()}
          onClick={onValidate}
        >
          {validating ? "Checking with Discord…" : "Verify owner IDs"}
        </Button>
      </div>
    </div>
  );
}

export function SetupCompleteScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-8">
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center md:px-10">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon icon={CheckmarkCircle02Icon} size={40} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Setup complete</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Your configuration has been saved. Restart the server for changes to take
          effect — stop the running process, then start it again (for example{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
            npm start
          </code>
          ).
        </p>
        <Alert className="mt-6 text-left">
          <AlertDescription>
            After restarting, sign in with Discord to open the dashboard.
          </AlertDescription>
        </Alert>
        <Button type="button" size="lg" className="mt-8 min-w-[220px]" onClick={onContinue}>
          Continue to sign in
        </Button>
      </div>
    </div>
  );
}

export function SetupNav({
  currentIndex,
  validating,
  saving,
  onBack,
  onNext,
  onFinish,
}: {
  currentIndex: number;
  validating: boolean;
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const isLast = currentIndex === SETUP_STEPS.length - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        disabled={currentIndex === 0 || saving}
        onClick={onBack}
      >
        <Icon icon={ArrowLeft01Icon} size={18} className="mr-1" />
        Back
      </Button>
      <div className="flex flex-1 justify-end gap-2">
        {isLast ? (
          <Button
            type="button"
            size="lg"
            disabled={saving || validating}
            onClick={onFinish}
            className="min-w-[200px]"
          >
            {saving ? "Saving…" : "Finish setup"}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={validating || saving}
            onClick={onNext}
          >
            Continue
            <Icon icon={ArrowRight01Icon} size={18} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmeraldApiKeyStep({
  values,
  setValues,
  validation,
  validating,
  onValidate,
}: {
  values: SetupFormValues;
  setValues: (v: SetupFormValues) => void;
  validation: Record<string, FieldValidationResult>;
  validating: boolean;
  onValidate: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        An Emerald Services API key is required to use the one-click addon installer in the dashboard. You can get yours from the{" "}
        <a
          href="https://emeraldsrv.dev"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Emerald Services Marketplace
        </a>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="emeraldApiKey">Emerald API key</Label>
        <Input
          id="emeraldApiKey"
          type="password"
          autoComplete="off"
          value={values.emeraldApiKey}
          onChange={(e) => setValues({ ...values, emeraldApiKey: e.target.value })}
          placeholder="em_..."
          className="h-11 font-mono text-sm"
        />
      </div>
      <ValidationBanner result={validation.emeraldApi} />
      <div className="mt-auto">
        <Button
          type="button"
          variant="secondary"
          disabled={validating || !values.emeraldApiKey}
          onClick={onValidate}
        >
          {validating ? "Checking…" : "Save key"}
        </Button>
      </div>
    </div>
  );
}
