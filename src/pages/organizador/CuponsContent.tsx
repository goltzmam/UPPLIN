import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Percent, DollarSign, Loader2, Tag, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageLoading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CuponsContent() {
  const { organizer } = useOutletContext<{ organizer: any }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [validUntil, setValidUntil] = useState("");

  // Get events for dropdown
  const { data: events } = useQuery({
    queryKey: ["organizer-events", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  // Get coupons
  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ["organizer-coupons", organizer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, events(title)")
        .eq("organizer_id", organizer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizer,
  });

  const resetForm = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setUsageLimit("");
    setSelectedEventId("");
    setValidUntil("");
  };

  const handleCreate = async () => {
    if (!code.trim() || !discountValue) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("coupons").insert({
        organizer_id: organizer!.id,
        event_id: selectedEventId || null,
        code: code.toUpperCase(),
        discount_type: discountType,
        discount_value: discountType === "percent" 
          ? parseInt(discountValue) 
          : parseInt(discountValue) * 100,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        valid_until: validUntil || null,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["organizer-coupons"] });
      toast({ title: "Cupom criado!" });
      setShowCreate(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !isActive })
        .eq("id", couponId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["organizer-coupons"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", couponId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["organizer-coupons"] });
      toast({ title: "Cupom excluído" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground">Gerencie cupons promocionais</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Cupom</DialogTitle>
              <DialogDescription>
                Crie um cupom de desconto para seus eventos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código do Cupom *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: PROMO10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor *</Label>
                  <Input
                    id="value"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percent" ? "10" : "20"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Evento (opcional)</Label>
                <Select value={selectedEventId || "all"} onValueChange={(v) => setSelectedEventId(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limit">Limite de Uso</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Ilimitado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Válido até</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Cupom"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coupons List */}
      <div className="bg-card rounded-2xl border border-border">
        {couponsLoading ? (
          <PageLoading />
        ) : coupons && coupons.length > 0 ? (
          <div className="divide-y divide-border">
            {coupons.map((coupon: any) => (
              <div key={coupon.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-lg font-bold bg-muted px-2 py-0.5 rounded">{coupon.code}</code>
                    <Badge variant={coupon.is_active ? "default" : "secondary"}>
                      {coupon.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {coupon.discount_type === "percent" ? (
                        <><Percent className="h-3 w-3" /> {coupon.discount_value}%</>
                      ) : (
                        <><DollarSign className="h-3 w-3" /> R$ {(coupon.discount_value / 100).toFixed(2)}</>
                      )}
                    </span>
                    <span>
                      Usado: {coupon.usage_count}/{coupon.usage_limit || "∞"}
                    </span>
                    {coupon.events?.title && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {coupon.events.title}
                      </span>
                    )}
                    {coupon.valid_until && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Até {format(new Date(coupon.valid_until), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={() => toggleActive(coupon.id, coupon.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteCoupon(coupon.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Tag className="h-8 w-8 text-accent" />}
            title="Nenhum cupom"
            description="Crie cupons de desconto para seus eventos."
            variant="default"
            className="py-12"
          />
        )}
      </div>
    </div>
  );
}
