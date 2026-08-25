import Link from "next/link";
import { stars } from "./myfate-data";
import HomeProfileEntry from "./home-profile-entry";
import AuthEntryLink from "./auth-entry-link";

export default function MyfateHome() {
  const previewScores = [92, 88, 83, 77, 71, 65];
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
          <Link href="/home/celebrity-match">心动对象</Link>
          <a href="#how-it-works">测试说明</a>
        </nav>
        <AuthEntryLink className="mf-header-cta mf-home-header-cta" href="/home/celebrity-match" anonymousChildren="登录">进入工作台</AuthEntryLink>
      </header>

      <main>
        <section className="mf-hero mf-home-hero">
          <div className="mf-hero-copy">
            <div className="mf-home-eyebrow"><span>✦</span> 关系兼容性探索</div>
            <h1><span>那个让你心动的人，</span><em>会是你的正缘吗？</em></h1>
            <p>
              选择一位心动对象，通过 24 个关系情境，发现你们之间真正的吸引力与相处密码。
            </p>
            <HomeProfileEntry />
          </div>

          <div className="mf-hero-visual">
            <div className="mf-home-fate-map" aria-label="缘分星图示例：偶像距离中心越近，代表契合度越高">
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
                      <small>{previewScores[index]}%</small>
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
              <span className="mf-kicker">心动对象预览</span>
              <h2>这一刻，你想走近谁？</h2>
            </div>
            <p>进入工作台后选择对象并开始测试。人物画像为娱乐化设定，并非本人认证。</p>
          </div>

          <div className="mf-star-grid">
            {stars.map((star, index) => (
              <article className="mf-star-card mf-home-star-card" key={star.id}>
                <div
                  className="mf-star-portrait"
                  style={{ "--portrait-image": `url("${star.portraitSrc}")` } as React.CSSProperties}
                >
                  <span className="mf-star-number">0{index + 1}</span>
                  <div className="mf-star-overlay">
                    <div className="mf-star-tags">
                      {star.traits.slice(0, 2).map((trait) => <span key={trait}>{trait}</span>)}
                    </div>
                    <h3>{star.name}</h3>
                    <p>{star.role}</p>
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
            <div><span className="mf-kicker">如何测试</span><h2>不是随机答案，而是逐步读懂你</h2></div>
          </div>
          <div className="mf-how-grid">
            <article><span>01</span><h3>完成情境测试</h3><p>通过 24 道题了解你和 TA 在关系中的真实反应。</p></article>
            <article><span>02</span><h3>查看缘分初印象</h3><p>先看缘分区间，以及你最自然和最需要确认的回应。</p></article>
            <article><span>03</span><h3>解锁高级报告</h3><p>查看匹配指数、四维画像、吸引来源、相处挑战与专属建议。</p></article>
          </div>
        </section>
      </main>

      <footer className="mf-footer">
        <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
        <p>结果仅用于娱乐与自我探索，不构成心理诊断或现实关系预测。</p>
      </footer>
    </div>
  );
}
