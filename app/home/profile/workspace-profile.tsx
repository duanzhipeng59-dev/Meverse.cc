"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";

export default function WorkspaceProfile({ upgradesEnabled = true }: { upgradesEnabled?: boolean }) {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState<{ balance: number | null; asksRemaining: number | null }>({ balance: null, asksRemaining: null });

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void fetch("/api/myfate/credits")
      .then((response) => (response.ok ? (response.json() as Promise<{ balance?: number; asksRemaining?: number }>) : null))
      .then((data) => {
        if (!active || !data) return;
        setCredits({ balance: typeof data.balance === "number" ? data.balance : null, asksRemaining: typeof data.asksRemaining === "number" ? data.asksRemaining : null });
      })
      .catch(() => {});
    const reload = () => void fetch("/api/myfate/credits")
      .then((response) => (response.ok ? (response.json() as Promise<{ balance?: number; asksRemaining?: number }>) : null))
      .then((data) => {
        if (!active || !data) return;
        setCredits({ balance: typeof data.balance === "number" ? data.balance : null, asksRemaining: typeof data.asksRemaining === "number" ? data.asksRemaining : null });
      })
      .catch(() => {});
    window.addEventListener("myfate-credits-updated", reload);
    return () => {
      active = false;
      window.removeEventListener("myfate-credits-updated", reload);
    };
  }, [status]);

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  return (
    <div className="mf-bz-profile">
      {status === "authenticated" && upgradesEnabled ? (
        <section className="mf-profile-stats" aria-label="额度统计">
          <div>
            <i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M9 3.5v3M15 3.5v3M5 9.5h14M9.5 13.5h5M9.5 16.5h5" /></svg></i>
            <strong>{credits.balance ?? "—"}</strong>
            <span>解读次数</span>
          </div>
          <div>
            <i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V6.5Z" /><path d="M8.5 9h7M8.5 11.8h4.5" /></svg></i>
            <strong>{credits.asksRemaining ?? "—"}</strong>
            <span>追问次数</span>
          </div>
        </section>
      ) : null}

      <section className="mf-bz-account-card">
        <div className="mf-bz-account-details">
          <div>
            <span>邮箱</span>
            <b>{email ?? "尚未登录"}</b>
          </div>
        </div>
        {status === "anonymous" ? (
          <Link className="mf-bz-account-button" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">登录</Link>
        ) : (
          <button className="mf-bz-account-button" type="button" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
        )}
      </section>
    </div>
  );
}
