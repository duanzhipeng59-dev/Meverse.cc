import ProfilePage from "../profile-page";

import { AuthProvider } from "../auth-context";
import { LanguageProvider } from "../language-context";

export default function Page() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/account.css" precedence="default" />
      <AuthProvider>
        <LanguageProvider>
          <ProfilePage />
        </LanguageProvider>
      </AuthProvider>
    </>
  );
}
