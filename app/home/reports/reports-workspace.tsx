"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAuth } from "../../auth-context";
import { readBasicProfile } from "../../myfate-progressive-profile";
import { deleteSavedReport, readSavedReports, type SavedReport } from "../../myfate-report-storage";
import { deleteRelationshipReport, readRelationshipReports, type RelationshipProfileReport } from "../../relationship-profile-storage";

type ReportItem = SavedReport | RelationshipProfileReport;

const reportPageSnapshots = new Map<string, { reports: ReportItem[]; nickname: string }>();

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function reportAction(report: SavedReport) {
  if (report.status === "advanced") return { label: "查看报告", href: `/home/reports/${report.id}`, disabled: false };
  if (report.status === "generating") return { label: "生成中", href: "", disabled: true };
  return {
    label: "去答题",
    href: `/home/celebrity-match/${report.starId}/test?report=${encodeURIComponent(report.id)}`,
    disabled: false,
  };
}

function reportStatusLabel(report: SavedReport) {
  return report.status === "generating" ? "生成中" : "已完成";
}

function starOrbitStyle(index: number, count: number) {
  const radius = 29 + (index % 3) * 8;
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
  const snapshotKey = email || "guest";
  const initialSnapshot = reportPageSnapshots.get(snapshotKey);
  const [reports, setReports] = useState<ReportItem[]>(initialSnapshot?.reports ?? []);
  const [nickname, setNickname] = useState(initialSnapshot?.nickname ?? "");
  const [ready, setReady] = useState(Boolean(initialSnapshot));

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    const load = async () => {
      if (!active) return;
      const savedReports = await readSavedReports(email);
      if (!active) return;
      const nextReports = [...savedReports, ...readRelationshipReports(email)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const nextNickname = readBasicProfile(email).nickname.trim();
      reportPageSnapshots.set(snapshotKey, { reports: nextReports, nickname: nextNickname });
      setReports(nextReports);
      setNickname(nextNickname);
      setReady(true);
    };
    const reload = () => void load();
    const refreshNickname = () => {
      const nextNickname = readBasicProfile(email).nickname.trim();
      const current = reportPageSnapshots.get(snapshotKey);
      if (current) reportPageSnapshots.set(snapshotKey, { ...current, nickname: nextNickname });
      setNickname(nextNickname);
    };
    const cached = reportPageSnapshots.get(snapshotKey);
    queueMicrotask(() => {
      if (!active) return;
      if (cached) {
        setReports(cached.reports);
        setNickname(cached.nickname);
        setReady(true);
        return;
      }
      setReady(false);
      reload();
    });
    window.addEventListener("myfate-reports-updated", reload);
    window.addEventListener("myfate-profile-updated", refreshNickname);
    return () => {
      active = false;
      window.removeEventListener("myfate-reports-updated", reload);
      window.removeEventListener("myfate-profile-updated", refreshNickname);
    };
  }, [status, email, snapshotKey]);

  useEffect(() => {
    if (status !== "authenticated" || !reports.some((report) => report.type !== "relationship-profile" && report.status === "generating")) return;
    const timer = window.setInterval(() => {
      void readSavedReports(email).then((savedReports) => {
        const nextReports = [...savedReports, ...readRelationshipReports(email)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        reportPageSnapshots.set(snapshotKey, { reports: nextReports, nickname });
        setReports(nextReports);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [email, nickname, reports, snapshotKey, status]);

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
          <p>可以从正缘测试开始探索。</p>
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
                <p>每位偶像展示最近一次测试，点击即可回看完整报告。</p>
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
                    style={starOrbitStyle(index, latestStarReports.length)}
                  >
                    <Link
                      className={`mf-fate-map-star ${report.status}`}
                      href={reportAction(report).href || "/home/reports"}
                      aria-label={`${report.starName}，${reportStatusLabel(report)}，${reportAction(report).label}`}
                      aria-disabled={reportAction(report).disabled}
                      tabIndex={reportAction(report).disabled ? -1 : undefined}
                    >
                      <span
                        className="mf-fate-map-avatar"
                        role="img"
                        aria-label={report.starName}
                        style={{ backgroundImage: `url("${report.starPortrait}")` }}
                      />
                      <strong>{report.starName}</strong>
                      <small>{reportStatusLabel(report)}</small>
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mf-fate-map-legend" aria-label="报告状态说明">
                <span><i className="advanced" aria-hidden="true" />已完成</span>
                <span><i className="generating" aria-hidden="true" />生成中</span>
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
                    <h2>{report.title}</h2><p>{report.status === "complete" ? "完整文字报告已生成" : report.status === "generating" ? "报告正在生成" : "报告需要重新生成"}</p>
                  </div>
                  <div className="mf-report-card-result">
                    <span>{report.status === "complete" ? "回看本次选择的完整解读" : "保留了本次全部选择"}</span>
                    <div className="mf-report-card-actions">
                      <Link href={`/home/relationship-profile/result/${report.id}`}>查看画像 <span>→</span></Link>
                      <button type="button" onClick={() => void confirmDelete(report)} aria-label={`删除关系画像：${report.title}`}>删除</button>
                    </div>
                  </div>
                </article>
              );
            }
            const action = reportAction(report);
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
                      {reportStatusLabel(report)}
                    </span>
                    <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                  </div>
                  <h2>{report.starName}</h2>
                  <p>{report.status === "advanced" ? "测试已完成，完整结果可随时查看" : report.status === "generating" ? "正在为你生成这位偶像的专属题目" : "专属题目已经准备好，等待你完成测试"}</p>
                </div>
                <div className="mf-report-card-result">
                  <span>{report.status === "advanced" ? "查看完整解读" : report.status === "generating" ? "可以离开页面，完成后继续" : "继续完成专属测试"}</span>
                  <div className="mf-report-card-actions">
                    {action.disabled
                      ? <button className="mf-report-generation-disabled" type="button" disabled>生成中</button>
                      : <Link href={action.href}>{action.label} <span>→</span></Link>}
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
