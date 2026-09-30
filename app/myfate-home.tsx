import Link from "next/link";
import { getHomepageStars } from "./myfate-stars-server";
import HomeProfileEntry from "./home-profile-entry";
import AuthEntryLink from "./auth-entry-link";

export default async function MyfateHome() {
  const stars = await getHomepageStars();
  const previewRoles = ["灵魂知己", "搭档", "姐姐", "玩伴", "挚友", "恋人"];
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
        <Link className="mf-brand" href="/" aria-label="Myfate 首页">
          <span className="mf-brand-mark">M</span>
          <span>Myfate</span>
        </Link>
        <nav className="mf-nav" aria-label="主导航">
          <Link href="/#stars">解读对象</Link>
          <a href="#how-it-works">解读说明</a>
        </nav>
        <AuthEntryLink className="mf-header-cta mf-home-header-cta" href="/home/personal-reading" anonymousChildren="登录">工作台</AuthEntryLink>
      </header>

      <main>
        <section className="mf-hero mf-home-hero">
          <div className="mf-hero-copy">
            <div className="mf-home-eyebrow"><span>✦</span> 个人命理探索</div>
            <h1><span>输入出生信息，</span><em>看见你与 TA 的星盘结构</em></h1>
            <p>
              输入你的出生信息，生成属于你的八字命盘与八大板块个人解读。
            </p>
            <HomeProfileEntry />
          </div>

          <div className="mf-hero-visual">
            <div className="mf-home-fate-map" aria-label="关系身份图谱示例">
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
                        style={{ backgroundImage: `url("${star.portraitSrc}")` }}
                      />
                      <strong>{star.name}</strong>
                      <small>{previewRoles[index]}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mf-stars-section" id="stars">
          <div className="mf-section-heading">
            <div>
              <span className="mf-kicker">解读对象预览</span>
              <h2>这一刻，你想了解谁？</h2>
            </div>
            <p>进入工作台后即可生成你的个人解读报告。</p>
          </div>

          <div className="mf-star-grid">
            {stars.slice(0, 6).map((star, index) => (
              <article className="mf-star-card mf-home-star-card" key={star.id}>
                <div
                  className="mf-star-portrait"
                  style={{ "--portrait-image": `url("${star.portraitSrc}")` } as React.CSSProperties}
                >
                  <span className="mf-star-number">0{index + 1}</span>
                  <div className="mf-star-overlay">
                    <h3>{star.name}</h3>
                  </div>
                </div>
                <div className="mf-star-card-bottom">
                  <span>{star.tagline}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mf-how" id="how-it-works">
          <div className="mf-section-heading">
            <div><span className="mf-kicker">解读说明</span><h2>从填写信息，到看见你的命盘结构</h2></div>
          </div>
          <div className="mf-how-grid">
            <article><span>01</span><h3>填写基础资料</h3><p>留下昵称与出生信息（日期、时间、城市），资料会自动保存在当前设备，后续无需重复填写。</p></article>
            <article><span>02</span><h3>确认出生信息</h3><p>登录后进入个人解读，确认你的出生信息（日期、时间、地点）。</p></article>
            <article><span>03</span><h3>查看解读报告</h3><p>系统按真太阳时排盘，呈现八字、五行、大运与八大板块解读。</p></article>
          </div>
        </section>
      </main>

      <footer className="mf-footer">
        <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
        <p>分析内容基于传统文化典籍与固定规则生成，仅供娱乐与自我观察参考，不构成科学结论、现实关系判断或专业建议。</p>
      </footer>
    </div>
  );
}
