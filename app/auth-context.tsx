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

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  email: string | null;
}

interface AuthContextValue extends AuthState {
  markAuthenticated: (email: string) => void;
  markSignedOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INITIAL_STATE: AuthState = { status: "loading", email: null };

let cachedSession: AuthState | null = null;
let sessionPromise: Promise<AuthState> | null = null;

function loadSession(): Promise<AuthState> {
  if (!sessionPromise) {
    sessionPromise = Promise.resolve()
      .then(async (): Promise<AuthState> => {
        try {
          const response = await fetch("/api/auth/session", { cache: "no-store" });
          const result = await response.json() as { user?: { email?: string } | null };
          if (response.ok && result.user?.email) {
            writeLocalSession(result.user.email);
            return { status: "authenticated", email: result.user.email };
          }
          clearLocalSession();
          return { status: "anonymous", email: null };
        } catch {
          clearLocalSession();
          return { status: "anonymous", email: null };
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

  const markAuthenticated = useCallback((email: string) => {
    const next: AuthState = { status: "authenticated", email };
    writeLocalSession(email);
    cachedSession = next;
    setState(next);
  }, []);

  const markSignedOut = useCallback(() => {
    const next: AuthState = { status: "anonymous", email: null };
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
