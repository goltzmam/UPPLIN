import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/ui/loading";
import { MultiMediaUpload } from "@/components/events/MultiMediaUpload";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  sort_order: number;
}

interface TicketTypeForm {
  id?: string;
  name: string;
  price_cents: number;
  quantity_total: number;
  isNew?: boolean;
  toDelete?: boolean;
}

export default function EventoForm() {
  const { eventId } = useParams<{ eventId: string }>();
  const isEditing = eventId && eventId !== "novo";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [venueName, setVenueName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([]);
  const [saving, setSaving] = useState(false);

  // Get organizer
  const { data: organizer, isLoading: orgLoading } = useQuery({
    queryKey: ["organizer-account", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizer_accounts")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get event if editing
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event-edit", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types(*), event_media(*)`)
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!isEditing && !!organizer,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!orgLoading && !organizer) {
      navigate("/organizador");
    }
  }, [orgLoading, organizer, navigate]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartAt(event.start_at?.slice(0, 16) || "");
      setEndAt(event.end_at?.slice(0, 16) || "");
      setVenueName(event.venue_name || "");
      setAddressText(event.address_text || "");
      setStatus(event.status as "draft" | "published");
      setTicketTypes(
        event.ticket_types?.map((t: any) => ({
          id: t.id,
          name: t.name,
          price_cents: t.price_cents,
          quantity_total: t.quantity_total,
        })) || []
      );
      setMedia(
        event.event_media?.map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type,
          sort_order: m.sort_order,
        })) || []
      );
    }
  }, [event]);

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: "", price_cents: 0, quantity_total: 100, isNew: true }]);
  };

  const updateTicketType = (index: number, field: keyof TicketTypeForm, value: any) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const removeTicketType = (index: number) => {
    const updated = [...ticketTypes];
    if (updated[index].id) {
      updated[index].toDelete = true;
    } else {
      updated.splice(index, 1);
    }
    setTicketTypes(updated);
  };

  const handleSave = async () => {
    if (!title.trim() || !startAt) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let eventIdToUse = eventId;
      
      // Get cover image from first media item
      const coverImageUrl = media.length > 0 && media[0].type === "image" ? media[0].url : null;

      if (isEditing) {
        // Update event
        const { error } = await supabase
          .from("events")
          .update({
            title,
            description,
            start_at: startAt,
            end_at: endAt || null,
            venue_name: venueName || null,
            address_text: addressText || null,
            cover_image_url: coverImageUrl,
            status,
          })
          .eq("id", eventId);

        if (error) throw error;
      } else {
        // Create event
        const { data, error } = await supabase
          .from("events")
          .insert({
            organizer_id: organizer!.id,
            title,
            description,
            start_at: startAt,
            end_at: endAt || null,
            venue_name: venueName || null,
            address_text: addressText || null,
            cover_image_url: coverImageUrl,
            status,
          })
          .select()
          .single();

        if (error) throw error;
        eventIdToUse = data.id;
      }

      // Handle ticket types
      for (const tt of ticketTypes) {
        if (tt.toDelete && tt.id) {
          await supabase.from("ticket_types").delete().eq("id", tt.id);
        } else if (tt.isNew && !tt.toDelete) {
          await supabase.from("ticket_types").insert({
            event_id: eventIdToUse,
            name: tt.name,
            price_cents: tt.price_cents,
            quantity_total: tt.quantity_total,
          });
        } else if (tt.id && !tt.toDelete) {
          await supabase
            .from("ticket_types")
            .update({
              name: tt.name,
              price_cents: tt.price_cents,
              quantity_total: tt.quantity_total,
            })
            .eq("id", tt.id);
        }
      }

      // Handle media - delete removed, add new
      if (isEditing) {
        // Get existing media IDs
        const existingIds = event?.event_media?.map((m: any) => m.id) || [];
        const currentIds = media.filter(m => !m.id.startsWith("new-")).map(m => m.id);
        
        // Delete removed media
        const toDelete = existingIds.filter((id: string) => !currentIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from("event_media").delete().in("id", toDelete);
        }
      }

      // Insert new media
      const newMedia = media.filter(m => m.id.startsWith("new-"));
      if (newMedia.length > 0) {
        await supabase.from("event_media").insert(
          newMedia.map((m, idx) => ({
            event_id: eventIdToUse,
            url: m.url,
            type: m.type,
            sort_order: media.indexOf(m),
          }))
        );
      }

      // Update sort order for existing media
      const existingMedia = media.filter(m => !m.id.startsWith("new-"));
      for (const m of existingMedia) {
        await supabase
          .from("event_media")
          .update({ sort_order: media.indexOf(m) })
          .eq("id", m.id);
      }

      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      toast({ title: isEditing ? "Evento atualizado!" : "Evento criado!" });
      navigate("/organizador");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || orgLoading || (isEditing && eventLoading)) {
    return <><Header /><PageLoading /><Footer /></>;
  }

  const activeTicketTypes = ticketTypes.filter((t) => !t.toDelete);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 pt-24">
        <div className="container max-w-3xl px-4">
          {/* Back */}
          <Button variant="ghost" className="mb-4" onClick={() => navigate("/organizador")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
            {isEditing ? "Editar Evento" : "Novo Evento"}
          </h1>

          <div className="space-y-6 sm:space-y-8">
            {/* Media Upload */}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Fotos e Vídeos</h2>
              <p className="text-sm text-muted-foreground">
                Adicione imagens e vídeos do seu evento. A primeira imagem será usada como capa.
              </p>
              <MultiMediaUpload
                eventId={eventId || "novo"}
                organizerId={organizer?.id || ""}
                media={media}
                onChange={setMedia}
              />
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Informações Básicas</h2>

              <div className="space-y-2">
                <Label htmlFor="title">Título do Evento *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Festival de Verão 2026" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva seu evento..." rows={4} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Data e Hora de Início *</Label>
                  <Input id="startAt" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endAt">Data e Hora de Término</Label>
                  <Input id="endAt" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">Local</h2>

              <div className="space-y-2">
                <Label htmlFor="venueName">Nome do Local</Label>
                <Input id="venueName" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Ex: Arena Show" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressText">Endereço</Label>
                <Input id="addressText" value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder="Rua, número, cidade..." />
              </div>
            </div>

            {/* Ticket Types */}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Tipos de Ingresso</h2>
                <Button variant="outline" size="sm" onClick={addTicketType}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {activeTicketTypes.length > 0 ? (
                <div className="space-y-4">
                  {ticketTypes.map((tt, index) => {
                    if (tt.toDelete) return null;
                    return (
                      <div key={tt.id || index} className="p-3 sm:p-4 border border-border rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Ingresso {index + 1}</Label>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTicketType(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome</Label>
                            <Input value={tt.name} onChange={(e) => updateTicketType(index, "name", e.target.value)} placeholder="VIP, Pista..." />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Preço (R$)</Label>
                            <Input type="number" value={tt.price_cents / 100} onChange={(e) => updateTicketType(index, "price_cents", parseFloat(e.target.value) * 100 || 0)} placeholder="0.00" step="0.01" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Quantidade</Label>
                            <Input type="number" value={tt.quantity_total} onChange={(e) => updateTicketType(index, "quantity_total", parseInt(e.target.value) || 0)} placeholder="100" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Adicione pelo menos um tipo de ingresso.</p>
              )}
            </div>

            {/* Status & Actions */}
            <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label>Status do Evento</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? "Salvando..." : "Salvar Evento"}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={() => navigate(`/evento/${eventId}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Página
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
