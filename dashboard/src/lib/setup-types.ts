export interface SetupStep {
  id: string;
  title: string;
  description: string;
  complete: boolean;
}

export interface SetupStatus {
  complete: boolean;
  steps: SetupStep[];
  suggestedRedirectUri: string;
  oauthCallbackPath: string;
}

export interface FieldValidationResult {
  ok: boolean;
  error?: string;
  warning?: string;
  bot?: { id: string; username: string };
  applicationId?: string;
  users?: { id: string; username: string; globalName: string | null }[];
  redirectUri?: string;
  ownerUserIds?: string[];
}

export interface SetupValidateResponse {
  ok: boolean;
  results: Record<string, FieldValidationResult>;
}

export interface SetupFormValues {
  botToken: string;
  dbDriver: "sqlite" | "mysql";
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPassword: string;
  dbDatabase: string;
  secretKey: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  ownerUserIds: string;
  emeraldApiKey: string;
}
