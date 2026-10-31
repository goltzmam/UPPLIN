import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SafetyActions } from "./SafetyActions";
export function OrganizerSafetyActions({ organizerId }: { organizerId: string }) {
  const { data } = useQuery({queryKey:["organizer-safety-owner",organizerId],queryFn:async()=>{
    const { data,error }=await supabase.from("organizer_accounts_feed").select("owner_user_id").eq("id",organizerId).maybeSingle();if(error)throw error;return data;
  }});
  return data?.owner_user_id ? <SafetyActions userId={data.owner_user_id} /> : null;
}
