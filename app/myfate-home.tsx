import Link from "next/link";
import { getHomepageStarList } from "./myfate-stars-server";
import AuthEntryLink from "./auth-entry-link";
import PortraitImg from "./portrait-img";
import { portraitImage } from "./myfate-image";
import Trans from "./trans";

// 首页数据只依赖"首页精选"名单,变化频率低;ISR 每 5 分钟后台刷新,访客直接拿缓存 HTML。
export const revalidate = 300;

export default async function MyfateHome() {
  const stars = await getHomepageStarList();
  // 星轨图仅在宽屏(≥1181px)显示,CSS 控制显隐;轨道参数按内外两圈固定布点
  const previewOrbits = [
    { radius: "20%", angle: "-90deg", counterAngle: "90deg", duration: "48s", size: "56px", mobileSize: "48px" },
    { radius: "20%", angle: "30deg", counterAngle: "-30deg", duration: "48s", size: "52px", mobileSize: "46px" },
    { radius: "20%", angle: "150deg", counterAngle: "-150deg", duration: "48s", size: "49px", mobileSize: "44px" },
    { radius: "47%", angle: "-30deg", counterAngle: "30deg", duration: "48s", size: "46px", mobileSize: "42px" },
    { radius: "47%", angle: "90deg", counterAngle: "-90deg", duration: "48s", size: "43px", mobileSize: "40px" },
    { radius: "47%", angle: "210deg", counterAngle: "-210deg", duration: "48s", size: "40px", mobileSize: "38px" },
  ];

  const siteUrl = process.env.PUBLIC_APP_URL ?? "https://meverse.cc";
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MeVerse",
    url: siteUrl,
    description: "AI 生辰画像：输入生辰排盘，生成八字解读报告。支持明星命理与双人合盘。",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/home/relationship-test?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <div className="mf-page">
      <header className="mf-header mf-home-header">
        <Link className="mf-brand" href="/" aria-label="MeVerse 首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/myfate-logo.png?v=2" alt="MeVerse" />
        </Link>
        <nav className="mf-nav" aria-label="主导航">
          <Link href="/#stars"><Trans k="home.nav.stars" /></Link>
          <a href="#how-it-works"><Trans k="home.nav.how" /></a>
        </nav>
        <AuthEntryLink className="mf-header-cta mf-home-header-cta" href="/home/profile" anonymousChildren={<Trans k="home.header.login" />}><Trans k="home.header.cta" /></AuthEntryLink>
      </header>

      <main>
        <section className="mf-hero mf-home-hero">
          <div className="mf-hero-copy">
            <div className="mf-home-eyebrow"><span>✦</span> <Trans k="home.hero.eyebrow" /></div>
            <h1><span><Trans k="home.hero.title.a" /></span><em><Trans k="home.hero.title.b" /></em></h1>
            <p>
              <Trans k="home.hero.desc" />
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mf-home-hero-art-img" src="/hero-scroll.png" alt="古籍卷轴插画" />
            <Link className="mf-bz-btn mf-home-cta" href="/home/dual-star-match"><Trans k="home.hero.cta" /> <span aria-hidden="true">→</span></Link>
          </div>

          <div className="mf-hero-visual">
            <div className="mf-home-fate-map" aria-label="明星正缘解读示例">
              <div className="mf-home-fate-map-stage">
                <i className="mf-home-map-ring near" aria-hidden="true" />
                <i className="mf-home-map-ring middle" aria-hidden="true" />
                <i className="mf-home-map-ring far" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="mf-home-map-icon" src="/meverse-logo-round.png" alt="" aria-hidden="true" />
                {stars.slice(0, 6).map((star, index) => (
                  <div
                    className={`mf-home-map-star-orbit ${index < 3 ? "is-near" : "is-far"}`}
                    style={{
                      "--mf-home-orbit-radius": previewOrbits[index]?.radius,
                      "--mf-home-orbit-angle": previewOrbits[index]?.angle,
                      "--mf-home-counter-angle": previewOrbits[index]?.counterAngle,
                      "--mf-home-orbit-duration": previewOrbits[index]?.duration,
                      "--mf-home-avatar-size": previewOrbits[index]?.size,
                      "--mf-home-avatar-mobile-size": previewOrbits[index]?.mobileSize,
                    } as React.CSSProperties}
                    key={star.id}
                  >
                    <div className="mf-home-map-star">
                      <span
                        role="img"
                        aria-label={star.name}
                        style={{ backgroundImage: `url("${portraitImage(star.portraitSrc, 120)}")` }}
                      />
                      <strong>{star.name}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mf-stars-section" id="stars">
          <div className="mf-star-grid">
            {stars.slice(0, 6).map((star, index) => (
              <Link
                className="mf-star-card mf-home-star-card"
                href={`/home/relationship-test/${star.id}`}
                key={star.id}
              >
                {/* 真实 <img> 取代原 background-image,支持懒加载与优先级;
                    首屏仅前两张高优先级,其余进入视口附近再加载 */}
                <div className="mf-star-portrait">
                  <PortraitImg
                    src={star.portraitSrc}
                    alt={star.name}
                    priority={index < 2}
                    sizes="(max-width: 640px) 50vw, 33vw"
                    width={520}
                    height={719}
                  />
                  <div className="mf-star-overlay">
                    <h3>{star.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mf-how" id="how-it-works">
          <div className="mf-how-grid">
            <article><span>01</span><h3><Trans k="home.how1.title" /></h3><p><Trans k="home.how1.desc" /></p></article>
            <article><span>02</span><h3><Trans k="home.how2.title" /></h3><p><Trans k="home.how2.desc" /></p></article>
            <article><span>03</span><h3><Trans k="home.how3.title" /></h3><p><Trans k="home.how3.desc" /></p></article>
          </div>
        </section>
      </main>

      <footer className="mf-footer">
        <Link className="mf-brand" href="/"><span>MeVerse</span></Link>
        <p><Trans k="home.footer.tagline" /></p>
        <p>
          <Trans k="home.footer.contact" />
          <a className="mf-footer-mail" href="mailto:support@meverse.cc">support@meverse.cc</a>
        </p>
      </footer>
    </div>
    </>
  );
}
