import { requirePageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";

export const metadata = { title: "个人解读" };

export default async function PersonalReadingPage() {
  await requirePageUser("/home/personal-reading");

  return (
    <div className="mf-bz-starreport">
      <div className="mf-saved-report-topbar">
        <span>个人解读</span>
      </div>

      <section className="mf-bz-starreport-hero">
        <div className="mf-bz-pr-cover" aria-hidden="true">解</div>
        <div>
          <span className="mf-bz-starreport-kicker">PERSONAL READING</span>
          <h1>你的个人解读</h1>
          <p>“认识自己,是一切解读的起点。”</p>
          <small>内容持续更新中</small>
        </div>
      </section>

      <section className="mf-bz-starreport-sections">
        <article>
          <header><span>01</span><h2>你的性格底色</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>02</span><h2>你的天赋与优势</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>03</span><h2>你的情感模式</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>04</span><h2>你的人生建议</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
      </section>

      <p className="mf-bz-starreport-note">本报告内容持续更新中；正式版将以图文形式呈现，敬请期待。</p>
    </div>
  );
}
