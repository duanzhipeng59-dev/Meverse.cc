export type Lang = "zh" | "en";

type TranslationDict = Record<string, string>;

const zh: TranslationDict = {
  /* ── 通用 ── */
  "lang.label": "EN",
  "lang.switchTo": "en",
  "auth.login_register": "登录 / 注册",
  "nav.subscribe": "订阅",
  "nav.orders": "我的订单",
  "nav.invitations": "我的邀请",
  "support": "客服",
  "support.toast": "在线客服暂未开放",
  "coming.soon": "第一版暂仅提供中文",
  "total.records": "共 {n} 条记录",

  /* ── Toast ── */
  "toast.demo_only": "第一版暂仅提供中文",
  "toast.coming_soon": "{label}将在后续版本开放",
  "toast.orders_refreshed": "订单已刷新",

  /* ── 订阅页 ── */
  "subscribe.tab.official": "新订阅",
  "subscribe.tab.coding": "Claude Code/Codex",
  "subscribe.tab.coding.mobile": "CC/Codex",
  "subscribe.tab.developer": "开发者 API",
  "subscribe.badge.save": "最多省 50%",
  "subscribe.price.original": "原价",
  "subscribe.cta": "立即订阅",
  "subscribe.guarantee.official":
    "升级你自己的账户 · 订阅失败全额退款 · 7×12h 在线客服",
  "subscribe.guarantee.coding": "无需账户和外卡支付，远离封号和网络问题。",
  "subscribe.guarantee.developer":
    "在 Cursor / Cline / OpenClaw 中直接配置，或写入你自己的代码。",

  /* ── 订阅页-认证弹窗 ── */
  "auth.title.login": "邮箱密码登录",
  "auth.title.login_code": "邮箱验证码登录",
  "auth.title.register": "注册",
  "auth.placeholder.email": "邮箱",
  "auth.placeholder.password": "密码",
  "auth.placeholder.confirm_password": "确认密码",
  "auth.placeholder.code": "邮箱验证码",
  "auth.placeholder.invite_code": "邀请码（选填）",
  "auth.forgot_password": "忘记密码",
  "auth.show_password": "显示密码",
  "auth.hide_password": "隐藏密码",
  "auth.get_code": "获取验证码",
  "auth.sending_code": "发送中…",
  "auth.verifying_code": "验证中…",
  "auth.submit.login": "登录",
  "auth.submit.register": "提交注册",
  "auth.switch.to_code": "使用邮箱验证码登录",
  "auth.switch.to_password": "使用邮箱密码登录",
  "auth.agreement.prefix": "我已阅读并同意",
  "auth.agreement.link": "《用户协议与服务条款》",
  "auth.no_account": "还没有账号？",
  "auth.has_account": "已有账号？",
  "auth.switch_mode.login": "登录",
  "auth.switch_mode.register": "注册",
  "auth.toast.email_required": "请输入邮箱",
  "auth.toast.password_required": "请输入密码",
  "auth.toast.code_required": "请输入邮箱验证码",
  "auth.toast.fill_all": "请完整填写注册信息",
  "auth.toast.password_mismatch": "两次输入的密码不一致",
  "auth.toast.agree_required": "请先阅读并同意服务条款",
  "auth.toast.code_sent": "验证码已发送，请检查邮箱",
  "auth.toast.invalid_email": "请输入有效的邮箱地址",
  "auth.toast.code_too_frequent": "发送过于频繁，请 1 分钟后重试",
  "auth.toast.email_send_failed": "邮件发送失败，请稍后重试",
  "auth.toast.email_service_unavailable": "邮箱验证服务暂时不可用",
  "auth.toast.invalid_code": "验证码不正确",
  "auth.toast.code_expired": "验证码已过期，请重新获取",
  "auth.toast.invalid_password": "密码至少需要 8 位",
  "auth.toast.email_exists": "该邮箱已经注册，请直接登录",
  "auth.toast.invalid_credentials": "邮箱或登录凭据不正确",
  "auth.toast.auth_unavailable": "登录服务暂时不可用",
  "auth.toast.register_success": "注册成功",
  "auth.toast.forgot_password_demo": "密码找回暂未开放，请联系客服",
  "auth.toast.agreement_demo": "用户协议与服务条款页面暂未发布",
  "auth.toast.login_success": "登录成功",
  "auth.close": "关闭",

  /* ── 订阅页-确认 ── */
  "confirm.title": "确认订阅套餐",
  "confirm.description": "请核对套餐信息；支付服务当前暂未开放。",
  "confirm.continue": "确认并继续",
  "confirm.back": "上一步",

  /* ── 订阅页-完成 ── */
  "complete.title": "套餐确认完成",
  "complete.description":
    "套餐选择、登录与订单确认界面已走通。真实支付和账号逻辑将在后续版本接入。",
  "complete.done": "完成",

  /* ── 订单页 ── */
  "orders.tab.ai": "AI 订阅",
  "orders.tab.accounts": "成品账号",
  "orders.tab.sms": "海外短信",
  "orders.refresh": "刷新",
  "orders.empty.ai": "暂无订阅记录",
  "orders.empty.accounts": "暂无订单记录",
  "orders.empty.sms": "暂无购买记录",
  "orders.col.country": "国家",
  "orders.col.order_time": "订单号 · 下单时间",
  "orders.col.status": "状态",
  "orders.col.action": "操作",
  "orders.col.order_type": "订单 · 类型",
  "orders.col.order_created": "订单号 · 创建时间",
  "orders.col.product": "商品",
  "orders.col.order_no": "订单号",
  "orders.col.amount": "金额",

  /* ── 邀请页 ── */
  "invite.title": "我的邀请",
  "invite.code.label": "邀请码",
  "invite.code.description":
    "邀请朋友订阅成功，每位奖励 1 美元\n朋友填写您的邀请码，额外优惠 1 美元",
  "invite.code.copy": "复制链接",
  "invite.code.edit": "修改邀请码",
  "invite.code.cancel_edit": "取消修改",
  "invite.code.save": "保存",
  "invite.code.empty": "邀请码不能为空",
  "invite.code.updated": "邀请码已更新",
  "invite.link.copied": "邀请链接已复制",
  "invite.link.format": "邀请链接：{link}",

  "invite.reward.title": "奖励统计",
  "invite.reward.rules": "奖励规则",
  "invite.reward.rules.toast": "每位好友首次订阅成功奖励 1 美元",
  "invite.reward.withdrawable": "可提现金额",
  "invite.reward.withdraw": "提现",
  "invite.reward.withdraw.disabled": "可提现金额达到 $25 后开放",
  "invite.reward.exchange": "奖励兑换",
  "invite.reward.exchange.empty": "当前没有可兑换奖励",
  "invite.reward.min_withdraw": "提现需满 $25",
  "invite.reward.count": "人数",
  "invite.reward.month_count": "本月奖励人数",
  "invite.reward.total_count": "总邀请人数",
  "invite.reward.rewarded_count": "已奖励人数",
  "invite.reward.amount": "金额",
  "invite.reward.total_amount": "总奖励金额",
  "invite.reward.pending_amount": "待解冻金额",

  "invite.records.title": "邀请记录",
  "invite.records.tab.direct": "WildAI 直接邀请",
  "invite.records.tab.tier": "阶梯奖励",
  "invite.records.tab.history": "Wild 历史邀请 ⓘ",
  "invite.records.tab.history_reward": "Wild 历史奖励 ⓘ",
  "invite.records.tab.withdraw_history": "提现记录",
  "invite.records.empty": "暂无邀请记录",
  "invite.records.filter.status": "全部状态",
  "invite.records.filter.month": "全部月份",
  "invite.records.col.date": "日期",
  "invite.records.col.status": "状态",
  "invite.records.col.email": "邮箱",
  "invite.records.col.reward": "奖励金额",

  "invite.no_tier": "暂无阶梯奖励",
  "invite.no_history": "暂无历史邀请",
  "invite.no_history_reward": "暂无历史奖励",
  "invite.no_withdraw_history": "暂无提现记录",

  /* ── 邀请规则弹窗 ── */
  "invite.rules.title": "邀请返佣规则",
  "invite.rules.close": "关闭邀请返佣规则",
  "invite.rules.tier_title": "阶梯返佣标准",
  "invite.rules.tier_desc":
    "每成功邀请 1 人，立即返 $1。当月邀请人数越多，月底会按阶梯额外补发奖励。",
  "invite.rules.table.people": "当月成功邀请人数",
  "invite.rules.table.bonus": "月底额外奖励",
  "invite.rules.table.total": "单人总返佣",
  "invite.rules.notes_title": "规则说明",
  "invite.rules.notes.line1":
    "按自然月统计，月底统一结算；仅成功付费用户计入奖励。",
  "invite.rules.notes.line2":
    "奖励仅适用于 ChatGPT、Claude、X 订阅及成品账户订单，海外短信服务不参与奖励。",
  "invite.rules.acknowledge": "我知道了",

  /* ── 登录/注册页面额外 ── */
  "demostep.login": "登录 / 注册",
  "demostep.confirm": "确认套餐",
  "demostep.complete": "确认完成",
  "demostep.confirm_desc": "核对所选服务与价格",
  "demostep.complete_desc": "支付服务当前暂未开放",
};

