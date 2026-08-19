export type ProductCategory = "official" | "coding" | "developer-api";

export interface Plan {
  id: string;
  category: ProductCategory;
  brand: string;
  title: string;
  detail: string;
  currency?: string;
  price: string;
  suffix: string;
  accent: string;
  icon: string;
  subtitle?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  active?: boolean;
}

export interface DemoStep {
  id: "login" | "confirm" | "complete";
  title: string;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  { id: "subscribe", label: "订阅", active: true },
  { id: "orders", label: "我的订单" },
  { id: "invitations", label: "我的邀请" },
];

export const plans: Plan[] = [
  {
    id: "chatgpt",
    category: "official",
    brand: "OpenAI",
    title: "ChatGPT/CodeX",
    detail: "支持 Codex 的全能模型",
    price: "22.99",
    suffix: "/月起",
    accent: "#111111",
    icon: "◎",
    subtitle: "1 个月",
  },
  {
    id: "claude",
    category: "official",
    brand: "Anthropic",
    title: "Claude Pro / Max+",
    detail: "强大的长文本与代码模型",
    price: "23.99",
    suffix: "/月起",
    accent: "#d97757",
    icon: "✳",
    subtitle: "1 个月",
  },
  {
    id: "x",
    category: "official",
    brand: "X",
    title: "X Premium+",
    detail: "集成 Grok 的全球社交平台",
    price: "5.99",
    suffix: "/月起",
    accent: "#111111",
    icon: "X",
    subtitle: "1 个月",
  },
  {
    id: "gemini",
    category: "official",
    brand: "Google",
    title: "Gemini Pro/家庭组",
    detail: "原生多模态 AI，搭载 Veo",
    currency: "¥",
    price: "19.9",
    suffix: "起",
    accent: "#4285f4",
    icon: "✦",
    subtitle: "1 个月",
  },
  {
    id: "claude-api",
    category: "official",
    brand: "Anthropic",
    title: "Claude API",
    detail: "为 Claude Console API 余额充值",
    price: "5.00",
    suffix: "/起",
    accent: "#d97757",
    icon: "✳",
    subtitle: "按量计费",
  },
  {
    id: "coding",
    category: "coding",
    brand: "WildAI",
    title: "Claude Code / Codex 套餐",
    detail: "支持按量付费 · 相比官方定价省 17%-50%",
    price: "10.00",
    suffix: "/起",
    accent: "#2563eb",
    icon: "⌘",
    subtitle: "最多 5 折",
  },
  {
    id: "developer-api",
    category: "developer-api",
    brand: "WildAI",
    title: "统一 API",
    detail: "Claude · GPT · Gemini · DeepSeek · Grok",
    price: "0.01",
    suffix: "/起",
    accent: "#3189ef",
    icon: "</>",
    subtitle: "OpenAI 兼容",
  },
];

export const demoSteps: DemoStep[] = [
  {
    id: "login",
    title: "登录 / 注册",
    description: "使用手机号登录 WildAI",
  },
  {
    id: "confirm",
    title: "确认套餐",
    description: "核对所选服务与价格",
  },
  {
    id: "complete",
    title: "套餐确认完成",
    description: "支付服务当前暂未开放",
  },
];
