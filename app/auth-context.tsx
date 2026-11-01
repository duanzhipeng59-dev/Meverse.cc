"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearLocalSession, writeLocalSession } from "./local-auth";
import { gaSetUser } from "./ga";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  email: string | null;
  // Supabase 用户 UUID:登录成功/会话恢复时带上,供 GA4 user_id 归因
  userId: string | null;
}

interface AuthContextValue extends AuthState {
  markAuthenticated: (email: string, userId?: string | null) => void;
  markSignedOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INITIAL_STATE: AuthState = { status: "loading", email: null, userId: null };

let cachedSession: AuthState | null = null;
let sessionPromise: Promise<AuthState> | null = null;

function loadSession(): Promise<AuthState> {
  if (!sessionPromise) {
    sessionPromise = Promise.resolve()
      .then(async (): Promise<AuthState> => {
        try {
          const response = await fetch("/api/auth/session", { cache: "no-store" });
          const result = await response.json() as { user?: { id?: string; email?: string } | null };
          if (response.ok && result.user?.email) {
            writeLocalSession(result.user.email);
            return { status: "authenticated", email: result.user.email, userId: result.user.id ?? null };
          }
          clearLocalSession();
          return { status: "anonymous", email: null, userId: null };
        } catch {
          clearLocalSession();
          return { status: "anonymous", email: null, userId: null };
        }
      })
      .then((state) => {
        if (cachedSession === null) cachedSession = state;
        return state;
      });
  }
  return sessionPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    cachedSession ?? INITIAL_STATE,
  );

  useEffect(() => {
    let active = true;
    loadSession().then((resolved) => {
      if (active) {
        setState((current) =>
          current.status === "loading" ? resolved : current,
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // GA4:登录/登出后同步 user_id,之后的事件(含增强衡量 page_view)都能按用户分群
  useEffect(() => {
    gaSetUser(state.status === "authenticated" ? state.userId : null);
  }, [state.status, state.userId]);

  const markAuthenticated = useCallback((email: string, userId: string | null = null) => {
    const next: AuthState = { status: "authenticated", email, userId };
    writeLocalSession(email);
    cachedSession = next;
    setState(next);
  }, []);

  const markSignedOut = useCallback(() => {
    // 同步清掉服务端 HttpOnly 会话 Cookie,否则接口层仍视为已登录
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    const next: AuthState = { status: "anonymous", email: null, userId: null };
    clearLocalSession();
    cachedSession = next;
    setState(next);
  }, []);

  const value = useMemo(
    () => ({ ...state, markAuthenticated, markSignedOut }),
    [state, markAuthenticated, markSignedOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
