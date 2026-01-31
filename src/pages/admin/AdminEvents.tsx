import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Eye,
  ExternalLink,
  Trash2,
  Star,
  StarOff,
  Calendar,
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

export default function AdminEvents() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; event: EventWithOrganizer | null }>({
    open: false,
    event: null,
  });
  const [cancelReason, setCancelReason] = useState("");

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events-full", search, statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, organizer_accounts(display_name, slug)")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "published" | "cancelled");
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
    }: {
      eventId: string;
      updates: Record<string, any>;
      reason?: string;
    }) => {
      const { error } = await supabase.from("events").update(updates).eq("id", eventId);
      if (error) throw error;

      // Log the action
      await supabase.from("admin_action_logs").insert({
        admin_user_id: currentUser!.id,
        action_type: updates.status === "cancelled" ? "event_cancelled" : "event_updated",
        target_type: "event",
        target_id: eventId,
        reason,
        metadata: updates,
      });
    },
    onSuccess: (_, { updates }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-events-full"] });
      if (updates.status === "cancelled") {
        toast.success("Evento cancelado com sucesso");
        setCancelDialog({ open: false, event: null });
        setCancelReason("");
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
      default:
        return <Badge variant="secondary">{status || "draft"}</Badge>;
    }
  };

  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === "published").length,
    draft: events.filter((e) => e.status === "draft" || !e.status).length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
    featured: events.filter((e) => e.is_featured).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciamento de Eventos</h1>
        <p className="text-muted-foreground">Modere e gerencie eventos da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.draft}</p>
            <p className="text-sm text-muted-foreground">Rascunhos</p>
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
            <p className="text-sm text-muted-foreground">Destacados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="overflow-x-auto">
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
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum evento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded bg-muted overflow-hidden flex-shrink-0">
                            {event.cover_image_url ? (
                              <img
                                src={event.cover_image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
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
                            {event.is_featured ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateEventMutation.mutate({
                                    eventId: event.id,
                                    updates: { is_featured: false },
                                  })
                                }
                              >
                                <StarOff className="h-4 w-4 mr-2" />
                                Remover destaque
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateEventMutation.mutate({
                                    eventId: event.id,
                                    updates: { is_featured: true },
                                  })
                                }
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Destacar evento
                              </DropdownMenuItem>
                            )}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, event: null })}
            >
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
                });
              }}
              disabled={updateEventMutation.isPending}
            >
              {updateEventMutation.isPending ? "Cancelando..." : "Cancelar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