const en: TranslationDict = {
  /* ── Common ── */
  "lang.label": "中文",
  "lang.switchTo": "zh",
  "auth.login_register": "Login / Register",
  "nav.subscribe": "Subscribe",
  "nav.orders": "My Orders",
  "nav.invitations": "My Invitations",
  "support": "Support",
  "support.toast": "Live chat is not available yet",
  "coming.soon": "Currently Chinese only",
  "total.records": "Total {n} records",

  /* ── Toast ── */
  "toast.demo_only": "Currently Chinese only",
  "toast.coming_soon": "{label} will be available in a future version",
  "toast.orders_refreshed": "Orders refreshed",

  /* ── Subscribe Page ── */
  "subscribe.tab.official": "New Subscription",
  "subscribe.tab.coding": "Claude Code/Codex",
  "subscribe.tab.coding.mobile": "CC/Codex",
  "subscribe.tab.developer": "Developer API",
  "subscribe.badge.save": "Save up to 50%",
  "subscribe.price.original": "Original",
  "subscribe.cta": "Subscribe Now",
  "subscribe.guarantee.official":
    "Upgrade your own account · Full refund on failure · 7×12h live support",
  "subscribe.guarantee.coding":
    "No account or international card needed. Avoid bans and network issues.",
  "subscribe.guarantee.developer":
    "Configure directly in Cursor / Cline / OpenClaw, or drop into your own code.",

  /* ── Auth Modal ── */
  "auth.title.login": "Email & Password Login",
  "auth.title.login_code": "Email Verification Login",
  "auth.title.register": "Register",
  "auth.placeholder.email": "Email",
  "auth.placeholder.password": "Password",
  "auth.placeholder.confirm_password": "Confirm Password",
  "auth.placeholder.code": "Verification Code",
  "auth.placeholder.invite_code": "Invite Code (optional)",
  "auth.forgot_password": "Forgot Password",
  "auth.show_password": "Show password",
  "auth.hide_password": "Hide password",
  "auth.get_code": "Get Code",
  "auth.sending_code": "Sending…",
  "auth.verifying_code": "Verifying…",
  "auth.submit.login": "Login",
  "auth.submit.register": "Register",
  "auth.switch.to_code": "Use Verification Code",
  "auth.switch.to_password": "Use Email & Password",
  "auth.agreement.prefix": "I have read and agree to the",
  "auth.agreement.link": "Terms of Service",
  "auth.no_account": "Don't have an account?",
  "auth.has_account": "Already have an account?",
  "auth.switch_mode.login": "Login",
  "auth.switch_mode.register": "Register",
  "auth.toast.email_required": "Please enter your email",
  "auth.toast.password_required": "Please enter your password",
  "auth.toast.code_required": "Please enter the verification code",
  "auth.toast.fill_all": "Please complete all registration fields",
  "auth.toast.password_mismatch": "Passwords do not match",
  "auth.toast.agree_required":
    "Please read and agree to the Terms of Service",
  "auth.toast.code_sent": "Verification code sent. Check your inbox.",
  "auth.toast.invalid_email": "Please enter a valid email address",
  "auth.toast.code_too_frequent": "Please wait one minute before trying again",
  "auth.toast.email_send_failed": "Unable to send the email. Please try again.",
  "auth.toast.email_service_unavailable": "Email verification is temporarily unavailable",
  "auth.toast.invalid_code": "The verification code is incorrect",
  "auth.toast.code_expired": "The code has expired. Request a new one.",
  "auth.toast.invalid_password": "Password must contain at least 8 characters",
  "auth.toast.email_exists": "This email is already registered",
  "auth.toast.invalid_credentials": "Incorrect email or sign-in credentials",
  "auth.toast.auth_unavailable": "Sign-in is temporarily unavailable",
  "auth.toast.register_success": "Registration successful",
  "auth.toast.forgot_password_demo":
    "Password recovery is not available yet. Please contact support.",
  "auth.toast.agreement_demo": "The Terms of Service page is not published yet",
  "auth.toast.login_success": "Signed in successfully",
  "auth.close": "Close",

  /* ── Confirm Step ── */
  "confirm.title": "Confirm Subscription",
  "confirm.description": "Review the plan details. Payments are not available yet.",
  "confirm.continue": "Confirm & Continue",
  "confirm.back": "Back",

  /* ── Complete Step ── */
  "complete.title": "Plan Confirmed",
  "complete.description":
    "Plan selection, login, and order confirmation flow completed. Real payment and account logic will be added in a future version.",
  "complete.done": "Done",

  /* ── Orders Page ── */
  "orders.tab.ai": "AI Subscription",
  "orders.tab.accounts": "Ready Accounts",
  "orders.tab.sms": "SMS",
  "orders.refresh": "Refresh",
  "orders.empty.ai": "No subscription records",
  "orders.empty.accounts": "No order records",
  "orders.empty.sms": "No purchase records",
  "orders.col.country": "Country",
  "orders.col.order_time": "Order No. · Time",
  "orders.col.status": "Status",
  "orders.col.action": "Action",
  "orders.col.order_type": "Order · Type",
  "orders.col.order_created": "Order No. · Created",
  "orders.col.product": "Product",
  "orders.col.order_no": "Order No.",
  "orders.col.amount": "Amount",

  /* ── Invitations Page ── */
  "invite.title": "My Invitations",
  "invite.code.label": "Invite Code",
  "invite.code.description":
    "Earn $1 for each friend who subscribes successfully\nFriends get $1 off with your invite code",
  "invite.code.copy": "Copy Link",
  "invite.code.edit": "Edit Code",
  "invite.code.cancel_edit": "Cancel",
  "invite.code.save": "Save",
  "invite.code.empty": "Invite code cannot be empty",
  "invite.code.updated": "Invite code updated",
  "invite.link.copied": "Invite link copied",
  "invite.link.format": "Invite link: {link}",

  "invite.reward.title": "Reward Stats",
  "invite.reward.rules": "Reward Rules",
  "invite.reward.rules.toast":
    "$1 reward for each friend's first successful subscription",
  "invite.reward.withdrawable": "Withdrawable",
  "invite.reward.withdraw": "Withdraw",
  "invite.reward.withdraw.disabled":
    "Available when balance reaches $25",
  "invite.reward.exchange": "Redeem",
  "invite.reward.exchange.empty": "No rewards available",
  "invite.reward.min_withdraw": "Min. withdrawal $25",
  "invite.reward.count": "People",
  "invite.reward.month_count": "This Month",
  "invite.reward.total_count": "Total Invited",
  "invite.reward.rewarded_count": "Rewarded",
  "invite.reward.amount": "Amount",
  "invite.reward.total_amount": "Total Rewards",
  "invite.reward.pending_amount": "Pending",

  "invite.records.title": "Invite Records",
  "invite.records.tab.direct": "WildAI Direct",
  "invite.records.tab.tier": "Tier Rewards",
  "invite.records.tab.history": "Wild History ⓘ",
  "invite.records.tab.history_reward": "Wild Past Rewards ⓘ",
  "invite.records.tab.withdraw_history": "Withdrawal History",
  "invite.records.empty": "No invite records",
  "invite.records.filter.status": "All Status",
  "invite.records.filter.month": "All Months",
  "invite.records.col.date": "Date",
  "invite.records.col.status": "Status",
  "invite.records.col.email": "Email",
  "invite.records.col.reward": "Reward",

  "invite.no_tier": "No tier rewards yet",
  "invite.no_history": "No invite history",
  "invite.no_history_reward": "No reward history",
  "invite.no_withdraw_history": "No withdrawal history",

  /* ── Invite Rules Modal ── */
  "invite.rules.title": "Invite Commission Rules",
  "invite.rules.close": "Close invite rules",
  "invite.rules.tier_title": "Tiered Commission",
  "invite.rules.tier_desc":
    "Earn $1 instantly per successful invite. Extra bonuses are awarded at month-end based on total invites.",
  "invite.rules.table.people": "Monthly Invites",
  "invite.rules.table.bonus": "Month-End Bonus",
  "invite.rules.table.total": "Total Per Person",
  "invite.rules.notes_title": "Rules",
  "invite.rules.notes.line1":
    "Counted by calendar month, settled at month-end. Only successful paid users qualify.",
  "invite.rules.notes.line2":
    "Rewards apply to ChatGPT, Claude, X subscriptions and ready accounts only. SMS services are excluded.",
  "invite.rules.acknowledge": "Got it",

  /* ── Demo Steps ── */
  "demostep.login": "Login / Register",
  "demostep.confirm": "Confirm Plan",
  "demostep.complete": "Confirmed",
  "demostep.confirm_desc": "Review service & pricing",
  "demostep.complete_desc": "Payments are not available yet",
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
