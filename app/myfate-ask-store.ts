// 追问对话持久化:会话按(用户,明星,报告类型)唯一;消息支持失败重试与分页。
import { createSupabaseAdminClient } from "./api/auth/server";

export type AskRole = "user" | "assistant";

export type AskMessageRow = {
  id: number;
  role: AskRole;
  content: string;
  status: "sending" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

type ConversationRow = {
  id: string;
  summary: string;
  summarized_count: number;
  message_count: number;
  last_message_at: string;
};

export type AskConversation = {
  id: string;
  summary: string;
  summarizedCount: number;
  messageCount: number;
  lastMessageAt: string;
};

const PAGE_SIZE = 20;
const CONTEXT_RECENT = 16;
const SUMMARY_TRIGGER = 40;

function mapConversation(row: ConversationRow): AskConversation {
  return {
    id: row.id,
    summary: row.summary,
    summarizedCount: row.summarized_count,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at,
  };
}

const CONVERSATION_SELECT = "id,summary,summarized_count,message_count,last_message_at";

export async function getOrCreateConversation(userId: string, starId: string, reportType: "bazi" | "dual"): Promise<AskConversation> {
  const supabase = createSupabaseAdminClient();
  const query = () => supabase
    .from("ask_conversations")
    .select(CONVERSATION_SELECT)
    .eq("user_id", userId)
    .eq("star_id", starId)
    .eq("report_type", reportType)
    .maybeSingle();

  const existing = await query();
  if (existing.data) return mapConversation(existing.data as unknown as ConversationRow);

  const inserted = await supabase
    .from("ask_conversations")
    .insert({ user_id: userId, star_id: starId, report_type: reportType })
    .select(CONVERSATION_SELECT)
    .maybeSingle();
  if (inserted.data) return mapConversation(inserted.data as unknown as ConversationRow);
  // 并发下唯一键冲突:再读一次
  const again = await query();
  if (again.data) return mapConversation(again.data as unknown as ConversationRow);
  throw inserted.error ?? new Error("ASK_CONVERSATION_UPSERT_FAILED");
}

export async function listMessages(conversationId: string, before?: number): Promise<{ messages: AskMessageRow[]; hasMore: boolean }> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("ask_messages")
    .select("id,role,content,status,error_message,created_at")
    .eq("conversation_id", conversationId)
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (before) query = query.lt("id", before);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{ id: number; role: AskRole; content: string; status: AskMessageRow["status"]; error_message: string | null; created_at: string }>;
  const hasMore = rows.length > PAGE_SIZE;
  const messages = rows.slice(0, PAGE_SIZE)
    .map((row) => ({ id: row.id, role: row.role, content: row.content, status: row.status, errorMessage: row.error_message, createdAt: row.created_at }))
    .reverse();
  return { messages, hasMore };
}

// AI 上下文:较早对话摘要 + 最近 CONTEXT_RECENT 条,避免请求随历史无限增大。
export async function contextMessages(conversation: AskConversation): Promise<Array<{ role: AskRole; content: string }>> {
  const { messages } = await listRecent(conversation.id, CONTEXT_RECENT);
  return messages.map((message) => ({ role: message.role, content: message.content }));
}

async function listRecent(conversationId: string, limit: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ask_messages")
    .select("id,role,content,status")
    .eq("conversation_id", conversationId)
    .eq("status", "completed")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: number; role: AskRole; content: string }>;
  return { messages: rows.map((row) => ({ ...row, status: "completed" as const })).reverse() };
}

export async function appendExchange(conversationId: string, userId: string, userContent: string, assistantContent: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("ask_append_messages", {
    p_conversation_id: conversationId,
    p_user_id: userId,
    p_user_content: userContent,
    p_assistant_content: assistantContent,
  });
  if (error) throw error;
}

export async function saveFailedQuestion(conversationId: string, userId: string, question: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ask_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role: "user", content: question, status: "failed", error_message: "AI_UNAVAILABLE" })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("ASK_SAVE_FAILED");
  return (data as unknown as { id: number }).id;
}

export async function getMessageById(messageId: number, userId: string): Promise<{ id: number; conversationId: string; content: string; status: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("ask_messages")
    .select("id,conversation_id,content,status")
    .eq("id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as { id: number; conversation_id: string; content: string; status: string } | null)
    ? { id: (data as unknown as { id: number; conversation_id: string; content: string; status: string }).id,
        conversationId: (data as unknown as { conversation_id: string }).conversation_id,
        content: (data as unknown as { content: string }).content,
        status: (data as unknown as { status: string }).status }
    : null;
}

// 重试成功:原用户消息恢复 completed,并追加回答。
export async function completeRetry(conversationId: string, messageId: number, assistantContent: string) {
  const supabase = createSupabaseAdminClient();
  const { error: markError } = await supabase
    .from("ask_messages")
    .update({ status: "completed", error_message: null })
    .eq("id", messageId);
  if (markError) throw markError;
  const { data: conv } = await supabase
    .from("ask_conversations")
    .select("message_count")
    .eq("id", conversationId)
    .maybeSingle();
  const { error } = await supabase
    .from("ask_messages")
    .insert({ conversation_id: conversationId, user_id: (await messageUserId(messageId)) ?? "", role: "assistant", content: assistantContent, status: "completed" });
  if (error) throw error;
  await supabase
    .from("ask_conversations")
    .update({ message_count: ((conv as unknown as { message_count: number } | null)?.message_count ?? 0) + 1, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

async function messageUserId(messageId: number) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("ask_messages").select("user_id").eq("id", messageId).maybeSingle();
  return (data as unknown as { user_id: string } | null)?.user_id ?? null;
}

export async function summarizeIfNeeded(conversation: AskConversation, buildSummary: (older: Array<{ role: AskRole; content: string }>, previous: string) => Promise<string>) {
  if (conversation.messageCount - conversation.summarizedCount < SUMMARY_TRIGGER) return;
  const older = await listMessagesBefore(conversation.id, conversation.messageCount - CONTEXT_RECENT);
  if (!older.length) return;
  const summary = await buildSummary(older, conversation.summary);
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("ask_conversations")
    .update({ summary, summarized_count: conversation.messageCount - CONTEXT_RECENT, updated_at: new Date().toISOString() })
    .eq("id", conversation.id);
}

async function listMessagesBefore(conversationId: string, keepFromEnd: number) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("ask_messages")
    .select("id,role,content")
    .eq("conversation_id", conversationId)
    .eq("status", "completed")
    .order("id", { ascending: false })
    .limit(1000);
  const rows = ((data ?? []) as Array<{ id: number; role: AskRole; content: string }>).reverse();
  return rows.slice(0, Math.max(0, rows.length - keepFromEnd)).map((row) => ({ role: row.role, content: row.content }));
}

export async function clearConversation(userId: string, starId: string, reportType: "bazi" | "dual") {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("ask_conversations")
    .delete()
    .eq("user_id", userId)
    .eq("star_id", starId)
    .eq("report_type", reportType);
}
