"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAuth } from "../../auth-context";
import { finalVerdict } from "../../myfate-engine";
import { readBasicProfile } from "../../myfate-progressive-profile";
import { deleteSavedReport, readSavedReports, type SavedReport } from "../../myfate-report-storage";
import { deleteRelationshipReport, readRelationshipReports, type RelationshipProfileReport } from "../../relationship-profile-storage";

const fateTitles = {
  "绝对": "红颜祸水",
  "可能": "命定心动",
  "也许": "暧昧引力",
  "不太像": "擦肩缘分",
  "不是": "平行时空",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function starOrbitStyle(score: number, index: number, count: number) {
  const safeScore = Math.max(0, Math.min(100, score));
  const radius = 23 + (100 - safeScore) * 0.2;
  const angle = -90 + (360 / Math.max(count, 1)) * index;
  const duration = 27 + (index % 3) * 4;

  return {
    "--mf-fate-orbit-radius": `${radius}%`,
    "--mf-fate-orbit-angle": `${angle}deg`,
    "--mf-fate-counter-angle": `${-angle}deg`,
    "--mf-fate-orbit-duration": `${duration}s`,
  } as CSSProperties;
}

export default function ReportsWorkspace() {
  const { status, email } = useAuth();
  const [reports, setReports] = useState<(SavedReport | RelationshipProfileReport)[]>([]);
  const [nickname, setNickname] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const load = async () => {
      if (!active) return;
      const savedReports = await readSavedReports(email);
      if (!active) return;
      setReports([...savedReports, ...readRelationshipReports(email)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setNickname(readBasicProfile(email).nickname.trim());
      setReady(true);
    };
    const reload = () => void load();
    queueMicrotask(reload);
    window.addEventListener("myfate-reports-updated", reload);
    window.addEventListener("myfate-profile-updated", reload);
    return () => {
      active = false;
      window.removeEventListener("myfate-reports-updated", reload);
      window.removeEventListener("myfate-profile-updated", reload);
    };
  }, [status, email]);

  const latestStarReports = reports.reduce<SavedReport[]>((latest, report) => {
    if (report.type === "relationship-profile" || latest.some((item) => item.starId === report.starId)) return latest;
    latest.push(report);
    return latest;
  }, []);

  async function confirmDelete(report: SavedReport | RelationshipProfileReport) {
    const reportName = report.type === "relationship-profile" ? `「${report.title}」` : `${report.starName} 的这份报告`;
    if (!window.confirm(`确定删除${reportName}吗？删除后无法恢复。`)) return;
    if (report.type === "relationship-profile") {
      deleteRelationshipReport(email, report.id);
    } else {
      await deleteSavedReport(report.id);
    }
  }

  return (
    <div className="mf-reports-workspace">
      <header className="mf-reports-heading">
        <div>
          <span className="mf-kicker">我的报告</span>
          <h1>每一次心动，都有迹可循</h1>
          <p>这里保存你完成过的正缘测试与关系行为画像，每次测试都会形成一份独立记录。</p>
        </div>
        <div className="mf-reports-count">
          <strong>{reports.length}</strong>
          <span>份历史报告</span>
        </div>
      </header>

      {!ready ? (
        <div className="mf-reports-loading">正在读取历史报告…</div>
      ) : reports.length === 0 ? (
        <section className="mf-reports-empty">
          <span aria-hidden="true">✦</span>
          <h2>你还没有完成任何测试</h2>
          <p>可以从明星正缘测试或关系行为画像开始探索。</p>
        </section>
      ) : (
        <>
          {latestStarReports.length > 0 ? (
            <section className="mf-fate-map" aria-labelledby="mf-fate-map-title">
              <div className="mf-fate-map-heading">
                <div>
                  <span>缘分星图</span>
                  <h2 id="mf-fate-map-title">谁离你最近？</h2>
                </div>
                <p>距离越近，代表契合度越高；每位偶像展示最近一次测试。</p>
              </div>

              <div className="mf-fate-map-stage">
                <span className="mf-fate-map-orbit near" aria-hidden="true" />
                <span className="mf-fate-map-orbit middle" aria-hidden="true" />
                <span className="mf-fate-map-orbit far" aria-hidden="true" />

                <div className={`mf-fate-map-user${nickname ? " has-nickname" : ""}`} aria-label={`星图中心：${nickname || "我"}`}>
                  <span title={nickname || undefined}>{nickname || "我"}</span>
                </div>

                {latestStarReports.map((report, index) => (
                  <div
                    className="mf-fate-map-star-orbit"
                    key={report.starId}
                    style={starOrbitStyle(report.score, index, latestStarReports.length)}
                  >
                    <Link
                      className={`mf-fate-map-star ${report.status}`}
                      href={`/home/reports/${report.id}`}
                      aria-label={`${report.starName}，${report.status === "advanced" ? `契合度 ${report.score}%` : report.status === "generating" ? "报告生成中" : "初步报告"}，查看最近报告`}
                    >
                      <span
                        className="mf-fate-map-avatar"
                        role="img"
                        aria-label={report.starName}
                        style={{ backgroundImage: `url("${report.starPortrait}")` }}
                      />
                      <strong>{report.starName}</strong>
                      <small>{report.status === "advanced" ? `${report.score}%` : report.status === "generating" ? "生成中" : "初印象"}</small>
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mf-fate-map-legend" aria-label="报告状态说明">
                <span><i className="advanced" aria-hidden="true" />高级报告</span>
                <span><i className="generating" aria-hidden="true" />生成中</span>
                <span><i className="initial" aria-hidden="true" />初步报告</span>
              </div>
            </section>
          ) : null}

          <div className="mf-report-list-heading">
            <div>
              <span>历史记录</span>
              <h2>全部报告</h2>
            </div>
            <p>同一偶像的每次测试都会单独保留。</p>
          </div>

          <div className="mf-report-list">
            {reports.map((report) => {
            if (report.type === "relationship-profile") {
              return (
                <article className="mf-report-card mf-profile-report-card" key={report.id}>
                  <div className="mf-profile-report-mark" aria-hidden="true">✦</div>
                  <div className="mf-report-card-copy">
                    <div className="mf-report-card-meta"><span className="profile">关系画像</span><time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time></div>
                    <h2>{report.title}</h2><p>六维关系行为画像 · 24 道情境回答</p>
                  </div>
                  <div className="mf-report-card-result">
                    <span>认识自己的相处方式</span>
                    <div className="mf-report-card-actions">
                      <Link href={`/home/relationship-profile/result/${report.id}`}>查看画像 <span>→</span></Link>
                      <button type="button" onClick={() => void confirmDelete(report)} aria-label={`删除关系画像：${report.title}`}>删除</button>
                    </div>
                  </div>
                </article>
              );
            }
            const verdict = finalVerdict(report.score);
            return (
              <article className="mf-report-card" key={report.id}>
                <div
                  className="mf-report-card-avatar"
                  role="img"
                  aria-label={report.starName}
                  style={{ backgroundImage: `url("${report.starPortrait}")` }}
                />
                <div className="mf-report-card-copy">
                  <div className="mf-report-card-meta">
                    <span className={report.status}>
                      {report.status === "advanced" ? "高级报告" : report.status === "generating" ? "生成中" : "初步报告"}
                    </span>
                    <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                  </div>
                  <h2>{report.starName}</h2>
                  <p>{report.status === "advanced" ? `你是 TA 的「${fateTitles[verdict]}」` : report.status === "generating" ? "高级报告正在生成，请稍候" : report.initialTitle}</p>
                </div>
                <div className="mf-report-card-result">
                  {report.status === "advanced" ? <strong>{report.score}<small>%</small></strong> : <span>{report.status === "generating" ? "正在生成" : "缘分初印象"}</span>}
                  <div className="mf-report-card-actions">
                    <Link href={`/home/reports/${report.id}`}>{report.status === "generating" ? "查看进度" : "查看报告"} <span>→</span></Link>
                    <button type="button" onClick={() => void confirmDelete(report)} aria-label={`删除 ${report.starName} 的报告`}>删除</button>
                  </div>
                </div>
              </article>
            );
            })}
          </div>
        </>
      )}

      <p className="mf-reports-storage-note">报告目前仅保存在当前浏览器，清除浏览器数据或更换设备后将无法查看。</p>
    </div>
  );
}
