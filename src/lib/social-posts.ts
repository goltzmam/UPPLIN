import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MAX_POST_MEDIA_SIZE = 50 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export function getPostMediaValidationError(file: File) {
  if (file.size > MAX_POST_MEDIA_SIZE) {
    return "A mídia deve ter no máximo 50MB.";
  }

  if (file.type.startsWith("image/")) {
    return null;
  }

  if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return null;
  }

  if (file.type === "video/quicktime") {
    return "Vídeos .mov não são suportados. Use MP4 ou WebM.";
  }

  return "Formato de mídia não suportado. Envie imagem ou vídeo MP4/WebM.";
}

export async function uploadUserPostMedia(userId: string, file: File) {
  const validationError = getPostMediaValidationError(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("user-posts")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error("Não foi possível enviar a mídia do post.");
  }

  const { data } = supabase.storage.from("user-posts").getPublicUrl(fileName);

  return {
    mediaUrl: data.publicUrl,
    mediaType: file.type.startsWith("image/") ? "image" : "video",
    storagePath: fileName,
  } as const;
}

export async function createUserPost({
  userId,
  content,
  file,
  eventId,
}: {
  userId: string;
  content: string;
  file?: File | null;
  eventId?: string | null;
}) {
  const trimmedContent = content.trim();

  if (!trimmedContent && !file) {
    throw new Error("Adicione um texto, imagem ou vídeo para publicar.");
  }

  let mediaUrl: string | null = null;
  let mediaType: "image" | "video" | null = null;
  let storagePath: string | null = null;

  if (file) {
    const upload = await uploadUserPostMedia(userId, file);
    mediaUrl = upload.mediaUrl;
    mediaType = upload.mediaType;
    storagePath = upload.storagePath;
  }

  const { data, error } = await supabase
    .from("user_posts")
    .insert({
      user_id: userId,
      content: trimmedContent || null,
      media_url: mediaUrl,
      media_type: mediaType,
      event_id: eventId || null,
    })
    .select("id, event_id, moderation_status")
    .single();

  if (error) {
    if (storagePath) await supabase.storage.from("user-posts").remove([storagePath]);
    throw new Error("Não foi possível publicar agora. Tente novamente.");
  }

  return data;
}

export async function invalidateSocialQueries(queryClient: QueryClient, userId?: string | null) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["social-feed"] }),
    queryClient.invalidateQueries({ queryKey: ["user-posts"] }),
    queryClient.invalidateQueries({ queryKey: ["event-checkins"] }),
    userId
      ? queryClient.invalidateQueries({ queryKey: ["social-feed", userId] })
      : Promise.resolve(),
    userId
      ? queryClient.invalidateQueries({ queryKey: ["user-posts", userId] })
      : Promise.resolve(),
  ]);
}
export async function deleteUserPost(postId: string, userId: string) {
  const { data: post, error: lookupError } = await supabase.from("user_posts").select("id, media_url").eq("id", postId).eq("user_id", userId).single();
  if (lookupError || !post) throw new Error("Não foi possível localizar seu post.");
  const { data, error } = await supabase.from("user_posts").delete().eq("id", postId).eq("user_id", userId).select("id").single();
  if (error || !data) throw new Error("Não foi possível excluir seu post.");
  if (post.media_url) {
    const url = new URL(post.media_url);
    const prefix = "/storage/v1/object/public/user-posts/";
    if (url.origin === new URL(import.meta.env.VITE_SUPABASE_URL).origin && url.pathname.startsWith(prefix)) {
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      if (path.startsWith(userId + "/")) {
        const { error: storageError } = await supabase.storage.from("user-posts").remove([path]);
        if (storageError) throw new Error("Post excluído, mas não conseguimos remover a mídia. Fale com o suporte.");
      }
    }
  }
}
