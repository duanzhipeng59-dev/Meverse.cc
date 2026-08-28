"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { AdminCelebrity, AdminQuestion } from "../../../api/admin/content/data";
import styles from "./studio.module.css";

type Content = { celebrities: AdminCelebrity[]; questions: AdminQuestion[] };
type Tab = "celebrities" | "questions";

const emptyCelebrity: AdminCelebrity = {
  id: "", name: "", role: "艺人 · 舞台创作者", tagline: "", description: "",
  relationshipStyle: "", focus: "", mbti: "", birthDate: "", threePillars: "",
  traits: [], categories: [], portraitUrl: "", reportPrompt: "", published: true,
  workspacePosition: null, homepageFeatured: false, homepagePosition: null,
};

function emptyQuestion(starId: string): AdminQuestion {
  return {
    id: "", starId, code: "", eyebrow: "关系情境", question: "", dimension: "security",
    options: [0, 1, 2, 3].map((value) => ({ label: "", value })), enabled: true, position: 1,
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || "request_failed");
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
  const [tab, setTab] = useState<Tab>("celebrities");
  const [selectedStarId, setSelectedStarId] = useState(initialContent.celebrities[0]?.id ?? "relationship-profile");
  const [celebrityDraft, setCelebrityDraft] = useState<AdminCelebrity | null>(initialContent.celebrities[0] ?? null);
  const [questionDraft, setQuestionDraft] = useState<AdminQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedQuestions = useMemo(
    () => content.questions.filter((question) => question.starId === selectedStarId).sort((a, b) => a.position - b.position),
    [content.questions, selectedStarId],
  );

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

  function selectCelebrity(celebrity: AdminCelebrity) {
    setCelebrityDraft({ ...celebrity });
    setSelectedStarId(celebrity.id);
    setQuestionDraft(null);
  }

  async function saveCelebrity() {
    if (!celebrityDraft) return;
    await run(async () => {
      const creating = !content.celebrities.some((item) => item.id === celebrityDraft.id);
      await api("/api/admin/content" + (creating ? "" : `/celebrities/${encodeURIComponent(celebrityDraft.id)}`), {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify(creating ? { kind: "celebrity", ...celebrityDraft } : celebrityDraft),
      });
      await reload(creating ? "明星卡片已创建并同步" : "明星卡片已保存并同步");
      setSelectedStarId(celebrityDraft.id);
    });
  }

  async function deleteCelebrity() {
    if (!celebrityDraft || !content.celebrities.some((item) => item.id === celebrityDraft.id)) return;
    if (!window.confirm(`确认删除 ${celebrityDraft.name}？其全部题目也会一起删除。`)) return;
    await run(async () => {
      await api(`/api/admin/content/celebrities/${encodeURIComponent(celebrityDraft.id)}`, { method: "DELETE" });
      const latest = await api<Content>("/api/admin/content", { cache: "no-store" });
      setContent(latest);
      const next = latest.celebrities[0] ?? null;
      setCelebrityDraft(next);
      setSelectedStarId(next?.id ?? "relationship-profile");
      setNotice("明星卡片与对应题目已从线上删除");
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

  async function saveQuestion() {
    if (!questionDraft) return;
    await run(async () => {
      const creating = !questionDraft.id;
      await api(creating ? "/api/admin/content" : `/api/admin/content/questions/${encodeURIComponent(questionDraft.id)}`, {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify(creating ? { kind: "question", ...questionDraft } : questionDraft),
      });
      await reload(creating ? "题目已创建并同步" : "题目已保存并同步");
      setQuestionDraft(null);
    });
  }

  async function deleteQuestion() {
    if (!questionDraft?.id || !window.confirm("确认删除这道题？删除后产品端将不再展示。")) return;
    await run(async () => {
      await api(`/api/admin/content/questions/${encodeURIComponent(questionDraft.id)}`, { method: "DELETE" });
      await reload("题目已从线上删除");
      setQuestionDraft(null);
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><span className={styles.brand}>M</span><div><p>MYFATE STUDIO</p><h1>内容控制台</h1></div></div>
        <small>{adminEmail}</small>
      </header>

      <nav className={styles.tabs} aria-label="后台内容分类">
        <button className={tab === "celebrities" ? styles.active : ""} onClick={() => setTab("celebrities")}>明星卡片</button>
        <button className={tab === "questions" ? styles.active : ""} onClick={() => setTab("questions")}>题库管理</button>
      </nav>

      {notice && <div className={styles.notice}>{notice}</div>}

      {tab === "celebrities" ? (
        <section className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sideHeading}><strong>{content.celebrities.length} 张卡片</strong><button onClick={() => setCelebrityDraft({ ...emptyCelebrity })}>＋ 添加</button></div>
            {content.celebrities.map((celebrity) => (
              <button className={`${styles.starRow} ${celebrityDraft?.id === celebrity.id ? styles.selected : ""}`} key={celebrity.id} onClick={() => selectCelebrity(celebrity)}>
                <span style={{ backgroundImage: `url("${celebrity.portraitUrl}")` }} />
                <div><strong>{celebrity.name}</strong><small>{celebrity.published ? "已上架" : "未上架"} · 排序 {celebrity.workspacePosition ?? "—"}</small></div>
              </button>
            ))}
          </aside>

          <div className={styles.editor}>
            {!celebrityDraft ? <div className={styles.empty}>选择或添加一张明星卡片</div> : <>
              <div className={styles.editorTitle}><div><p>CELEBRITY PROFILE</p><h2>{celebrityDraft.name || "新明星卡片"}</h2></div><div className={styles.actions}><button disabled={busy} onClick={saveCelebrity}>保存卡片</button>{content.celebrities.some((item) => item.id === celebrityDraft.id) && <button className={styles.danger} disabled={busy} onClick={deleteCelebrity}>删除</button>}</div></div>
              <div className={styles.formGrid}>
                <label>英文 ID<input value={celebrityDraft.id} disabled={content.celebrities.some((item) => item.id === celebrityDraft.id)} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, id: event.target.value })} /></label>
                <label>姓名<input value={celebrityDraft.name} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, name: event.target.value })} /></label>
                <label>身份说明<input value={celebrityDraft.role} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, role: event.target.value })} /></label>
                <label>MBTI<input value={celebrityDraft.mbti} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, mbti: event.target.value.toUpperCase() })} /></label>
                <label>出生日期<input value={celebrityDraft.birthDate} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, birthDate: event.target.value })} /></label>
                <label>三柱<input value={celebrityDraft.threePillars} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, threePillars: event.target.value })} /></label>
                <label>展示排序<input type="number" min="1" value={celebrityDraft.workspacePosition ?? ""} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, workspacePosition: Number(event.target.value) || null })} /></label>
                <label>首页排序<input type="number" min="1" value={celebrityDraft.homepagePosition ?? ""} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, homepagePosition: Number(event.target.value) || null })} /></label>
                <label className={styles.full}>卡片标签<input value={csv(celebrityDraft.traits)} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, traits: splitList(event.target.value) })} placeholder="温柔、清醒、慢热" /></label>
                <label className={styles.full}>一句话标签<input value={celebrityDraft.tagline} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, tagline: event.target.value })} /></label>
                <label className={styles.full}>人物描述<textarea value={celebrityDraft.description} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, description: event.target.value })} /></label>
                <label className={styles.full}>情感人格<textarea value={celebrityDraft.relationshipStyle} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, relationshipStyle: event.target.value })} /></label>
                <label className={styles.full}>着重的事<textarea value={celebrityDraft.focus} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, focus: event.target.value })} /></label>
                <label className={styles.full}>专属报告 Prompt<textarea className={styles.prompt} value={celebrityDraft.reportPrompt} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, reportPrompt: event.target.value })} /></label>
                <label className={styles.full}>肖像地址<input value={celebrityDraft.portraitUrl} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, portraitUrl: event.target.value })} /><input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPortrait} /></label>
                <label className={styles.check}><input type="checkbox" checked={celebrityDraft.published} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, published: event.target.checked })} />产品端上架</label>
                <label className={styles.check}><input type="checkbox" checked={celebrityDraft.homepageFeatured} onChange={(event) => setCelebrityDraft({ ...celebrityDraft, homepageFeatured: event.target.checked })} />首页展示</label>
              </div>
            </>}
          </div>
        </section>
      ) : (
        <section className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.selectWrap}><label>选择题库<select value={selectedStarId} onChange={(event) => { setSelectedStarId(event.target.value); setQuestionDraft(null); }}><option value="relationship-profile">行为画像分析</option>{content.celebrities.map((star) => <option value={star.id} key={star.id}>{star.name}</option>)}</select></label></div>
            <div className={styles.sideHeading}><strong>{selectedQuestions.length} 道题</strong><button onClick={() => setQuestionDraft(emptyQuestion(selectedStarId))}>＋ 添加</button></div>
            {selectedQuestions.map((question) => <button className={`${styles.questionRow} ${questionDraft?.id === question.id ? styles.selected : ""}`} key={question.id} onClick={() => setQuestionDraft({ ...question, options: question.options.map((option) => ({ ...option })) })}><small>{question.position} · {question.enabled ? "启用" : "停用"}</small><strong>{question.question}</strong></button>)}
          </aside>
          <div className={styles.editor}>
            {!questionDraft ? <div className={styles.empty}>选择一道题进行修改，保存后立即同步产品端</div> : <>
              <div className={styles.editorTitle}><div><p>QUESTION EDITOR</p><h2>{questionDraft.id ? `第 ${questionDraft.position} 题` : "添加新题"}</h2></div><div className={styles.actions}><button disabled={busy} onClick={saveQuestion}>保存题目</button>{questionDraft.id && <button className={styles.danger} disabled={busy} onClick={deleteQuestion}>删除</button>}</div></div>
              <div className={styles.formGrid}>
                <label>题目编号<input value={questionDraft.code} disabled={Boolean(questionDraft.id)} onChange={(event) => setQuestionDraft({ ...questionDraft, code: event.target.value })} /></label>
                <label>排序<input type="number" min="1" value={questionDraft.position} onChange={(event) => setQuestionDraft({ ...questionDraft, position: Number(event.target.value) || 1 })} /></label>
                <label>小标题<input value={questionDraft.eyebrow} onChange={(event) => setQuestionDraft({ ...questionDraft, eyebrow: event.target.value })} /></label>
                <label>数据维度<select value={questionDraft.dimension} onChange={(event) => setQuestionDraft({ ...questionDraft, dimension: event.target.value })}>{["security", "expression", "independence", "conflict", "novelty", "boundaries", "support", "rhythm"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className={styles.full}>题目<textarea value={questionDraft.question} onChange={(event) => setQuestionDraft({ ...questionDraft, question: event.target.value })} /></label>
                <label className={styles.full}>回答选项（每行一个）<textarea className={styles.options} value={questionDraft.options.map((option) => option.label).join("\n")} onChange={(event) => { const labels = event.target.value.split("\n"); setQuestionDraft({ ...questionDraft, options: labels.map((label, index) => ({ label, value: questionDraft.options[index]?.value ?? index })) }); }} /></label>
                <label className={styles.check}><input type="checkbox" checked={questionDraft.enabled} onChange={(event) => setQuestionDraft({ ...questionDraft, enabled: event.target.checked })} />启用这道题</label>
              </div>
            </>}
          </div>
        </section>
      )}
    </main>
  );
}
