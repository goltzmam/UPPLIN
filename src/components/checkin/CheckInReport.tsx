import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, BarChart3, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface CheckInReportProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
}

export function CheckInReport({ eventId, eventTitle, organizerId }: CheckInReportProps) {
  const { data: tickets = [] } = useQuery({
    queryKey: ["checkin-report-tickets", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, status, used_at, checked_in_by, ticket_types(name), profiles:buyer_user_id(full_name, email)")
        .eq("event_id", eventId)
        .eq("status", "used")
        .order("used_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["checkin-report-collabs", organizerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_collaborators")
        .select("id, user_id, display_name")
        .eq("organizer_id", organizerId);
      if (error) throw error;
      return data || [];
    },
  });
  // Chart data: check-ins per hour
  const hourlyData = useMemo(() => {
    const hours: Record<string, number> = {};
    tickets.forEach((t: any) => {
      if (!t.used_at) return;
      const hour = format(new Date(t.used_at), "HH:00");
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return Object.entries(hours)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [tickets]);

  // Stats per collaborator
  const collabData = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach((t: any) => {
      const key = t.checked_in_by || "organizer";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([userId, count]) => {
      const collab = collaborators.find((c) => c.user_id === userId);
      return { name: collab?.display_name || "Organizador", count };
    }).sort((a, b) => b.count - a.count);
  }, [tickets, collaborators]);

  const exportCSV = () => {
    const header = "Nome,Email,Tipo Ingresso,Horário Check-in,Validado por\n";
    const rows = tickets.map((t: any) => {
      const collabName = collaborators.find((c) => c.user_id === t.checked_in_by)?.display_name || "Organizador";
      return [
        `"${t.profiles?.full_name || ""}"`,
        `"${t.profiles?.email || ""}"`,
        `"${t.ticket_types?.name || ""}"`,
        t.used_at ? format(new Date(t.used_at), "dd/MM/yyyy HH:mm:ss") : "",
        `"${collabName}"`,
      ].join(",");
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin-${eventTitle.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (tickets.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatório de Check-ins
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Timeline chart */}
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Check-ins por horário
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 13, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  labelFormatter={(v) => `Horário: ${v}`}
                  formatter={(v: number) => [`${v} check-ins`, ""]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per collaborator */}
        {collabData.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Por colaborador</p>
            <div className="space-y-2">
              {collabData.map((c, i) => {
                const max = collabData[0].count;
                const pct = max > 0 ? (c.count / max) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="text-muted-foreground text-xs">{c.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
