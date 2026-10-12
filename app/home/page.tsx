import Link from "next/link";
import { getHomepageStarList } from "../myfate-stars-server";
import { portraitImage } from "../myfate-image";
import HomeRecent from "./home-recent";

export const revalidate = 300;

const STEPS = [
  { no: "01", title: "搜索人物", text: "按中文名、英文名或团体找到 TA 的生辰画像" },
  { no: "02", title: "阅读报告", text: "性格、事业、财富、感情与未来节奏,免费完整阅读" },
  { no: "03", title: "双人合盘", text: "选两位偶像,看他们的互动结构与相处建议" },
];

// 工作台首页:搜索/热门/最近阅读/双入口/三步说明/内容声明(300s ISR)
export default async function WorkspaceHome() {
  const hotStars = await getHomepageStarList();

  return (
    <div className="mf-home2">
      <header className="mf-home2-head">
        <span className="mf-kicker">MYFATE</span>
        <h1>读懂 TA 的生辰画像</h1>
        <p>公开出生资料 × 八字命理模型,生成完整的人物画像与双人合盘报告,全部免费阅读。</p>
        <form className="mf-home2-search" action="/home/relationship-test" method="get">
          <input type="search" name="q" placeholder="搜索人物:金泰亨 / Jungkook / SEVENTEEN" aria-label="搜索人物" />
          <button type="submit">搜索人物</button>
        </form>
        <div className="mf-home2-cta">
          <Link className="mf-home2-cta-primary" href="/home/dual-star-match">开始双人合盘</Link>
          <Link className="mf-home2-cta-ghost" href="/home/relationship-test">浏览全部人物</Link>
        </div>
      </header>

      <HomeRecent />

      <section className="mf-home2-section" aria-label="热门人物">
        <h2>热门人物</h2>
        <div className="mf-home2-grid">
          {hotStars.map((star) => (
            <Link href={`/home/relationship-test/${star.id}`} key={star.id}>
              <span style={{ backgroundImage: `url("${portraitImage(star.portraitSrc, 240)}")` }} role="img" aria-label={star.name} />
              <b>{star.name}</b>
              <small>{star.role.split("-")[0]}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="mf-home2-section" aria-label="三步使用说明">
        <h2>三步开始</h2>
        <div className="mf-home2-steps">
          {STEPS.map((step) => (
            <div key={step.no}>
              <i aria-hidden="true">{step.no}</i>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mf-home2-disclaimer">本报告基于公开出生资料与八字命理模型生成,内容仅供娱乐与自我探索参考,不代表人物真实情况,不构成任何现实建议。</p>
    </div>
  );
}
