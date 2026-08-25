export type LocalUser = {
  email: string;
  createdAt: string;
};

const SESSION_KEY = "myfate-auth-session:v1";
const USERS_KEY = "myfate-local-users:v1";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readLocalSession() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as { email?: unknown } | null;
    return typeof parsed?.email === "string" ? normalizeEmail(parsed.email) : null;
  } catch {
    return null;
  }
}

export function writeLocalSession(email: string) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizeEmail(email) }));
}

export function clearLocalSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function ensureLocalUser(email: string) {
  const normalized = normalizeEmail(email);
  let users: LocalUser[] = [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      users = parsed.filter((item): item is LocalUser => (
        typeof item === "object" && item !== null
        && typeof (item as LocalUser).email === "string"
        && typeof (item as LocalUser).createdAt === "string"
      ));
    }
  } catch {
    users = [];
  }

  const exists = users.some((user) => normalizeEmail(user.email) === normalized);
  if (!exists) {
    users.unshift({ email: normalized, createdAt: new Date().toISOString() });
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return { email: normalized, created: !exists };
}
