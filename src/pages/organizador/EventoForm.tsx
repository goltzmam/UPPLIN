import { useParams, useNavigate, Link, useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/ui/loading";
import { MultiMediaUpload } from "@/components/events/MultiMediaUpload";
import { LocationPicker } from "@/components/events/LocationPicker";
import { VideoUpload } from "@/components/events/VideoUpload";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocode";

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
  const { organizer } = useOutletContext<{ organizer: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [venueName, setVenueName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [feedVideoUrl, setFeedVideoUrl] = useState<string | null>(null);
  const [checkoutBannerUrl, setCheckoutBannerUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "pending_review">("draft");
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([]);
  const [saving, setSaving] = useState(false);

  const categories = [
    { value: "shows", label: "Shows" },
    { value: "festas", label: "Festas" },
    { value: "teatro", label: "Teatro" },
    { value: "esportes", label: "Esportes" },
    { value: "cursos", label: "Cursos" },
    { value: "gastronomia", label: "Gastronomia" },
    { value: "workshops", label: "Workshops" },
    { value: "conferencias", label: "Conferências" },
    { value: "outros", label: "Outros" },
  ];

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
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setCategory(event.category || "");
      setStartAt(event.start_at?.slice(0, 16) || "");
      setEndAt(event.end_at?.slice(0, 16) || "");
      setVenueName(event.venue_name || "");
      setAddressText(event.address_text || "");
      setLat(event.lat ? Number(event.lat) : null);
      setLng(event.lng ? Number(event.lng) : null);
      setCheckoutBannerUrl(event.checkout_banner_url || null);
      setStatus(event.status === "published" || event.status === "pending_review" ? "pending_review" : "draft");
      setTicketTypes(
        event.ticket_types?.map((t: any) => ({
          id: t.id,
          name: t.name,
          price_cents: t.price_cents,
          quantity_total: t.quantity_total,
        })) || []
      );
      setMedia(
        event.event_media?.filter((m: any) => m.type === "image").map((m: any) => ({
          id: m.id,
          url: m.url,
          type: m.type,
          sort_order: m.sort_order,
        })) || []
      );
      // Get feed video (first video in event_media)
      const feedVideo = event.event_media?.find((m: any) => m.type === "video");
      setFeedVideoUrl(feedVideo?.url || null);
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
    // Validate required fields
    if (!title.trim() || !startAt) {
      toast({ title: "Preencha os campos obrigatórios", description: "Título e data de início são obrigatórios.", variant: "destructive" });
      return;
    }

    // Validate cover media is required (image or video)
    if (media.length === 0 && !feedVideoUrl) {
      toast({ 
        title: "Mídia de destaque obrigatória", 
        description: "Adicione pelo menos uma imagem ou vídeo para o seu evento.", 
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);

    try {
      let eventIdToUse = eventId;
      
      // Get cover image: prefer first image, leave null if only video exists
      const coverImageUrl = media.length > 0 && media[0].type === "image" 
        ? media[0].url 
        : null;

      if (isEditing) {
        // Update event
        const { error } = await supabase
          .from("events")
          .update({
            title,
            description,
            category: category || null,
            start_at: startAt,
            end_at: endAt || null,
            venue_name: venueName || null,
            address_text: addressText || null,
            lat: lat,
            lng: lng,
            cover_image_url: coverImageUrl,
            checkout_banner_url: checkoutBannerUrl,
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
            category: category || null,
            start_at: startAt,
            end_at: endAt || null,
            venue_name: venueName || null,
            address_text: addressText || null,
            lat: lat,
            lng: lng,
            cover_image_url: coverImageUrl,
            checkout_banner_url: checkoutBannerUrl,
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

      // Insert new image media
      const newMedia = media.filter(m => m.id.startsWith("new-"));
      if (newMedia.length > 0) {
        await supabase.from("event_media").insert(
          newMedia.map((m, idx) => ({
            event_id: eventIdToUse,
            url: m.url,
            type: "image" as const,
            sort_order: media.indexOf(m),
          }))
        );
      }

      // Handle feed video
      const existingVideo = event?.event_media?.find((m: any) => m.type === "video");
      
      if (feedVideoUrl && !existingVideo) {
        // Add new video
        await supabase.from("event_media").insert({
          event_id: eventIdToUse,
          url: feedVideoUrl,
          type: "video",
          sort_order: -1, // Videos come first
        });
      } else if (feedVideoUrl && existingVideo && existingVideo.url !== feedVideoUrl) {
        // Update existing video
        await supabase.from("event_media").update({ url: feedVideoUrl }).eq("id", existingVideo.id);
      } else if (!feedVideoUrl && existingVideo) {
        // Remove video
        await supabase.from("event_media").delete().eq("id", existingVideo.id);
      }
      const existingMedia = media.filter(m => !m.id.startsWith("new-"));
      for (const m of existingMedia) {
        await supabase
          .from("event_media")
          .update({ sort_order: media.indexOf(m) })
          .eq("id", m.id);
      }

      queryClient.invalidateQueries({ queryKey: ["organizer-events"] });
      toast({ title: isEditing ? "Evento atualizado!" : "Evento criado!" });
      navigate("/organizador/painel/eventos");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && eventLoading) {
    return <PageLoading />;
  }

  const activeTicketTypes = ticketTypes.filter((t) => !t.toDelete);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/organizador/painel/eventos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          {isEditing ? "Editar Evento" : "Novo Evento"}
        </h1>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Feed Video Upload - NEW */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Vídeo do Feed</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Vídeo curto (até 60s) que aparecerá no feed estilo TikTok
              </p>
            </div>
            {feedVideoUrl && (
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                Ativo
              </span>
            )}
          </div>
          <VideoUpload
            eventId={eventId || "novo"}
            organizerId={organizer?.id || ""}
            videoUrl={feedVideoUrl}
            onChange={setFeedVideoUrl}
          />
        </div>

        {/* Media Upload - REQUIRED */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">
                Imagem de Destaque *
              </h2>
              <p className="text-sm text-muted-foreground">
                Obrigatório. A primeira imagem será usada como capa do evento.
              </p>
            </div>
            {media.length > 0 && (
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                {media.length} {media.length === 1 ? "mídia" : "mídias"}
              </span>
            )}
          </div>
          <MultiMediaUpload
            eventId={eventId || "novo"}
            organizerId={organizer?.id || ""}
            media={media}
            onChange={setMedia}
          />
          {media.length === 0 && !feedVideoUrl && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Adicione pelo menos uma imagem ou vídeo para publicar o evento
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold">Banner do Checkout</h2>
            <p className="text-sm text-muted-foreground">
              Opcional. Essa imagem aparece só no checkout e não precisa ser a mesma do feed ou da capa do evento.
            </p>
          </div>
          <ImageUpload
            bucket="event-images"
            folder={eventId === "novo" ? organizer?.id || "" : `${organizer?.id || ""}/${eventId}`}
            value={checkoutBannerUrl}
            onChange={setCheckoutBannerUrl}
            aspectRatio="banner"
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

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label>Localização no Mapa</Label>
            <p className="text-xs text-muted-foreground">
              Defina a localização para que seu evento apareça no mapa "Por Perto".
            </p>
            <LocationPicker
              lat={lat}
              lng={lng}
              onLocationChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
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
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "pending_review")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_review">Enviar para aprovação</SelectItem>
              </SelectContent>
            </Select>
            {status === "pending_review" && (
              <p className="text-xs text-muted-foreground">
                O evento será revisado pela equipe antes de ser publicado.
              </p>
            )}
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
  );
}
