import OrdersPage from "../orders-page";

import { AuthProvider } from "../auth-context";
import { LanguageProvider } from "../language-context";

export const dynamic = "force-static";

export default function OrdersRoute() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/account.css" precedence="default" />
      <AuthProvider>
        <LanguageProvider>
          <OrdersPage />
        </LanguageProvider>
      </AuthProvider>
    </>
  );
}
