import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BotTokenStep,
  OAuthStep,
  OwnersStep,
  RedirectStep,
  SecretKeyStep,
  SETUP_STEPS,
  SetupCompleteScreen,
  SetupNav,
  SetupProgress,
  SetupStepCard,
  SetupWizardShell,
  EmeraldApiKeyStep,
  type SetupStepId,
} from "@/components/setup/setup-wizard";
import { useBranding } from "@/context/BrandingContext";
import { useSetup } from "@/context/SetupContext";
import type { FieldValidationResult, SetupFormValues } from "@/lib/setup-types";

function generateSecret() {
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "");
  return a + b;
}

function parseOwnerIds(raw: string) {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function validationKeyForStep(id: SetupStepId): string {
  if (id === "oauth") return "oauth";
  if (id === "owners") return "owners";
  if (id === "emeraldApi") return "emeraldApi";
  return id;
}

export default function Setup() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { loading, error: statusError, refresh, status } = useSetup();

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<SetupFormValues>({
    botToken: "",
    secretKey: "",
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    ownerUserIds: "",
    emeraldApiKey: "",
  });
  const [validation, setValidation] = useState<Record<string, FieldValidationResult>>({});
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [finished, setFinished] = useState(false);

  const currentStep = SETUP_STEPS[stepIndex];

  useEffect(() => {
    if (status?.suggestedRedirectUri && !values.redirectUri) {
      setValues((v) => ({ ...v, redirectUri: status.suggestedRedirectUri }));
    }
  }, [status?.suggestedRedirectUri, values.redirectUri]);

  const payload = useMemo(
    () => ({
      botToken: values.botToken,
      secretKey: values.secretKey,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      redirectUri: values.redirectUri,
      ownerUserIds: parseOwnerIds(values.ownerUserIds),
      emeraldApiKey: values.emeraldApiKey,
    }),
    [values],
  );

  async function runValidation() {
    setValidating(true);
    setSaveError("");
    try {
      const res = await api.validateSetup(payload);
      setValidation((prev) => ({ ...prev, ...res.data?.results }));
      return res.data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Validation failed");
      return null;
    } finally {
      setValidating(false);
    }
  }

  async function validateCurrentStep() {
    const key = validationKeyForStep(currentStep.id);
    const data = await runValidation();
    return Boolean(data?.results?.[key]?.ok);
  }

  async function handleNext() {
    const key = validationKeyForStep(currentStep.id);
    const existing = validation[key];
    if (!existing?.ok) {
      const ok = await validateCurrentStep();
      if (!ok) return;
    }
    setStepIndex((i) => Math.min(i + 1, SETUP_STEPS.length - 1));
  }

  async function finishSetup() {
    setSaving(true);
    setSaveError("");
    try {
      const check = await runValidation();
      if (!check?.ok) {
        setSaveError("Fix the steps marked with errors before finishing.");
        return;
      }
      await api.completeSetup(payload);
      setFinished(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save setup");
    } finally {
      setSaving(false);
    }
  }

  function renderStep() {
    const common = {
      values,
      setValues,
      validation,
      validating,
    };

    switch (currentStep.id) {
      case "botToken":
        return (
          <BotTokenStep
            {...common}
            onValidate={() => void validateCurrentStep()}
          />
        );
      case "secretKey":
        return (
          <SecretKeyStep
            {...common}
            onGenerate={() => setValues((v) => ({ ...v, secretKey: generateSecret() }))}
            onValidate={() => void validateCurrentStep()}
          />
        );
      case "oauth":
        return (
          <OAuthStep {...common} onValidate={() => void validateCurrentStep()} />
        );
      case "redirectUri":
        return <RedirectStep values={values} setValues={setValues} validation={validation} />;
      case "owners":
        return (
          <OwnersStep {...common} onValidate={() => void validateCurrentStep()} />
        );
      case "emeraldApi":
        return (
          <EmeraldApiKeyStep {...common} onValidate={() => void validateCurrentStep()} />
        );
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-background px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-14 w-64" />
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <Skeleton className="hidden h-80 lg:block" />
            <Skeleton className="h-[520px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SetupWizardShell
      brandingTitle={branding.title}
      faviconUrl={branding.faviconUrl}
      faviconVersion={branding.updatedAt ?? undefined}
      hasFavicon={branding.hasFavicon}
    >
      {statusError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{statusError}</AlertDescription>
        </Alert>
      ) : null}

      {saveError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      ) : null}

      {finished ? (
        <SetupCompleteScreen
          onContinue={async () => {
            await refresh();
            navigate("/login", { replace: true });
          }}
        />
      ) : (
      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <SetupProgress currentIndex={stepIndex} validation={validation} />

        <SetupStepCard
          step={currentStep}
          footer={
            <SetupNav
              currentIndex={stepIndex}
              validating={validating}
              saving={saving}
              onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
              onNext={() => void handleNext()}
              onFinish={() => void finishSetup()}
            />
          }
        >
          {renderStep()}
        </SetupStepCard>
      </div>
      )}
    </SetupWizardShell>
  );
}
