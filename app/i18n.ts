export type Lang = "zh" | "en";

type TranslationDict = Record<string, string>;

const zh: TranslationDict = {
  /* ── 通用 ── */
  "lang.label": "EN",
  "lang.switchTo": "en",
  "auth.login_register": "邮箱登录",
  "support": "客服",
  "support.title": "联系官方客服",
  "support.description": "如需帮助，请联系官方邮箱",
  "support.copy": "复制",
  "support.copied": "官方邮箱已复制",
  "coming.soon": "第一版暂仅提供中文",
  "total.records": "共 {n} 条记录",
  "common.loading": "正在加载…",
  "common.close": "关闭",

  /* ── Toast ── */
  "toast.demo_only": "第一版暂仅提供中文",
  "toast.coming_soon": "{label}将在后续版本开放",




  "auth.title.login_code": "邮箱验证码登录",
  "auth.placeholder.email": "邮箱",
  "auth.placeholder.code": "邮箱验证码",
  "auth.get_code": "获取验证码",
  "auth.sending_code": "发送中…",
  "auth.resend_code_in": "{seconds} 秒后重发",
  "auth.verifying_code": "验证中…",
  "auth.submit.login": "登录",
  "auth.toast.email_required": "请输入邮箱",
  "auth.toast.code_required": "请输入邮箱验证码",
  "auth.toast.code_sent": "验证码已发送，请检查邮箱",
  "auth.toast.invalid_email": "请输入有效的邮箱地址",
  "auth.toast.code_too_frequent": "发送过于频繁，请 1 分钟后重试",
  "auth.toast.email_send_failed": "邮件发送失败，请稍后重试",
  "auth.toast.email_service_unavailable": "邮箱验证服务暂时不可用",
  "auth.toast.invalid_code": "验证码不正确",
  "auth.toast.code_expired": "验证码已过期，请重新获取",
  "auth.toast.auth_unavailable": "登录服务暂时不可用",
  "auth.toast.login_success": "登录成功",
  "auth.close": "关闭",
  "account.open_menu": "打开账户菜单",
  "account.profile": "个人主页",
  "account.sign_out": "退出登录",
  "account.signing_out": "正在退出…",
  "account.profile_eyebrow": "账户",
  "account.profile_description": "查看你的 Myfate 基本账户信息。",
  "account.username": "用户名",
  "account.email": "邮箱",
  "account.loading": "正在加载账户信息…",
  "account.login_required": "请先登录后查看个人主页。",

  /* ── 邀请规则弹窗 ── */
  /* ── 登录/注册页面额外 ── */
};

const en: TranslationDict = {
  /* ── Common ── */
  "lang.label": "中文",
  "lang.switchTo": "zh",
  "auth.login_register": "Email Login",
  "support": "Support",
  "support.title": "Contact support",
  "support.description": "For assistance, contact our official email",
  "support.copy": "Copy",
  "support.copied": "Support email copied",
  "coming.soon": "Currently Chinese only",
  "total.records": "Total {n} records",
  "common.loading": "Loading…",
  "common.close": "Close",

  /* ── Toast ── */
  "toast.demo_only": "Currently Chinese only",
  "toast.coming_soon": "{label} will be available in a future version",

  /* ── Subscribe Page ── */

  /* ── Gemini Purchase Flow ── */



  /* ── Auth Modal ── */
  "auth.title.login_code": "Email Verification Login",
  "auth.placeholder.email": "Email",
  "auth.placeholder.code": "Verification Code",
  "auth.get_code": "Get Code",
  "auth.sending_code": "Sending…",
  "auth.resend_code_in": "Resend in {seconds}s",
  "auth.verifying_code": "Verifying…",
  "auth.submit.login": "Login",
  "auth.toast.email_required": "Please enter your email",
  "auth.toast.code_required": "Please enter the verification code",
  "auth.toast.code_sent": "Verification code sent. Check your inbox.",
  "auth.toast.invalid_email": "Please enter a valid email address",
  "auth.toast.code_too_frequent": "Please wait one minute before trying again",
  "auth.toast.email_send_failed": "Unable to send the email. Please try again.",
  "auth.toast.email_service_unavailable": "Email verification is temporarily unavailable",
  "auth.toast.invalid_code": "The verification code is incorrect",
  "auth.toast.code_expired": "The code has expired. Request a new one.",
  "auth.toast.auth_unavailable": "Sign-in is temporarily unavailable",
  "auth.toast.login_success": "Signed in successfully",
  "auth.close": "Close",
  "account.open_menu": "Open account menu",
  "account.profile": "Profile",
  "account.sign_out": "Sign out",
  "account.signing_out": "Signing out…",
  "account.profile_eyebrow": "Account",
  "account.profile_description": "View your basic Myfate account information.",
  "account.username": "Username",
  "account.email": "Email",
  "account.loading": "Loading account information…",
  "account.login_required": "Please sign in to view your profile.",

  /* ── Confirm Step ── */
  /* ── Complete Step ── */
  /* ── Orders Page ── */

  /* ── Invitations Page ── */
  /* ── Invite Rules Modal ── */
  /* ── Demo Steps ── */
};

export const translations: Record<Lang, TranslationDict> = { zh, en };

export const langNames: Record<Lang, string> = {
  zh: "中文",
  en: "English",
};

export function t(
  dict: TranslationDict,
  key: string,
  params?: Record<string, string | number>,
): string {
  let value = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}
