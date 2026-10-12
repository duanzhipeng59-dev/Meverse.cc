import MyfateHome from "./myfate-home";


export default function Home() {
  return (
    <>
      {/* vinext 会把所有全局 CSS 合并进单一 bundle,这里用 link 实现真正的路由级按需加载 */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/public-home.css" precedence="default" />
      <MyfateHome />
    </>
  );
}
