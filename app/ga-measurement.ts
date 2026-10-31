// GA4 Measurement Protocol 服务端上报:支付成功在服务端回调里,前端埋不到点。
// 需要 NEXT_PUBLIC_GA_ID + GA_API_SECRET 都配置才启用;上报失败只记日志,绝不影响履约。
// client_id 用下单用户 id 充当(GA 无法与浏览器端 client_id 打通,用户维度归因看 user_id)。

export type GaPurchaseEvent = {
  userId: string;
  transactionId: string;
  value: number;
  itemName: string;
};

export async function gaTrackPurchase(event: GaPurchaseEvent) {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID;
  const apiSecret = process.env.GA_API_SECRET;
  if (!measurementId || !apiSecret) return;
  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        // GA 在境内可能不可达:限时 3s,超时即放弃,不让上报拖慢支付履约
        signal: AbortSignal.timeout(3000),
        body: JSON.stringify({
          client_id: event.userId,
          user_id: event.userId,
          events: [
            {
              name: "purchase",
              params: {
                transaction_id: event.transactionId,
                value: event.value,
                currency: "CNY",
                item_name: event.itemName,
              },
            },
          ],
        }),
      },
    );
    if (!response.ok) console.warn("ga purchase 上报失败", response.status);
  } catch (error) {
    console.warn("ga purchase 上报异常", error);
  }
}
