"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import type { AdminCelebrity, AdminCelebritySummary } from "../../../api/admin/content/data";
import styles from "./studio.module.css";

type Content = { celebrities: AdminCelebritySummary[] };
type RequiredField = "id" | "name" | "mbti" | "birthDate";

const errorMessages: Record<string, string> = {
  missing_required_fields: "请补全必填信息",
  invalid_mbti: "MBTI 格式不正确",
  invalid_birth_date: "出生日期格式不正确",
  invalid_field_value: "部分内容不符合填写要求",
  invalid_number: "排序或推荐度不是有效数字",
  duplicate_content: "这个英文 ID 已经存在",
  content_schema_mismatch: "线上数据结构需要更新，请联系管理员",
  admin_service_unavailable: "保存服务暂时不可用，请稍后重试",
};

const emptyCelebrity: AdminCelebrity = {
  id: "", name: "", role: "艺人 · 舞台创作者", tagline: "", description: "",
  nameEn: "", nameZh: "", gender: "unknown", deathDate: "",
  mbtiSourceType: "unknown", mbtiConfidence: "unknown", birthDateConfidence: "unknown",
  isHistoricalFigure: false, isDeceased: false, portraitRisk: "unknown", commercialDemoRisk: "unknown",
  enableBazi: true, enableMbti: true, recommendationLevel: null,
  relationshipStyle: "", focus: "", mbti: "", birthDate: "", threePillars: "",
  traits: [], categories: [], portraitUrl: "", reportPrompt: "", published: false,
  workspacePosition: null, homepageFeatured: false, homepagePosition: null,
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(errorMessages[body.error ?? ""] || body.error || "请求失败，请稍后重试");
  return body;
}

function csv(value: string[]) {
  return value.join("、");
}

function splitList(value: string) {
  return value.split(/[、,，\n]/u).map((item) => item.trim()).filter(Boolean);
}

