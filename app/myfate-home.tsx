import Link from "next/link";
import { getHomepageStarList } from "./myfate-stars-server";
import AuthEntryLink from "./auth-entry-link";
import { portraitImage } from "./myfate-image";

// 首页数据只依赖"首页精选"名单,变化频率低;ISR 每 5 分钟后台刷新,访客直接拿缓存 HTML。
export const revalidate = 300;

export default async function MyfateHome() {
  const stars = await getHomepageStarList();
  const previewOrbits = [
    { radius: "20%", angle: "-90deg", counterAngle: "90deg", duration: "48s", size: "56px", mobileSize: "48px" },
    { radius: "20%", angle: "30deg", counterAngle: "-30deg", duration: "48s", size: "52px", mobileSize: "46px" },
    { radius: "20%", angle: "150deg", counterAngle: "-150deg", duration: "48s", size: "49px", mobileSize: "44px" },
    { radius: "47%", angle: "-30deg", counterAngle: "30deg", duration: "48s", size: "46px", mobileSize: "42px" },
    { radius: "47%", angle: "90deg", counterAngle: "-90deg", duration: "48s", size: "43px", mobileSize: "40px" },
    { radius: "47%", angle: "210deg", counterAngle: "-210deg", duration: "48s", size: "40px", mobileSize: "38px" },
  ];

  return (
    <div className="mf-page">
      <header className="mf-header mf-home-header">
        <Link className="mf-brand" href="/" aria-label="Myfate 首页">Myfate</Link>
        <nav className="mf-nav" aria-label="主导航">
          <Link href="/#stars">解读对象</Link>
          <a href="#how-it-works">解读说明</a>
        </nav>
        <AuthEntryLink className="mf-header-cta mf-home-header-cta" href="/home/profile" anonymousChildren="登录">个人中心</AuthEntryLink>
      </header>

      <main>
        <section className="mf-hero mf-home-hero">
          <div className="mf-hero-copy">
            <div className="mf-home-eyebrow"><span>✦</span> AI 生辰画像</div>
            <h1><span>每一位偶像，</span><em>都有一份 AI 生辰画像</em></h1>
            <p>
              基于 TA 的公开出生资料排盘，一页读懂性格天赋、事业财富、关系家庭、身心节律与未来运势，还能继续向 AI 命理师追问。
            </p>
            <Link className="mf-bz-btn mf-home-cta" href="/home/relationship-test">立即探索 <span aria-hidden="true">→</span></Link>
          </div>

          <div className="mf-hero-visual">
            <div className="mf-home-fate-map" aria-label="明星正缘解读示例">
              <div className="mf-home-fate-map-stage">
                <i className="mf-home-map-ring near" aria-hidden="true" />
                <i className="mf-home-map-ring middle" aria-hidden="true" />
                <i className="mf-home-map-ring far" aria-hidden="true" />
                <div className="mf-brand-mark mf-home-map-logo" aria-label="Myfate">M</div>
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
          <div className="mf-section-heading">
            <div><span className="mf-kicker mf-kicker-spacer">AI 生辰画像预览</span></div>
          </div>
          <div className="mf-star-grid">
            {stars.slice(0, 6).map((star) => (
              <AuthEntryLink
                className="mf-star-card mf-home-star-card"
                href={`/home/relationship-test/${star.id}/test`}
                anonymousFrom="/#stars"
                key={star.id}
              >
                <div
                  className="mf-star-portrait"
                  style={{ "--portrait-image": `url("${portraitImage(star.portraitSrc, 520)}")` } as React.CSSProperties}
                >
                  <div className="mf-star-overlay">
                    <h3>{star.name}</h3>
                  </div>
                </div>
              </AuthEntryLink>
            ))}
          </div>
        </section>

        <section className="mf-how" id="how-it-works">
          <div className="mf-section-heading">
            <div><span className="mf-kicker mf-kicker-spacer">解读说明</span></div>
          </div>
          <div className="mf-how-grid">
            <article><span>01</span><h3>选择 TA</h3><p>在偶像档案中按分类浏览或直接搜索名字，找到你关心的那位偶像。</p></article>
            <article><span>02</span><h3>打开 AI 生辰画像</h3><p>系统按 TA 的公开出生资料排盘，呈现性格天赋、事业财富、关系家庭、身心节律与大运流年。</p></article>
            <article><span>03</span><h3>继续追问</h3><p>报告下方可以直接提问，解读会基于 TA 的盘面继续展开，越问越细。</p></article>
          </div>
          <div className="mf-how-dual">
            <Link href="/home/dual-star-match">
              <b>偶像合盘</b>
              <span>选择任意两位偶像，解读他们之间的吸引、互动与关系课题。</span>
              <i aria-hidden="true">→</i>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mf-footer">
        <Link className="mf-brand" href="/"><span>Myfate</span></Link>
        <p>以全新视角，探索性格、正缘与人生节律。</p>
      </footer>
    </div>
  );
}
