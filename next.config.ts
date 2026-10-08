import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 动态页(工作台/合盘等 force-dynamic 页面)的客户端路由缓存恢复 30 秒:
    // 返回导航瞬时显示,避免每次进入都白屏等服务端重跑查询;router.refresh() 仍即时重取。
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
