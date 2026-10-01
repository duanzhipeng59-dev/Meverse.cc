"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../auth-context";

export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  return (
    <div className="mf-bz-profile">
      <header className="mf-bz-profile-head">
        <h1>个人中心</h1>
        <p>管理你的账号信息</p>
      </header>

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
