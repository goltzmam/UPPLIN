import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Send, ArrowLeft, Shield, Building2, BadgeCheck, MessageCircle, ChevronDown, Check, CheckCheck, Circle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  _pending?: boolean;
  _failed?: boolean;
}

interface ChatWindowProps {
  conversationId: string;
  otherParticipant: {
    id: string;
    name: string;
    photo_url?: string | null;
    subtitle?: string | null;
    is_organizer?: boolean;
    is_support?: boolean;
  };
  onClose?: () => void;
  className?: string;
}

const TYPING_TIMEOUT_MS = 3500;

function dayLabel(d: Date) {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
}

export function ChatWindow({ conversationId, otherParticipant, onClose, className }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);

  // ---------- Load + realtime messages ----------
  useEffect(() => {
    let active = true;
    setMessages([]);
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (data) setMessages(data as Message[]);
    })();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            // Replace any pending optimistic from same sender with same content
            const idx = prev.findIndex((p) => p._pending && p.sender_id === m.sender_id && p.content === m.content);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = m;
              return next;
            }
            if (prev.some((p) => p.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((p) => (p.id === m.id ? { ...p, ...m } : p)));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ---------- Broadcast: typing + presence ----------
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chat-presence:${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    ch.on("broadcast", { event: "typing" }, (payload) => {
      if (payload?.payload?.userId && payload.payload.userId !== user.id) {
        setOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ online_at?: string }>>;
      const otherId = otherParticipant.id;
      const presences = state[otherId];
      setOtherOnline(!!presences && presences.length > 0);
      if (presences && presences[0]?.online_at) setOtherLastSeen(presences[0].online_at);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ online_at: new Date().toISOString() });
      }
    });

    broadcastChannelRef.current = ch;
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(ch);
      broadcastChannelRef.current = null;
    };
  }, [conversationId, user?.id, otherParticipant.id]);

  // ---------- Scroll handling ----------
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    // Snap to bottom on first load / convo switch
    scrollToBottom("auto");
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    // If user is near bottom, autoscroll; otherwise show pill
    const vp = scrollViewportRef.current;
    if (!vp) {
      scrollToBottom("smooth");
      return;
    }
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    if (distance < 120) {
      scrollToBottom("smooth");
    } else {
      const lastFromMe = messages[messages.length - 1]?.sender_id === user?.id;
      if (lastFromMe) scrollToBottom("smooth");
      else setShowJumpToBottom(true);
    }
  }, [messages, otherTyping, scrollToBottom, user?.id]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    const distance = t.scrollHeight - t.scrollTop - t.clientHeight;
    setShowJumpToBottom(distance > 240);
  }, []);

  // ---------- Mark as read ----------
  useEffect(() => {
    if (!user) return;
    const hasUnread = messages.some((m) => m.sender_id !== user.id && !m.read_at);
    if (!hasUnread) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null)
      .then(() => {});
  }, [conversationId, user, messages]);

  // ---------- Send ----------
  const send = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !user || sending) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, content })
        .select("*")
        .single();
      if (error) throw error;
      setMessages((prev) => prev.map((p) => (p.id === tempId ? (data as Message) : p)));
      supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).then(() => {});
    } catch {
      setMessages((prev) => prev.map((p) => (p.id === tempId ? { ...p, _pending: false, _failed: true } : p)));
    } finally {
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [newMessage, user, sending, conversationId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onChangeMessage = (v: string) => {
    setNewMessage(v);
    // auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
    }
    // typing broadcast (throttled)
    const now = Date.now();
    if (broadcastChannelRef.current && now - lastTypingSentAtRef.current > 1500) {
      lastTypingSentAtRef.current = now;
      broadcastChannelRef.current.send({
        type: "broadcast", event: "typing", payload: { userId: user?.id },
      }).catch(() => {});
    }
  };

  // ---------- Grouping ----------
  const groups = useMemo(() => {
    const out: Array<{ day: string; date: Date; items: Array<{ msg: Message; showAvatar: boolean; showName: boolean; isMe: boolean; tail: boolean }> }> = [];
    let prev: Message | null = null;
    for (const m of messages) {
      const d = new Date(m.created_at);
      const dayKey = format(d, "yyyy-MM-dd");
      let group = out.find((g) => format(g.date, "yyyy-MM-dd") === dayKey);
      if (!group) {
        group = { day: dayLabel(d), date: d, items: [] };
        out.push(group);
      }
      const isMe = m.sender_id === user?.id;
      const sameSenderAsPrev = !!prev && prev.sender_id === m.sender_id;
      const prevDate = prev ? new Date(prev.created_at) : null;
      const closeInTime = prevDate ? differenceInMinutes(d, prevDate) < 5 : false;
      const showAvatar = !isMe && (!sameSenderAsPrev || !closeInTime);
      const showName = !isMe && showAvatar;
      // 'tail' = last in a consecutive run from same sender
      group.items.push({ msg: m, showAvatar, showName, isMe, tail: false });
      prev = m;
    }
    // compute tail
    for (const g of out) {
      for (let i = 0; i < g.items.length; i++) {
        const cur = g.items[i];
        const next = g.items[i + 1];
        cur.tail = !next || next.msg.sender_id !== cur.msg.sender_id;
      }
    }
    return out;
  }, [messages, user?.id]);

  const RoleIcon = otherParticipant.is_support ? Shield : otherParticipant.is_organizer ? Building2 : null;

  return (
    <div className={cn("flex flex-col h-full min-h-0 bg-background border rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 border-b bg-card/60 backdrop-blur shrink-0">
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 h-9 w-9 lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={otherParticipant.photo_url || undefined} />
            <AvatarFallback className={cn(
              (otherParticipant.is_organizer || otherParticipant.is_support) && "bg-primary/15 text-primary"
            )}>
              {RoleIcon ? <RoleIcon className="h-5 w-5" /> : getInitials(otherParticipant.name)}
            </AvatarFallback>
          </Avatar>
          {otherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm sm:text-base truncate">{otherParticipant.name}</p>
            {(otherParticipant.is_organizer || otherParticipant.is_support) && (
              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate flex items-center gap-1">
            {otherTyping ? (
              <span className="text-primary font-medium animate-pulse">digitando…</span>
            ) : otherOnline ? (
              <><Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" /> online agora</>
            ) : otherLastSeen ? (
              <>visto por último {format(new Date(otherLastSeen), "HH:mm")}</>
            ) : (
              otherParticipant.subtitle || ""
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollViewportRef} onScroll={handleScroll} className="h-full overflow-y-auto overscroll-contain">
          <div className="px-3 sm:px-4 py-3 sm:py-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Inicie a conversa</p>
                <p className="text-sm">Envie a primeira mensagem para {otherParticipant.name.split(" ")[0]}.</p>
              </div>
            ) : (
              groups.map((g) => (
                <div key={format(g.date, "yyyy-MM-dd")} className="space-y-1.5">
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/60 rounded-full px-2.5 py-0.5">
                      {g.day}
                    </span>
                  </div>
                  {g.items.map(({ msg, showAvatar, showName, isMe, tail }) => (
                    <div key={msg.id} className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && (
                        <div className="w-7 shrink-0">
                          {showAvatar ? (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={otherParticipant.photo_url || undefined} />
                              <AvatarFallback className={cn(
                                "text-[10px]",
                                (otherParticipant.is_organizer || otherParticipant.is_support) && "bg-primary/15 text-primary"
                              )}>
                                {RoleIcon ? <RoleIcon className="h-3.5 w-3.5" /> : getInitials(otherParticipant.name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[78%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 leading-snug shadow-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                        msg._failed && "ring-1 ring-destructive"
                      )}>
                        {showName && (
                          <p className="text-[10px] font-semibold opacity-70 mb-0.5">{otherParticipant.name}</p>
                        )}
                        <p className="text-[14px] whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-1 mt-0.5 text-[10px] tabular-nums",
                          isMe ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                        )}>
                          <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                          {isMe && tail && (
                            msg._pending ? (
                              <Circle className="h-2.5 w-2.5 animate-pulse" />
                            ) : msg._failed ? (
                              <span className="text-destructive">! falhou</span>
                            ) : msg.read_at ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            {/* Typing bubble */}
            {otherTyping && (
              <div className="flex items-end gap-2 justify-start mt-2">
                <div className="w-7 shrink-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={otherParticipant.photo_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {RoleIcon ? <RoleIcon className="h-3.5 w-3.5" /> : getInitials(otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2.5">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomAnchorRef} />
          </div>
        </ScrollArea>

        {showJumpToBottom && (
          <button
            onClick={() => { scrollToBottom("smooth"); setShowJumpToBottom(false); }}
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
            aria-label="Ir para o final"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="px-2.5 sm:px-3 py-2 border-t bg-card/60 backdrop-blur shrink-0"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-muted/60 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 transition">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => onChangeMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Mensagem para ${otherParticipant.name.split(" ")[0]}…`}
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[15px] sm:text-sm leading-relaxed placeholder:text-muted-foreground/70 max-h-[140px]"
              disabled={sending}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="rounded-full shrink-0 h-10 w-10 transition-transform active:scale-95"
            disabled={!newMessage.trim() || sending}
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
