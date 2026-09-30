"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAuth } from "../../auth-context";
import { parseFormulaResult } from "../../myfate-generated-test-types";
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
  if (report.starId === "personal-reading") {
    return { label: "查看报告", href: `/home/personal-reading/${report.id}`, disabled: false };
  }
  if (report.status === "advanced") return { label: "查看报告", href: `/home/relationship-test/${report.id}`, disabled: false };
  if (report.status === "generating") return { label: "生成中", href: "", disabled: true };
  return {
    label: "重新合盘",
    href: `/home/relationship-test/${report.starId}/test?report=${encodeURIComponent(report.id)}`,
    disabled: false,
  };
}

function reportStatusLabel(report: SavedReport) {
  return report.status === "generating" ? "生成中" : "已完成";
}

function relationshipRoleLabel(report: SavedReport) {
  const result = parseFormulaResult(report.reportText);
  if (result?.version === 4) return result.relationshipType;
  if (result?.version === 3) return "合盘分析";
  if (result?.version === 2) return result.primaryRole.shortLabel;
  if (result?.version === 1) return "历史正缘结果";
  return report.status === "generating" ? "生成中" : "待完成";
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
          <h1>每一种关系，都有自己的位置</h1>
          <p>这里保存你完成过的明星合盘分析与历史画像，每次合盘都会形成一份独立记录。</p>
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
          <h2>你还没有生成任何报告</h2>
          <p>可以从明星合盘开始探索。</p>
        </section>
      ) : (
        <>

          <div className="mf-report-list-heading">
            <div>
              <span>历史记录</span>
              <h2>全部报告</h2>
            </div>
            <p>同一明星的每次合盘都会单独保留。</p>
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
            if (report.starId === "personal-reading") {
              return (
                <article className="mf-report-card mf-personal-reading-card" key={report.id}>
                  <div className="mf-report-card-copy">
                    <div className="mf-report-card-meta">
                      <span className="profile">个人解读</span>
                      <span className={report.status}>{report.status === "generating" ? "待完善" : "解读完成"}</span>
                      <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                    </div>
                    <h2>{report.starName}</h2>
                  </div>
                  <div className="mf-report-card-result">
                    <span>查看个人解读报告</span>
                    <div className="mf-report-card-actions">
                      {action.disabled
                        ? <button className="mf-report-generation-disabled" type="button" disabled>生成中</button>
                        : <Link href={action.href}>{action.label} <span>→</span></Link>}
                      <button type="button" onClick={() => void confirmDelete(report)} aria-label="删除个人八字解读报告">删除</button>
                    </div>
                  </div>
                </article>
              );
            }
            return (
              <article className="mf-report-card" key={report.id}>
                <div className="mf-report-card-copy">
                  <div className="mf-report-card-meta">
                    <span className={report.status}>
                      {reportStatusLabel(report)}
                    </span>
                    <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                  </div>
                  <h2>{report.starName}</h2>
                </div>
                <div className="mf-report-card-result">
                  <span>{report.status === "advanced" ? "查看完整吠陀合盘分析" : report.status === "generating" ? "合盘分析生成中" : "重新生成合盘分析"}</span>
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

      <p className="mf-reports-storage-note">登录状态下生成的报告（合盘与个人解读）会保存到你的账户。</p>
    </div>
  );
}
