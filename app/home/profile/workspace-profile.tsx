"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../auth-context";

// 我的页(过渡版):邮箱 + 登录/退出。免费化后不再有任何额度/套餐/订单内容;
// 收藏、最近浏览、报告历史、AI 对话记录、偏好与隐私设置随重构后续批次接入。
export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  return (
    <div className="mf-bz-profile">
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
