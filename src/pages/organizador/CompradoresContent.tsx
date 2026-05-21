import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, MessageCircle, Ticket, Calendar, Users, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

interface Lead {
  buyer_user_id: string;
  full_name: string | null;
  email: string | null;
  photo_url: string | null;
  event_id: string;
  event_title: string;
  event_start_at: string;
  tickets_count: number;
  total_cents: number;
  orders_count: number;
  last_order_at: string;
}

const formatPrice = (cents: number) =>
  `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export default function CompradoresContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["organizer-leads", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_organizer_leads", {
        p_organizer_id: organizer!.id,
      });
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!organizer,
    refetchInterval: 20000,
  });

  // Realtime refresh when new orders/tickets land
  useEffect(() => {
    if (!organizer?.id) return;
    const ch = supabase
      .channel(`org-leads-${organizer.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["organizer-leads", organizer.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [organizer?.id, queryClient]);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    (leads || []).forEach((l) => map.set(l.event_id, l.event_title));
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [leads]);

  const filtered = useMemo(() => {
    let list = leads || [];
    if (eventFilter !== "all") list = list.filter((l) => l.event_id === eventFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.event_title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, eventFilter, search]);

  const uniqueBuyers = useMemo(() => {
    const s = new Set<string>();
    (leads || []).forEach((l) => s.add(l.buyer_user_id));
    return s.size;
  }, [leads]);

  const totalRevenue = useMemo(
    () => (leads || []).reduce((a, l) => a + Number(l.total_cents || 0), 0),
    [leads]
  );

  const totalTickets = useMemo(
    () => (leads || []).reduce((a, l) => a + Number(l.tickets_count || 0), 0),
    [leads]
  );

  const handleOpenChat = async (lead: Lead) => {
    try {
      setOpeningChat(`${lead.event_id}-${lead.buyer_user_id}`);
      const { data, error } = await supabase.rpc("open_organizer_conversation_with_user", {
        p_event_id: lead.event_id,
        p_user_id: lead.buyer_user_id,
      });
      if (error) throw error;
      const convId = (data as any)?.conversation_id;
      if (convId) {
        navigate(`/mensagens?c=${convId}`);
      }
    } catch (e: any) {
      toast.error("Não foi possível abrir o chat", {
        description: e?.message || "Tente novamente.",
      });
    } finally {
      setOpeningChat(null);
    }
  };

  const handleEmail = (lead: Lead) => {
    if (!lead.email) {
      toast.error("E-mail indisponível para este comprador");
      return;
    }
    const subject = encodeURIComponent(`Sobre ${lead.event_title}`);
    window.location.href = `mailto:${lead.email}?subject=${subject}`;
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Compradores</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus leads e converse com quem comprou ingressos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueBuyers}</p>
              <p className="text-xs text-muted-foreground">Compradores únicos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTickets}</p>
              <p className="text-xs text-muted-foreground">Ingressos vendidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Receita acumulada</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou evento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="md:w-[260px]">
              <SelectValue placeholder="Todos os eventos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Leads ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Nenhum comprador encontrado"
              description="Quando houver vendas pagas dos seus eventos, os compradores aparecem aqui."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((lead) => {
                const key = `${lead.event_id}-${lead.buyer_user_id}`;
                const isOpening = openingChat === key;
                return (
                  <div
                    key={key}
                    className="flex flex-col md:flex-row md:items-center gap-3 p-3 md:p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={lead.photo_url || undefined} />
                        <AvatarFallback>
                          {(lead.full_name || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          {lead.full_name || "Participante"}
                        </p>
                        {lead.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {lead.event_title} •{" "}
                          {format(new Date(lead.event_start_at), "d MMM yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <Ticket className="h-3 w-3" />
                        {lead.tickets_count}{" "}
                        {lead.tickets_count === 1 ? "ingresso" : "ingressos"}
                      </Badge>
                      <Badge variant="outline">{formatPrice(Number(lead.total_cents))}</Badge>
                    </div>

                    <div className="flex items-center gap-2 md:ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEmail(lead)}
                        disabled={!lead.email}
                      >
                        <Mail className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">E-mail</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenChat(lead)}
                        disabled={isOpening}
                        style={{
                          background:
                            "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                        }}
                        className="text-white"
                      >
                        {isOpening ? (
                          <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                        ) : (
                          <MessageCircle className="h-4 w-4 md:mr-2" />
                        )}
                        <span className="hidden md:inline">Conversar</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
