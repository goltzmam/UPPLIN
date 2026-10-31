import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
export type ReportKind = "post" | "comment" | "profile" | "review";
export const REPORT_REASONS = [
  ["sexual", "Conteúdo sexual ou exploração"], ["violence", "Violência ou ameaça"],
  ["hate", "Discurso de ódio"], ["harassment", "Assédio ou intimidação"],
  ["fraud", "Fraude ou golpe"], ["spam", "Spam"], ["other", "Outro motivo"],
] as const;
export interface BlockedUser { user_id: string; display_name: string; created_at: string }
export function useBlockedUsers() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["blocked-users", user?.id], enabled: !!user,
    queryFn: async () => { const { data, error } = await supabase.rpc("my_blocked_users");if (error) throw error;return (data || []) as BlockedUser[]; },
  });
}
export function useSafetyRefresh() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}
export interface ModerationReport { id: string; target_kind: ReportKind; target_id: string; target_name: string | null; reason: string; details: string; status: string; created_at: string; due_at: string; evidence: { content?: string; name?: string; media_url?: string; media_type?: string; photo_url?: string }; resolution_note: string }
export interface PendingContent { kind: ReportKind | "organizer"; id: string; author_id: string; content: string | null; media_url: string | null; cover_url?: string | null; label: string; created_at: string }
export interface ModerationQueue { reports: ModerationReport[]; pending: PendingContent[] }
export async function loadModerationQueue(): Promise<ModerationQueue> {
  const { data, error } = await supabase.rpc("moderation_queue");if (error) throw error;
  return data as unknown as ModerationQueue;
}

export { safeMediaUrl } from "./safety-media";
