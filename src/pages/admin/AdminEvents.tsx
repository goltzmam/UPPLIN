import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Star,
  StarOff,
  Calendar,
  Pause,
  Play,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";

interface EventWithOrganizer {
  id: string;
  title: string;
  slug: string | null;
  status: string | null;
  category: string | null;
  start_at: string;
  cover_image_url: string | null;
  is_featured: boolean | null;
  is_sponsored: boolean | null;
  created_at: string | null;
  organizer_accounts: {
    display_name: string;
    slug: string | null;
  } | null;
}

const MAX_FEATURED = 6;

export default function AdminEvents() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("published");
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; event: EventWithOrganizer | null }>({
    open: false,
    event: null,
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; event: EventWithOrganizer | null }>({
    open: false,
    event: null,
  });
  const [cancelReason, setCancelReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events-full", search, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, organizer_accounts(display_name, slug)")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as EventWithOrganizer[];
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["event-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("category")
        .not("category", "is", null);
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.category))].filter(Boolean);
      return unique as string[];
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      updates,
      reason,
      actionType,
    }: {
      eventId: string;
      updates: Record<string, any>;
      reason?: string;
      actionType?: string;
    }) => {
      const { error } = await supabase.from("events").update(updates).eq("id", eventId);
      if (error) throw error;

      await supabase.from("admin_action_logs").insert({
        admin_user_id: currentUser!.id,
        action_type: actionType || "event_updated",
        target_type: "event",
        target_id: eventId,
        reason,
        metadata: updates,
      });
    },
    onSuccess: (_, { updates, actionType }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-events-full"] });
      if (actionType === "event_cancelled") {
        toast.success("Evento cancelado com sucesso");
        setCancelDialog({ open: false, event: null });
        setCancelReason("");
      } else if (actionType === "event_approved") {
        toast.success("Evento aprovado e publicado!");
      } else if (actionType === "event_rejected") {
        toast.success("Evento rejeitado");
        setRejectDialog({ open: false, event: null });
        setRejectReason("");
      } else if (actionType === "event_paused") {
        toast.success("Evento pausado");
      } else if (actionType === "event_unpaused") {
        toast.success("Evento reativado");
      } else if (updates.is_featured !== undefined) {
        toast.success(updates.is_featured ? "Evento destacado" : "Destaque removido");
      } else {
        toast.success("Evento atualizado");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar evento");
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "published":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Publicado</Badge>;
      case "draft":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Rascunho</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30"><Pause className="h-3 w-3 mr-1" />Pausado</Badge>;
      case "pending_review":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
      default:
        return <Badge variant="secondary">{status || "draft"}</Badge>;
    }
  };

  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === "published").length,
    pending: events.filter((e) => e.status === "pending_review").length,
    paused: events.filter((e) => e.status === "paused").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
    featured: events.filter((e) => e.is_featured).length,
  };

  const featuredCount = stats.featured;

  // Filter events by active tab
  const filteredEvents = events.filter((e) => {
    switch (activeTab) {
      case "published":
        return e.status === "published";
      case "pending":
        return e.status === "pending_review";
      case "paused":
        return e.status === "paused";
      case "all":
      default:
        return true;
    }
  });

  const handleApprove = (event: EventWithOrganizer) => {
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { status: "published" },
      actionType: "event_approved",
    });
  };

  const handlePause = (event: EventWithOrganizer) => {
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { status: "paused" },
      actionType: "event_paused",
    });
  };

  const handleUnpause = (event: EventWithOrganizer) => {
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { status: "published" },
      actionType: "event_unpaused",
    });
  };

  const handleFeature = (event: EventWithOrganizer) => {
    if (!event.is_featured && featuredCount >= MAX_FEATURED) {
      toast.error(`Limite de ${MAX_FEATURED} eventos destacados atingido. Remova um destaque antes.`);
      return;
    }
    updateEventMutation.mutate({
      eventId: event.id,
      updates: { is_featured: !event.is_featured },
    });
  };

  const renderEventRow = (event: EventWithOrganizer) => (
    <TableRow key={event.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{event.title}</p>
            {event.is_featured && (
              <Badge variant="outline" className="text-xs mt-1">
                <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                Destacado
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {event.organizer_accounts?.display_name || "-"}
      </TableCell>
      <TableCell className="text-sm">
        {format(new Date(event.start_at), "dd/MM/yy HH:mm", { locale: ptBR })}
      </TableCell>
      <TableCell>
        {event.category && <Badge variant="secondary">{event.category}</Badge>}
      </TableCell>
      <TableCell>{getStatusBadge(event.status)}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/evento/${event.slug || event.id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver evento
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Approve (only for pending_review) */}
            {event.status === "pending_review" && (
              <>
                <DropdownMenuItem onClick={() => handleApprove(event)} className="text-emerald-400">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Aprovar e publicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRejectDialog({ open: true, event })}
                  className="text-destructive"
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Rejeitar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Pause / Unpause */}
            {event.status === "published" && (
              <DropdownMenuItem onClick={() => handlePause(event)}>
                <Pause className="h-4 w-4 mr-2" />
                Pausar evento
              </DropdownMenuItem>
            )}
            {event.status === "paused" && (
              <DropdownMenuItem onClick={() => handleUnpause(event)}>
                <Play className="h-4 w-4 mr-2" />
                Reativar evento
              </DropdownMenuItem>
            )}

            {/* Feature toggle */}
            {(event.status === "published") && (
              <DropdownMenuItem onClick={() => handleFeature(event)}>
                {event.is_featured ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    Remover destaque
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Destacar evento ({featuredCount}/{MAX_FEATURED})
                  </>
                )}
              </DropdownMenuItem>
            )}

            {/* Cancel */}
            {event.status !== "cancelled" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelDialog({ open: true, event })}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancelar evento
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciamento de Eventos</h1>
        <p className="text-muted-foreground">Modere, valide e gerencie eventos da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-success">{stats.published}</p>
            <p className="text-sm text-muted-foreground">Publicados</p>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? "border-blue-500/50 bg-blue-500/5" : ""}>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{stats.paused}</p>
            <p className="text-sm text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-destructive">{stats.cancelled}</p>
            <p className="text-sm text-muted-foreground">Cancelados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{stats.featured}</p>
            <p className="text-sm text-muted-foreground">Destacados ({MAX_FEATURED} máx)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4 pt-4">
              <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-0">
                <TabsTrigger
                  value="published"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publicados ({stats.published})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Aguardando Validação
                  {stats.pending > 0 && (
                    <Badge className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0">{stats.pending}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="paused"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausados ({stats.paused})
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-muted-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                >
                  Todos ({stats.total})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shared table content for all tabs */}
            <div className="overflow-x-auto px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Organizador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {activeTab === "pending"
                          ? "Nenhum evento aguardando validação 🎉"
                          : "Nenhum evento encontrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map(renderEventRow)
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cancel Event Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) => !open && setCancelDialog({ open: false, event: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Evento</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O evento será marcado como cancelado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Evento</p>
              <p className="font-medium">{cancelDialog.event?.title}</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo do cancelamento</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, event: null })}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!cancelReason.trim()) {
                  toast.error("Informe o motivo do cancelamento");
                  return;
                }
                updateEventMutation.mutate({
                  eventId: cancelDialog.event!.id,
                  updates: { status: "cancelled" },
                  reason: cancelReason,
                  actionType: "event_cancelled",
                });
              }}
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Cancelando..." : "Cancelar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Event Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => !open && setRejectDialog({ open: false, event: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Evento</DialogTitle>
            <DialogDescription>
              O evento voltará para rascunho e o organizador será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Evento</p>
              <p className="font-medium">{rejectDialog.event?.title}</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo da rejeição</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Conteúdo inadequado, informações incompletas..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, event: null })}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error("Informe o motivo da rejeição");
                  return;
                }
                updateEventMutation.mutate({
                  eventId: rejectDialog.event!.id,
                  updates: { status: "draft" },
                  reason: rejectReason,
                  actionType: "event_rejected",
                });
              }}
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Rejeitando..." : "Rejeitar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
