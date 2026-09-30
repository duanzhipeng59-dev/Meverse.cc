import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedStar } from "../../../../myfate-stars-server";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

export default async function StarReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/home/relationship-test/${id}/test`);
  const star = await getPublishedStar(id);
  if (!star) notFound();

  return (
    <div className="mf-bz-starreport">
      <div className="mf-saved-report-topbar">
        <Link className="mf-back-link" href="/home/relationship-test">← 返回明星解读</Link>
        <span>正缘分析报告</span>
      </div>

      <section className="mf-bz-starreport-hero">
        <img src={star.portraitSrc} alt="" />
        <div>
          <span className="mf-bz-starreport-kicker">{star.role}</span>
          <h1>{star.name} 的正缘分析</h1>
          <p>“{star.tagline}”</p>
          <small>BORN · {star.birthDate.replaceAll("-", ".")} · {star.matchCount} 人已解读</small>
        </div>
      </section>

      <section className="mf-bz-starreport-sections">
        <article>
          <header><span>01</span><h2>TA 的性格底色</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>02</span><h2>TA 在关系中的模样</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>03</span><h2>和 TA 最合拍的你</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
        <article>
          <header><span>04</span><h2>相处指南</h2></header>
          <div className="mf-bz-starreport-placeholder"><span>✦</span><p>本板块内容正在准备中，即将上线。</p></div>
        </article>
      </section>

      <p className="mf-bz-starreport-note">本报告内容持续更新中；正式版将以图文形式呈现，敬请期待。</p>
    </div>
  );
}
