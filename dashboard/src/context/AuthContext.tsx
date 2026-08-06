import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import {
  canEditConfig,
  canViewConfig,
  displayDiscordName,
  hasPermission,
  type DashboardGroup,
  type DashboardPermissions,
  type DashboardUser,
} from "../lib/permissions";

interface AuthContextValue {
  user: DashboardUser | null;
  permissions: DashboardPermissions | null;
  isAuthenticated: boolean;
  loading: boolean;
  availableGroups: DashboardGroup[];
  isImpersonating: boolean;
  impersonatedGroup: DashboardGroup | null;
  impersonateGroup: (groupId: string) => void;
  stopImpersonation: () => void;
  loginWithDiscord: () => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hasPermission: (key: string) => boolean;
  canViewConfig: (file: string) => boolean;
  canEditConfig: (file: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "nexus_impersonate_group";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatedGroupId, setImpersonatedGroupId] = useState<string | null>(
    () => (typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null)
  );

  const refreshSession = useCallback(async () => {
    try {
      const [userRes, groupsRes] = await Promise.all([
        api.me(),
        api.listGroups().catch(() => ({ data: { groups: [] } })),
      ]);

      if (userRes.data) {
        setUser(userRes.data);
        if (groupsRes.data?.groups) {
          setGroups(groupsRes.data.groups);
        }
        return true;
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const loginWithDiscord = useCallback(() => {
    window.location.href = "/api/auth/discord";
  }, []);

  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
      setImpersonatedGroupId(null);
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const impersonateGroup = useCallback((groupId: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, groupId);
    }
    setImpersonatedGroupId(groupId);
  }, []);

  const stopImpersonation = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setImpersonatedGroupId(null);
  }, []);

  const impersonatedGroup = useMemo(
    () => groups.find((g) => g.id === impersonatedGroupId) || null,
    [groups, impersonatedGroupId]
  );

  const isImpersonating = Boolean(impersonatedGroupId && impersonatedGroup);

  // Effective permissions: use impersonated group's permissions if active, else real user permissions
  const permissions = useMemo(() => {
    if (isImpersonating && impersonatedGroup) {
      return impersonatedGroup.permissions;
    }
    return user?.permissions ?? null;
  }, [isImpersonating, impersonatedGroup, user]);

  const checkPermission = useCallback(
    (key: string) => hasPermission(permissions, key),
    [permissions]
  );

  const checkViewConfig = useCallback(
    (file: string) => canViewConfig(permissions, file),
    [permissions]
  );

  const checkEditConfig = useCallback(
    (file: string) => canEditConfig(permissions, file),
    [permissions]
  );

  const value = useMemo(
    () => ({
      user,
      permissions,
      isAuthenticated: !!user,
      loading,
      availableGroups: groups,
      isImpersonating,
      impersonatedGroup,
      impersonateGroup,
      stopImpersonation,
      loginWithDiscord,
      logout,
      refreshSession,
      hasPermission: checkPermission,
      canViewConfig: checkViewConfig,
      canEditConfig: checkEditConfig,
    }),
    [
      user,
      permissions,
      loading,
      groups,
      isImpersonating,
      impersonatedGroup,
      impersonateGroup,
      stopImpersonation,
      loginWithDiscord,
      logout,
      refreshSession,
      checkPermission,
      checkViewConfig,
      checkEditConfig,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { displayDiscordName };
