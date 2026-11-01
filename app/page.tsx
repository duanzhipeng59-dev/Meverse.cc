import MyfateHome from "./myfate-home";
import { routeCssHref } from "./route-css-version";
import { AuthProvider } from "./auth-context";
import { SITE_URL } from "./site-url";

// 首页 SEO 结构化数据:站点与组织实体(Bing 对 schema 富结果较积极,Google 用于
// 理解站点实体与品牌词召回)。
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MeVerse",
  alternateName: "MeVerse 生辰画像",
  url: `${SITE_URL}/`,
  inLanguage: "zh-CN",
};
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MeVerse",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/og-meverse.jpg`,
};

export default function Home() {
  return (
    <>
      {/* vinext 会把所有全局 CSS 合并进单一 bundle,这里用 link 实现真正的路由级按需加载;href 带文件版本参数 */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href={routeCssHref("public-home.css")} precedence="default" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <AuthProvider>
        <MyfateHome />
      </AuthProvider>
    </>
  );
}