export default function AdminContentStudio({ initialContent, adminEmail }: { initialContent: Content; adminEmail: string }) {
  const [content, setContent] = useState(initialContent);
  const [celebrityDraft, setCelebrityDraft] = useState<AdminCelebrity | null>(null);
  const [activeId, setActiveId] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredField, string>>>({});
  const detailRequest = useRef(0);
  const savedDraft = useRef<AdminCelebrity | null>(null);

  async function reload(message = "已同步到线上产品") {
    const latest = await api<Content>("/api/admin/content", { cache: "no-store" });
    setContent(latest);
    setNotice(message);
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try { await task(); } catch (error) {
      setNotice(error instanceof Error ? `操作失败：${error.message}` : "操作失败");
    } finally { setBusy(false); }
  }

  async function openCelebrity(celebrity: AdminCelebritySummary) {
    const requestId = ++detailRequest.current;
    setActiveId(celebrity.id);
    setLoadingDetail(true);
    setNotice("");
    try {
      const result = await api<{ celebrity: AdminCelebrity }>(`/api/admin/content/celebrities/${encodeURIComponent(celebrity.id)}`, { cache: "no-store" });
      if (detailRequest.current === requestId) {
        setCelebrityDraft(result.celebrity);
        savedDraft.current = result.celebrity;
        setFieldErrors({});
      }
    } catch (error) {
      if (detailRequest.current === requestId) setNotice(error instanceof Error ? `读取失败：${error.message}` : "读取失败");
    } finally {
      if (detailRequest.current === requestId) setLoadingDetail(false);
    }
  }

  function createCelebrity() {
    detailRequest.current += 1;
    setActiveId("");
    setLoadingDetail(false);
    setCelebrityDraft({ ...emptyCelebrity });
    savedDraft.current = null;
    setFieldErrors({});
  }

  function validateCelebrity(draft: AdminCelebrity) {
    const errors: Partial<Record<RequiredField, string>> = {};
    if (!draft.id.trim()) errors.id = "请填写英文 ID";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(draft.id.trim())) errors.id = "只能使用小写字母、数字和连字符";
    if (!draft.name.trim()) errors.name = "请填写展示名称";
    if (!draft.mbti.trim()) errors.mbti = "请选择或填写 MBTI";
    else if (!/^(E|I)(N|S)(T|F)(J|P)$/u.test(draft.mbti.trim().toUpperCase())) errors.mbti = "请输入正确的四位 MBTI";
    if (!draft.birthDate.trim()) errors.birthDate = "请填写出生日期";
    else if (!/^\d{4}-\d{2}-\d{2}$/u.test(draft.birthDate.trim())) errors.birthDate = "请使用 YYYY-MM-DD 格式";
    return errors;
  }

  function clearFieldError(field: RequiredField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changedFields(current: AdminCelebrity, saved: AdminCelebrity) {
    return Object.fromEntries(Object.entries(current).filter(([key, value]) => key !== "id"
      && JSON.stringify(value) !== JSON.stringify(saved[key as keyof AdminCelebrity])));
  }

  function compactNewCelebrity(draft: AdminCelebrity) {
    return Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== null
      && (!Array.isArray(value) || value.length > 0)));
  }

  async function saveCelebrity() {
    if (!celebrityDraft) return;
    const errors = validateCelebrity(celebrityDraft);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setNotice("请先补全标红的必填信息");
      document.getElementById(`celebrity-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    setFieldErrors({});
    await run(async () => {
      const creating = !content.celebrities.some((item) => item.id === celebrityDraft.id);
      const changed = savedDraft.current ? changedFields(celebrityDraft, savedDraft.current) : {};
      if (!creating && !Object.keys(changed).length) {
        setNotice("没有需要保存的修改");
        return;
      }
      const result = await api<{ id?: string }>("/api/admin/content" + (creating ? "" : `/celebrities/${encodeURIComponent(celebrityDraft.id)}`), {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify(creating ? { kind: "celebrity", ...compactNewCelebrity(celebrityDraft) } : changed),
      });
      if (creating && result.id) {
        setActiveId(result.id);
        const detail = await api<{ celebrity: AdminCelebrity }>(`/api/admin/content/celebrities/${encodeURIComponent(result.id)}`, { cache: "no-store" });
        setCelebrityDraft(detail.celebrity);
        savedDraft.current = detail.celebrity;
      } else {
        savedDraft.current = celebrityDraft;
      }
      await reload(creating ? "明星卡片已创建并同步" : "明星卡片已保存并同步");
    });
  }

  async function deleteCelebrity() {
    if (!celebrityDraft || !content.celebrities.some((item) => item.id === celebrityDraft.id)) return;
    if (!window.confirm(`确认删除 ${celebrityDraft.name}？`)) return;
    await run(async () => {
      await api(`/api/admin/content/celebrities/${encodeURIComponent(celebrityDraft.id)}`, { method: "DELETE" });
      const latest = await api<Content>("/api/admin/content", { cache: "no-store" });
      setContent(latest);
      setCelebrityDraft(null);
      savedDraft.current = null;
      setActiveId("");
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(celebrityDraft.id);
        return next;
      });
      setNotice("明星卡片已从线上删除");
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) => current.size === content.celebrities.length
      ? new Set()
      : new Set(content.celebrities.map((item) => item.id)));
  }

  async function runBulkAction(action: "publish" | "delete") {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (action === "delete" && !window.confirm(`确认删除选中的 ${ids.length} 张明星卡片？此操作无法撤销。`)) return;
    await run(async () => {
      const result = await api<{ count: number }>("/api/admin/content/celebrities/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids }),
      });
      const latest = await api<Content>("/api/admin/content", { cache: "no-store" });
      setContent(latest);
      if (action === "delete" && activeId && selectedIds.has(activeId)) {
        setCelebrityDraft(null);
        savedDraft.current = null;
        setActiveId("");
      } else if (action === "publish" && celebrityDraft && selectedIds.has(celebrityDraft.id)) {
        setCelebrityDraft({ ...celebrityDraft, published: true });
      }
      setSelectedIds(new Set());
      setNotice(action === "publish" ? `已上架 ${result.count} 张卡片` : `已删除 ${result.count} 张卡片`);
    });
  }

  async function uploadPortrait(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !celebrityDraft?.id) return;
    await run(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("starId", celebrityDraft.id);
      const result = await api<{ url: string }>("/api/admin/content/portrait", { method: "POST", body: form });
      setCelebrityDraft((current) => current ? { ...current, portraitUrl: result.url } : current);
      setNotice("肖像已上传，点击“保存卡片”后生效");
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.brand}>M</span><div><p>MYFATE STUDIO</p><h1>明星内容控制台</h1></div></div>
        <small>{adminEmail}</small>
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sideHeading}><strong>{content.celebrities.length} 张卡片</strong><button onClick={createCelebrity}>＋ 添加</button></div>
          <div className={styles.bulkToolbar}>
            <label><input type="checkbox" checked={content.celebrities.length > 0 && selectedIds.size === content.celebrities.length} onChange={toggleAll} />全选</label>
            <span>{selectedIds.size ? `已选 ${selectedIds.size} 张` : "可多选卡片"}</span>
            {selectedIds.size > 0 && <div><button disabled={busy} onClick={() => runBulkAction("publish")}>一键上架</button><button className={styles.bulkDanger} disabled={busy} onClick={() => runBulkAction("delete")}>一键删除</button></div>}
          </div>
          {content.celebrities.map((celebrity) => (
            <div className={`${styles.starRow} ${activeId === celebrity.id ? styles.selected : ""}`} key={celebrity.id} role="button" tabIndex={0} onClick={() => void openCelebrity(celebrity)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") void openCelebrity(celebrity); }}>
              <input className={styles.selectBox} type="checkbox" aria-label={`选择 ${celebrity.name}`} checked={selectedIds.has(celebrity.id)} onChange={() => toggleSelected(celebrity.id)} onClick={(event) => event.stopPropagation()} />
              <Image src={celebrity.portraitUrl || "/historical-figure.svg"} alt="" loading="lazy" width={44} height={44} sizes="44px" unoptimized />
              <div><strong>{celebrity.name}</strong><small>{celebrity.published ? "已上架" : "未上架"} · 排序 {celebrity.workspacePosition ?? "—"}</small></div>
            </div>
          ))}
        </aside>

        <div className={styles.editor}>
          {loadingDetail ? <div className={styles.empty}><span className={styles.loader} />正在读取卡片资料</div> : !celebrityDraft ? <div className={styles.empty}>选择或添加一张明星卡片</div> : <>
            <div className={styles.editorTitle}><div><p>CELEBRITY PROFILE</p><h2>{celebrityDraft.name || "新明星卡片"}</h2></div><div className={styles.actions}><button disabled={busy} onClick={saveCelebrity}>保存卡片</button>{content.celebrities.some((item) => item.id === celebrityDraft.id) && <button className={styles.danger} disabled={busy} onClick={deleteCelebrity}>删除</button>}</div></div>
            <div className={styles.formGrid}>
              <label className={fieldErrors.id ? styles.hasError : ""}>英文 ID <span className={styles.required}>必填</span><input id="celebrity-id" value={celebrityDraft.id} disabled={content.celebrities.some((item) => item.id === celebrityDraft.id)} onChange={(event) => { setCelebrityDraft({ ...celebrityDraft, id: event.target.value.toLowerCase() }); clearFieldError("id"); }} placeholder="例如 bang-chan" aria-invalid={Boolean(fieldErrors.id)} />{fieldErrors.id && <small className={styles.fieldError}>{fieldErrors.id}</small>}</label>
              <label className={fieldErrors.name ? styles.hasError : ""}>展示名称 <span className={styles.required}>必填</span><input id="celebrity-name" maxLength={80} value={celebrityDraft.name} onChange={(event) => { setCelebrityDraft({ ...celebrityDraft, name: event.target.value }); clearFieldError("name"); }} placeholder="例如 Bang Chan" aria-invalid={Boolean(fieldErrors.name)} />{fieldErrors.name && <small className={styles.fieldError}>{fieldErrors.name}</small>}</label>
              <label className={fieldErrors.mbti ? styles.hasError : ""}>MBTI <span className={styles.required}>必填</span><input id="celebrity-mbti" maxLength={4} value={celebrityDraft.mbti} onChange={(event) => { setCelebrityDraft({ ...celebrityDraft, mbti: event.target.value.toUpperCase() }); clearFieldError("mbti"); }} placeholder="例如 INFP" aria-invalid={Boolean(fieldErrors.mbti)} />{fieldErrors.mbti && <small className={styles.fieldError}>{fieldErrors.mbti}</small>}</label>
              <label className={fieldErrors.birthDate ? styles.hasError : ""}>出生日期 <span className={styles.required}>必填</span><input id="celebrity-birthDate" value={celebrityDraft.birthDate} onChange={(event) => { setCelebrityDraft({ ...celebrityDraft, birthDate: event.target.value }); clearFieldError("birthDate"); }} placeholder="YYYY-MM-DD" aria-invalid={Boolean(fieldErrors.birthDate)} />{fieldErrors.birthDate && <small className={styles.fieldError}>{fieldErrors.birthDate}</small>}</label>
              <label className={styles.full}>肖像图片 <span className={styles.optional}>选填</span><input value={celebrityDraft.portraitUrl} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, portraitUrl: event.target.value })} placeholder="不填则使用默认头像，也可以直接上传" /><input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPortrait} /></label>
              <label className={styles.check}><input type="checkbox" checked={celebrityDraft.published} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, published: event.target.checked })} />产品端上架</label>
              <label className={styles.check}><input type="checkbox" checked={celebrityDraft.homepageFeatured} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, homepageFeatured: event.target.checked })} />首页展示</label>
              <details className={`${styles.advanced} ${styles.full}`}>
                <summary>更多选填资料 <span>不填写也可以保存</span></summary>
                <div className={styles.advancedGrid}>
                  <label>英文名<input value={celebrityDraft.nameEn} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, nameEn: event.target.value })} /></label>
                  <label>中文名<input value={celebrityDraft.nameZh} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, nameZh: event.target.value })} /></label>
                  <label>性别<select value={celebrityDraft.gender} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, gender: event.target.value as AdminCelebrity["gender"] })}><option value="unknown">未知</option><option value="female">女性</option><option value="male">男性</option><option value="other">其他</option></select></label>
                  <label>身份说明<input maxLength={120} value={celebrityDraft.role} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, role: event.target.value })} placeholder="留空使用默认说明" /></label>
                  <label>逝世日期<input value={celebrityDraft.deathDate} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, deathDate: event.target.value })} placeholder="YYYY-MM-DD" /></label>
                  <label>三柱<input value={celebrityDraft.threePillars} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, threePillars: event.target.value })} /></label>
                  <label>MBTI 来源<select value={celebrityDraft.mbtiSourceType} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, mbtiSourceType: event.target.value as AdminCelebrity["mbtiSourceType"] })}><option value="self_reported">本人自我类型</option><option value="biographical_inference">传记推定</option><option value="unknown">未知</option></select></label>
                  <label>MBTI 可信度<select value={celebrityDraft.mbtiConfidence} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, mbtiConfidence: event.target.value as AdminCelebrity["mbtiConfidence"] })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option><option value="unknown">未知</option></select></label>
                  <label>出生日期可信度<select value={celebrityDraft.birthDateConfidence} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, birthDateConfidence: event.target.value as AdminCelebrity["birthDateConfidence"] })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option><option value="unknown">未知</option></select></label>
                  <label>推荐度（1–5）<input type="number" min="1" max="5" value={celebrityDraft.recommendationLevel ?? ""} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, recommendationLevel: Number(event.target.value) || null })} /></label>
                  <label>肖像风险<select value={celebrityDraft.portraitRisk} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, portraitRisk: event.target.value as AdminCelebrity["portraitRisk"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="unknown">未知</option></select></label>
                  <label>商业演示风险<select value={celebrityDraft.commercialDemoRisk} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, commercialDemoRisk: event.target.value as AdminCelebrity["commercialDemoRisk"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option><option value="unknown">未知</option></select></label>
                  <label>展示排序<input type="number" min="1" value={celebrityDraft.workspacePosition ?? ""} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, workspacePosition: Number(event.target.value) || null })} /></label>
                  <label>首页排序<input type="number" min="1" value={celebrityDraft.homepagePosition ?? ""} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, homepagePosition: Number(event.target.value) || null })} /></label>
                  <label className={styles.full}>卡片标签<input value={csv(celebrityDraft.traits)} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, traits: splitList(event.target.value) })} placeholder="温柔、清醒、慢热" /></label>
                  <label className={styles.full}>一句话标签<input value={celebrityDraft.tagline} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, tagline: event.target.value })} /></label>
                  <label className={styles.full}>人物描述<textarea value={celebrityDraft.description} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, description: event.target.value })} /></label>
                  <label className={styles.full}>情感人格<textarea value={celebrityDraft.relationshipStyle} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, relationshipStyle: event.target.value })} /></label>
                  <label className={styles.full}>着重的事<textarea value={celebrityDraft.focus} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, focus: event.target.value })} /></label>
                  <label className={styles.full}>专属报告 Prompt<textarea className={styles.prompt} value={celebrityDraft.reportPrompt} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, reportPrompt: event.target.value })} /></label>
                  <label className={styles.check}><input type="checkbox" checked={celebrityDraft.isHistoricalFigure} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, isHistoricalFigure: event.target.checked })} />历史人物</label>
                  <label className={styles.check}><input type="checkbox" checked={celebrityDraft.isDeceased} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, isDeceased: event.target.checked })} />已故</label>
                  <label className={styles.check}><input type="checkbox" checked={celebrityDraft.enableMbti} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, enableMbti: event.target.checked })} />启用 MBTI</label>
                  <label className={styles.check}><input type="checkbox" checked={celebrityDraft.enableBazi} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, enableBazi: event.target.checked })} />启用三柱</label>
                </div>
              </details>
            </div>
          </>}
        </div>
      </section>
    </main>
  );
}
