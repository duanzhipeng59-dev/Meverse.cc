// 运势曲线数据的纯类型声明(供客户端转换组件使用,避免引入 server 模块):
// 与 app/star-fortune-extract.ts 的返回结构保持一致。
export type Fortune = {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
  currentAge: number | null;
};
