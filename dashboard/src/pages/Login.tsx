import { useMemo } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured:
    "Discord OAuth is not configured. Complete setup at /setup first.",
  not_allowed:
    "Your Discord account is not allowed. Ask an owner to add you under Users, or add your ID to OwnerUserIds in Configs/api.yml.",
  invalid_state: "Login session expired. Please try again.",
  missing_code: "Discord did not return an authorization code. Please try again.",
  oauth_failed: "Could not complete Discord sign-in. Check your OAuth settings.",
  access_denied: "You cancelled Discord sign-in.",
};

function errorMessage(code: string | null): string {
  if (!code) return "";
  return ERROR_MESSAGES[code] || "Sign-in failed. Please try again.";
}

export default function Login() {
  const { branding } = useBranding();
  const { isAuthenticated, loading, loginWithDiscord } = useAuth();
  const [searchParams] = useSearchParams();
  const error = useMemo(
    () => errorMessage(searchParams.get("error")),
    [searchParams],
  );

  if (!loading && isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-[#0c0c10] p-4 overflow-hidden">
      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/30 p-2 shadow-2xl backdrop-blur-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
        <CardHeader className="space-y-6 pt-10 pb-4 text-center">
          <div className="mx-auto flex size-28 items-center justify-center overflow-hidden rounded-3xl bg-white/5 p-4 shadow-inner ring-1 ring-white/10 transition-transform duration-500 hover:scale-105">
            <img
              src="/logo.png"
              alt="SupportBot Logo"
              className="h-full w-full object-contain drop-shadow-xl"
            />
          </div>
          <div>
            <CardTitle className="bg-gradient-to-br from-white to-white/50 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              {branding.title || "SupportBot"}
            </CardTitle>
            <CardDescription className="mt-2 text-base font-medium text-white/50">
              Sign in to your dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-white/50">
              Securely authenticate using your Discord account.
            </p>
            <p className="text-xs text-white/30">
              Credentials are configured in <code className="rounded bg-white/5 px-1 py-0.5 text-white/40">Configs/api.yml</code>
            </p>
          </div>
          {error ? (
            <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-200 backdrop-blur-md">
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            className="group relative w-full overflow-hidden rounded-2xl bg-primary px-8 py-6 text-base font-bold text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] active:scale-95"
            disabled={loading}
            onClick={loginWithDiscord}
          >
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]"></div>
            <span className="relative flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14c2.64-27.38-4.51-51.11-19.32-72.15ZM42.68,68.22c-5.28,0-9.66-4.9-9.66-10.89s4.29-10.89,9.66-10.89c5.41,0,9.75,4.9,9.66,10.89C52.34,63.32,48.09,68.22,42.68,68.22Zm41.76,0c-5.28,0-9.66-4.9-9.66-10.89s4.29-10.89,9.66-10.89c5.41,0,9.75,4.9,9.66,10.89C84.44,63.32,80.19,68.22,84.44,68.22Z"/>
              </svg>
              {loading ? "Authenticating..." : "Continue with Discord"}
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
