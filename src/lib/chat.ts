import { supabase } from "@/integrations/supabase/client";

export interface ChatIdentity {
  id: string;
  full_name: string;
  photo_url: string | null;
  cover_photo_url?: string | null;
  profile_path?: string | null;
  subtitle?: string;
  is_organizer?: boolean;
  is_support?: boolean;
}
export interface ChatConversation {
  id: string; type: string; subject: string | null; event_id: string | null;
  participant_1_id: string; participant_2_id: string; created_at: string; updated_at: string;
  event: { title: string } | null;
  participants: Record<string, ChatIdentity>;
  other_participant?: ChatIdentity;
  last_message?: { content: string; created_at: string; sender_id: string } | null;
  message_count: number; unread_count: number;
}
export const unavailableIdentity = (id: string): ChatIdentity => ({ id, full_name: "Conta indisponível", photo_url: null });

export async function loadChatIdentities(ids: string[]): Promise<Record<string, Record<string, ChatIdentity>>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.rpc("get_chat_identities", { p_conversation_ids: ids });
  if (error) throw error;
  const result: Record<string, Record<string, ChatIdentity>> = {};
  for (const row of data || []) {
    result[row.conversation_id] ??= {};
    result[row.conversation_id][row.user_id] = { ...row, id: row.user_id, subtitle: row.is_support ? "Equipe oficial" : row.is_organizer ? "Organizador" : "Participante" };
  }
  return result;
}

export async function loadConversations(userId: string, options: { all?: boolean; type?: string; id?: string } = {}) {
  let query = supabase.from("conversations").select("*, event:events(title)").order("updated_at", { ascending: false });
  if (!options.all) query = query.or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
  if (options.type && options.type !== "all") query = query.eq("type", options.type);
  if (options.id) query = query.eq("id", options.id);
  const { data, error } = await query;
  if (error) throw error;
  const identities = await loadChatIdentities((data || []).map(c => c.id));
  return Promise.all((data || []).map(async c => {
    const [last, count, unread] = await Promise.all([
      supabase.from("messages").select("content,created_at,sender_id").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("messages").select("id", { head: true, count: "exact" }).eq("conversation_id", c.id),
      supabase.from("messages").select("id", { head: true, count: "exact" }).eq("conversation_id", c.id).neq("sender_id", userId).is("read_at", null),
    ]);
    for (const r of [last, count, unread]) if (r.error) throw r.error;
    const participants = identities[c.id] || {};
    const otherId = c.participant_1_id === userId ? c.participant_2_id : c.participant_1_id;
    return { ...c, participants, other_participant: participants[otherId] || unavailableIdentity(otherId), last_message: last.data, message_count: count.count || 0, unread_count: unread.count || 0 } as ChatConversation;
  }));
}

export async function startChat(type: string, eventId?: string) {
  const { data, error } = await supabase.rpc("start_chat", { p_type: type, ...(eventId ? { p_event_id: eventId } : {}) });
  if (error) throw error;
  return data;
}
