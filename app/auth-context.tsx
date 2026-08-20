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

// Module-level cache makes the session request happen exactly once per app
// load: StrictMode double effects and provider remounts reuse the promise,
// and a remounted provider restores the resolved state instead of flashing
// the placeholder again.
let cachedSession: AuthState | null = null;
let sessionPromise: Promise<AuthState> | null = null;

function loadSession(): Promise<AuthState> {
  if (!sessionPromise) {
    sessionPromise = fetch("/api/auth/session", { cache: "no-store" })
      .then(
        (response) =>
          response.json() as Promise<{
            user?: { email?: string } | null;
          }>,
      )
      .then((result): AuthState => ({
        status: result.user?.email ? "authenticated" : "anonymous",
        email: result.user?.email ?? null,
      }))
      .catch((): AuthState => ({ status: "anonymous", email: null }))
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
    cachedSession = next;
    setState(next);
  }, []);

  const markSignedOut = useCallback(() => {
    const next: AuthState = { status: "anonymous", email: null };
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
