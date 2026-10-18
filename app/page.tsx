import MyfateHome from "./myfate-home";
import { routeCssHref } from "./route-css-version";


export default function Home() {
  return (
    <>
      {/* vinext 会把所有全局 CSS 合并进单一 bundle,这里用 link 实现真正的路由级按需加载;href 带文件版本参数 */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href={routeCssHref("public-home.css")} precedence="default" />
      <MyfateHome />
    </>
  );
}
